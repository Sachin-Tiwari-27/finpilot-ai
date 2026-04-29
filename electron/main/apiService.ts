import axios from "axios";
import { dbPriceCache } from "./db";

const ALPHA_VANTAGE_KEY = process.env.VITE_ALPHA_VANTAGE_API_KEY || "";
const COINGECKO_BASE = "https://api.coingecko.com/api/v3";
const ALPHA_VANTAGE_BASE = "https://www.alphavantage.co/query";
const FINNHUB_KEY = process.env.VITE_FINNHUB_API_KEY || "";
const NEWS_API_KEY = process.env.VITE_NEWS_API_KEY || "";

// Crypto symbol to CoinGecko ID map
const CRYPTO_MAP: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  BNB: "binancecoin",
  SOL: "solana",
  ADA: "cardano",
  AVAX: "avalanche-2",
  DOT: "polkadot",
  MATIC: "matic-network",
  LINK: "chainlink",
  ATOM: "cosmos",
  LTC: "litecoin",
  XRP: "ripple",
  DOGE: "dogecoin",
  SHIB: "shiba-inu",
  USDT: "tether",
  USDC: "usd-coin",
};

// ─── Stock Price (Alpha Vantage) ────────────────────────────────
export async function fetchStockPrice(symbol: string): Promise<{
  symbol: string;
  price: number;
  changePercent: number;
  previousClose: number;
  source: string;
  timestamp: string;
} | null> {
  try {
    // Check if we have a valid cache
    const cached = dbPriceCache.get(symbol) as any;
    if (cached && !dbPriceCache.isStale(symbol, 15) && !cached.is_manual) {
      return {
        symbol,
        price: cached.price,
        changePercent: cached.change_percent,
        previousClose: cached.previous_close,
        source: "cache",
        timestamp: cached.last_updated,
      };
    }

    if (!ALPHA_VANTAGE_KEY || ALPHA_VANTAGE_KEY === "your-alpha-vantage-key") {
      // Return mock data if no key (for testing)
      const mockPrice = cached?.price || Math.random() * 1000 + 100;
      return {
        symbol,
        price: mockPrice,
        changePercent: (Math.random() - 0.5) * 4,
        previousClose: mockPrice * 0.99,
        source: "demo",
        timestamp: new Date().toISOString(),
      };
    }

    const response = await axios.get(ALPHA_VANTAGE_BASE, {
      params: {
        function: "GLOBAL_QUOTE",
        symbol: symbol.endsWith(".NS") ? symbol : `${symbol}.NS`, // Add NSE suffix for Indian stocks
        apikey: ALPHA_VANTAGE_KEY,
      },
      timeout: 8000,
    });

    const quote = response.data["Global Quote"];
    if (!quote || !quote["05. price"]) {
      // Try without suffix
      const response2 = await axios.get(ALPHA_VANTAGE_BASE, {
        params: { function: "GLOBAL_QUOTE", symbol, apikey: ALPHA_VANTAGE_KEY },
        timeout: 8000,
      });
      const quote2 = response2.data["Global Quote"];
      if (!quote2 || !quote2["05. price"]) return null;

      const price = parseFloat(quote2["05. price"]);
      const changePercent = parseFloat(
        quote2["10. change percent"]?.replace("%", "") || "0",
      );
      const previousClose = parseFloat(quote2["08. previous close"] || "0");

      dbPriceCache.upsert({
        symbol,
        price,
        change_percent: changePercent,
        previous_close: previousClose,
        source: "alpha_vantage",
        market_cap: null,
        volume: parseInt(quote2["06. volume"] || "0"),
      });

      return {
        symbol,
        price,
        changePercent,
        previousClose,
        source: "Alpha Vantage (15min delay)",
        timestamp: new Date().toISOString(),
      };
    }

    const price = parseFloat(quote["05. price"]);
    const changePercent = parseFloat(
      quote["10. change percent"]?.replace("%", "") || "0",
    );
    const previousClose = parseFloat(quote["08. previous close"] || "0");
    const volume = parseInt(quote["06. volume"] || "0");

    dbPriceCache.upsert({
      symbol,
      price,
      change_percent: changePercent,
      previous_close: previousClose,
      source: "alpha_vantage",
      market_cap: null,
      volume,
    });

    return {
      symbol,
      price,
      changePercent,
      previousClose,
      source: "Alpha Vantage (15min delay)",
      timestamp: new Date().toISOString(),
    };
  } catch (err: any) {
    console.error(`Price fetch error for ${symbol}:`, err.message);
    const cached = dbPriceCache.get(symbol) as any;
    if (cached) {
      return {
        symbol,
        price: cached.price,
        changePercent: cached.change_percent,
        previousClose: cached.previous_close,
        source: "cached (API error)",
        timestamp: cached.last_updated,
      };
    }
    return null;
  }
}

// ─── Crypto Price (CoinGecko) ───────────────────────────────────
export async function fetchCryptoPrice(symbol: string): Promise<{
  symbol: string;
  price: number;
  changePercent: number;
  marketCap: number;
  volume: number;
  source: string;
} | null> {
  try {
    const coinId = CRYPTO_MAP[symbol.toUpperCase()] || symbol.toLowerCase();
    const response = await axios.get(`${COINGECKO_BASE}/simple/price`, {
      params: {
        ids: coinId,
        vs_currencies: "inr",
        include_market_cap: true,
        include_24hr_vol: true,
        include_24hr_change: true,
      },
      timeout: 8000,
    });

    const data = response.data[coinId];
    if (!data) return null;

    const result = {
      symbol,
      price: data.inr,
      changePercent: data.inr_24h_change,
      marketCap: data.inr_market_cap,
      volume: data.inr_24h_vol,
      source: "CoinGecko (real-time)",
    };

    dbPriceCache.upsert({
      symbol,
      price: result.price,
      change_percent: result.changePercent,
      previous_close: result.price / (1 + result.changePercent / 100),
      market_cap: result.marketCap,
      volume: result.volume,
      source: "coingecko",
    });

    return result;
  } catch (err: any) {
    console.error(`Crypto price error for ${symbol}:`, err.message);
    const cached = dbPriceCache.get(symbol) as any;
    if (cached)
      return {
        symbol,
        price: cached.price,
        changePercent: cached.change_percent,
        marketCap: cached.market_cap,
        volume: cached.volume,
        source: "cached",
      };
    return null;
  }
}

// ─── Multiple Prices at Once ─────────────────────────────────────
export async function fetchMultiplePrices(
  holdings: { symbol: string; asset_type: string }[],
) {
  const results: Record<string, any> = {};

  const cryptoHoldings = holdings.filter((h) => h.asset_type === "crypto");
  const stockHoldings = holdings.filter((h) => h.asset_type !== "crypto");

  // Fetch crypto in bulk
  if (cryptoHoldings.length > 0) {
    try {
      const coinIds = cryptoHoldings.map(
        (h) => CRYPTO_MAP[h.symbol.toUpperCase()] || h.symbol.toLowerCase(),
      );
      const response = await axios.get(`${COINGECKO_BASE}/simple/price`, {
        params: {
          ids: coinIds.join(","),
          vs_currencies: "inr",
          include_24hr_change: true,
        },
        timeout: 10000,
      });
      for (const holding of cryptoHoldings) {
        const coinId =
          CRYPTO_MAP[holding.symbol.toUpperCase()] ||
          holding.symbol.toLowerCase();
        const data = response.data[coinId];
        if (data) {
          results[holding.symbol] = {
            price: data.inr,
            changePercent: data.inr_24h_change,
            source: "CoinGecko",
          };
          dbPriceCache.upsert({
            symbol: holding.symbol,
            price: data.inr,
            change_percent: data.inr_24h_change,
            previous_close: data.inr / (1 + data.inr_24h_change / 100),
            source: "coingecko",
            market_cap: null,
            volume: null,
          });
        }
      }
    } catch (e) {
      console.error("Bulk crypto fetch error:", e);
    }
  }

  // Fetch stocks one by one (Alpha Vantage free tier limitation)
  for (const holding of stockHoldings) {
    const result = await fetchStockPrice(holding.symbol);
    if (result) results[holding.symbol] = result;
    await sleep(500); // Rate limit protection
  }

  return results;
}

// ─── Financial News ─────────────────────────────────────────────
export async function fetchFinancialNews(query?: string): Promise<any[]> {
  try {
    if (!NEWS_API_KEY || NEWS_API_KEY === "your-newsapi-key") {
      return getMockNews();
    }

    const response = await axios.get("https://newsapi.org/v2/everything", {
      params: {
        q: query || "stock market India NSE Sensex Nifty",
        language: "en",
        sortBy: "publishedAt",
        pageSize: 10,
        apiKey: NEWS_API_KEY,
      },
      timeout: 8000,
    });

    return (
      response.data.articles?.map((article: any) => ({
        id: article.url,
        title: article.title,
        summary: article.description,
        source: article.source.name,
        url: article.url,
        publishedAt: article.publishedAt,
        imageUrl: article.urlToImage,
        sentiment: "neutral", // Could use AI to analyze
      })) || []
    );
  } catch (err) {
    console.error("News fetch error:", err);
    return getMockNews();
  }
}

// ─── Indian MF NAV (mfapi.in) ───────────────────────────────────
export async function fetchMFPrice(
  schemeCode: string,
): Promise<{ nav: number; date: string } | null> {
  try {
    const response = await axios.get(`https://api.mfapi.in/mf/${schemeCode}`, {
      timeout: 8000,
    });
    const data = response.data?.data?.[0];
    if (!data) return null;
    return { nav: parseFloat(data.nav), date: data.date };
  } catch {
    return null;
  }
}

// ─── Market Overview ─────────────────────────────────────────────
export async function fetchMarketOverview(): Promise<any> {
  try {
    // Nifty 50 index
    const nifty = await fetchStockPrice("^NSEI");
    const sensex = await fetchStockPrice("^BSESN");

    return {
      nifty50: nifty,
      sensex: sensex,
      lastUpdated: new Date().toISOString(),
      source: "Alpha Vantage (15min delay)",
    };
  } catch {
    return null;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getMockNews() {
  return [
    {
      id: "1",
      title: "Nifty 50 rallies to new highs on strong FII inflows",
      summary:
        "Foreign institutional investors pumped ₹8,500 crore into Indian equities.",
      source: "Economic Times",
      url: "#",
      publishedAt: new Date().toISOString(),
      sentiment: "positive",
    },
    {
      id: "2",
      title: "RBI holds interest rates steady, signals cautious approach",
      summary: "The Reserve Bank of India maintained the repo rate at 6.5%.",
      source: "Business Standard",
      url: "#",
      publishedAt: new Date(Date.now() - 3600000).toISOString(),
      sentiment: "neutral",
    },
    {
      id: "3",
      title: "Indian IT sector outlook remains positive amid global demand",
      summary: "Major IT firms like TCS, Infosys report stable deal pipelines.",
      source: "Mint",
      url: "#",
      publishedAt: new Date(Date.now() - 7200000).toISOString(),
      sentiment: "positive",
    },
  ];
}
