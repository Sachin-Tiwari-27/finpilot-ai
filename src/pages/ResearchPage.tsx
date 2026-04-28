import { useState } from "react";
import { motion } from "framer-motion";
import {
  Card,
  Button,
  Input,
  SectionHeader,
  DataSourceTag,
  ChangeChip,
} from "@/components/Common/UI";
import { formatINR, formatINRCompact, getDataSourceLabel } from "@/utils";
import { getEntryExitAnalysis } from "@/services/openRouter";
import toast from "react-hot-toast";

export default function ResearchPage() {
  const [symbol, setSymbol] = useState("");
  const [assetType, setAssetType] = useState("stock");
  const [priceData, setPriceData] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [investAmount, setInvestAmount] = useState("10000");
  const [watchlist, setWatchlist] = useState<string[]>([]);

  async function fetchPrice() {
    if (!symbol) return toast.error("Enter a symbol");
    setLoading(true);
    setPriceData(null);
    setAnalysis(null);
    try {
      let data;
      if (assetType === "crypto") {
        data = await window.api.prices.getCryptoPrice(symbol.toUpperCase());
      } else {
        data = await window.api.prices.getStockPrice(symbol.toUpperCase());
      }
      if (!data)
        return toast.error("Price not found. Check the symbol and try again.");
      setPriceData(data);
      // Auto-trigger AI
      await runAIAnalysis(data.price, symbol.toUpperCase());
    } catch (e: any) {
      toast.error("Fetch failed: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function runAIAnalysis(price: number, sym: string) {
    setAiLoading(true);
    try {
      const result = await getEntryExitAnalysis(
        sym,
        price,
        undefined,
        assetType,
      );
      setAnalysis(result);
    } catch (e: any) {
      toast.error("AI analysis failed: " + e.message);
    } finally {
      setAiLoading(false);
    }
  }

  const investAmt = parseFloat(investAmount) || 0;
  const shares = priceData ? (investAmt / priceData.price).toFixed(4) : 0;
  const targetPrice = analysis?.target
    ? parseFloat(analysis.target.replace(/[₹,]/g, ""))
    : null;
  const targetReturn =
    priceData && targetPrice
      ? ((targetPrice - priceData.price) / priceData.price) * 100
      : null;
  const targetValue = targetReturn
    ? investAmt * (1 + targetReturn / 100)
    : null;

  return (
    <div className="h-full overflow-y-auto p-5">
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-fp-text">
            Investment Research
          </h1>
          <p className="text-xs text-fp-text-3 mt-0.5">
            AI-powered entry & exit analysis
          </p>
        </div>

        {/* Search */}
        <Card>
          <div className="flex gap-3 items-end">
            <div className="flex gap-2 flex-shrink-0">
              {["stock", "mutual_fund", "crypto"].map((t) => (
                <button
                  key={t}
                  onClick={() => setAssetType(t)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${assetType === t ? "bg-fp-primary/15 text-fp-primary border border-fp-primary/30" : "bg-fp-card text-fp-text-3 border border-fp-border"}`}
                >
                  {t === "stock"
                    ? "📈 Stock"
                    : t === "mutual_fund"
                      ? "🏦 MF"
                      : "₿ Crypto"}
                </button>
              ))}
            </div>
            <Input
              value={symbol}
              onChange={(v) => setSymbol(v.toUpperCase())}
              placeholder={
                assetType === "crypto"
                  ? "BTC, ETH, SOL..."
                  : assetType === "mutual_fund"
                    ? "Scheme code or name..."
                    : "TCS, INFY, RELIANCE..."
              }
              className="flex-1"
              label="Symbol / Ticker"
            />
            <Button
              onClick={fetchPrice}
              loading={loading}
              size="md"
              className="flex-shrink-0"
            >
              Analyze
            </Button>
          </div>

          {/* Common symbols */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="text-[10px] text-fp-text-3 mr-1">Quick:</span>
            {(assetType === "crypto"
              ? ["BTC", "ETH", "SOL", "BNB"]
              : ["TCS", "INFY", "HDFC", "RELIANCE", "ITC", "WIPRO"]
            ).map((s) => (
              <button
                key={s}
                onClick={() => {
                  setSymbol(s);
                }}
                className="px-2 py-0.5 rounded-lg text-[10px] bg-fp-card text-fp-text-3 hover:text-fp-primary hover:bg-fp-primary/10 transition-all border border-fp-border/40"
              >
                {s}
              </button>
            ))}
          </div>
        </Card>

        {priceData && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Price Card */}
            <Card>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-2xl font-bold text-fp-text">
                      {priceData.symbol}
                    </h2>
                    <ChangeChip value={priceData.changePercent || 0} />
                    <DataSourceTag
                      source={priceData.source}
                      updatedAt={priceData.timestamp}
                    />
                  </div>
                  <div className="text-3xl font-bold text-fp-primary">
                    {formatINR(priceData.price)}
                  </div>
                  {priceData.previousClose && (
                    <div className="text-xs text-fp-text-3 mt-1">
                      Prev close: {formatINR(priceData.previousClose)}
                      {" · "}
                      Change:{" "}
                      <span
                        style={{
                          color:
                            priceData.changePercent >= 0
                              ? "#10D9A0"
                              : "#FF4D6B",
                        }}
                      >
                        {priceData.changePercent >= 0 ? "+" : ""}
                        {(priceData.changePercent || 0).toFixed(2)}%
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      setWatchlist((w) =>
                        w.includes(priceData.symbol)
                          ? w.filter((s) => s !== priceData.symbol)
                          : [...w, priceData.symbol],
                      )
                    }
                  >
                    {watchlist.includes(priceData.symbol)
                      ? "★ Watching"
                      : "☆ Watchlist"}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      // Navigate to portfolio add
                      toast.success(
                        "Go to Portfolio → Add Holding to add this asset",
                      );
                    }}
                  >
                    + Add to Portfolio
                  </Button>
                </div>
              </div>

              {/* Trust layer note */}
              <div className="mt-3 p-2 rounded-lg bg-fp-warning/5 border border-fp-warning/20 text-[10px] text-fp-text-3">
                ⚠ Price data may be delayed by up to 15 minutes (free API tier).
                Always verify with your broker before executing trades. Source:{" "}
                <strong>{priceData.source}</strong>
              </div>
            </Card>

            {/* AI Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <SectionHeader
                  title="AI Analysis"
                  subtitle="Powered by OpenRouter"
                  icon="🤖"
                  action={
                    <Button
                      size="sm"
                      variant="ghost"
                      loading={aiLoading}
                      onClick={() =>
                        runAIAnalysis(priceData.price, priceData.symbol)
                      }
                    >
                      Refresh
                    </Button>
                  }
                />
                {aiLoading ? (
                  <div className="space-y-2">
                    <div className="h-4 w-full shimmer rounded" />
                    <div className="h-4 w-3/4 shimmer rounded" />
                    <div className="h-4 w-5/6 shimmer rounded" />
                  </div>
                ) : analysis ? (
                  <div className="space-y-3">
                    {/* Recommendation badge */}
                    <div
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-semibold ${
                        analysis.recommendation
                          ?.toLowerCase()
                          .includes("buy") ||
                        analysis.recommendation
                          ?.toLowerCase()
                          .includes("add") ||
                        analysis.recommendation?.toLowerCase().includes("entry")
                          ? "bg-fp-primary/15 text-fp-primary border border-fp-primary/30"
                          : analysis.recommendation
                                ?.toLowerCase()
                                .includes("sell") ||
                              analysis.recommendation
                                ?.toLowerCase()
                                .includes("exit")
                            ? "bg-red-500/15 text-red-400 border border-red-500/30"
                            : "bg-fp-warning/15 text-fp-warning border border-fp-warning/30"
                      }`}
                    >
                      {analysis.recommendation}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded-lg bg-fp-card">
                        <div className="text-fp-text-3 mb-0.5">Entry Range</div>
                        <div className="font-semibold text-fp-primary">
                          {analysis.entryRange}
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-fp-card">
                        <div className="text-fp-text-3 mb-0.5">
                          Target Price
                        </div>
                        <div className="font-semibold text-fp-primary">
                          {analysis.target}
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-fp-card">
                        <div className="text-fp-text-3 mb-0.5">Stop Loss</div>
                        <div className="font-semibold text-red-400">
                          {analysis.stopLoss}
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-fp-card">
                        <div className="text-fp-text-3 mb-0.5">Horizon</div>
                        <div className="font-semibold text-fp-text">
                          12 months
                        </div>
                      </div>
                    </div>

                    <div className="p-2 rounded-lg bg-fp-card border border-fp-border text-xs text-fp-text-2 leading-relaxed">
                      {analysis.rationale}
                    </div>

                    <div className="text-[9px] text-fp-text-3 border-t border-fp-border pt-2">
                      ⚠ AI analysis is for informational purposes only. Not
                      financial advice. Always do your own research and consult
                      a SEBI-registered advisor.
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-fp-text-3 text-center py-4">
                    Click "Refresh" to generate AI analysis
                  </div>
                )}
              </Card>

              {/* What-If Simulator */}
              <Card>
                <SectionHeader
                  title="What-If Simulator"
                  subtitle="Investment calculator"
                  icon="🧮"
                />
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-fp-text-2 mb-1 block">
                      If I invest:
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-fp-text-3 text-sm">
                          ₹
                        </span>
                        <input
                          type="number"
                          value={investAmount}
                          onChange={(e) => setInvestAmount(e.target.value)}
                          className="w-full bg-fp-card border border-fp-border rounded-xl pl-7 pr-3 py-2 text-sm text-fp-text focus:outline-none focus:border-fp-primary/50"
                        />
                      </div>
                    </div>
                    <input
                      type="range"
                      min={1000}
                      max={1000000}
                      step={1000}
                      value={investAmount}
                      onChange={(e) => setInvestAmount(e.target.value)}
                      className="w-full mt-2 accent-fp-primary"
                    />
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {[5000, 10000, 25000, 50000, 100000].map((p) => (
                        <button
                          key={p}
                          onClick={() => setInvestAmount(String(p))}
                          className="px-2 py-0.5 rounded text-[10px] bg-fp-card text-fp-text-3 hover:text-fp-text border border-fp-border/40 transition-all"
                        >
                          {formatINRCompact(p)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Results */}
                  <div className="space-y-2">
                    <div className="p-2.5 rounded-xl bg-fp-card border border-fp-border">
                      <div className="text-[10px] text-fp-text-3 mb-1">
                        At current price ({formatINR(priceData.price)})
                      </div>
                      <div className="text-sm font-bold text-fp-text">
                        You get {shares} units
                      </div>
                      <div className="text-xs text-fp-text-3">
                        Cost basis: {formatINR(investAmt)}
                      </div>
                    </div>

                    {targetReturn !== null && (
                      <div
                        className={`p-2.5 rounded-xl border ${targetReturn > 0 ? "bg-fp-primary/5 border-fp-primary/20" : "bg-red-500/5 border-red-500/20"}`}
                      >
                        <div className="text-[10px] text-fp-text-3 mb-1">
                          At AI target ({analysis.target})
                        </div>
                        <div
                          className={`text-sm font-bold ${targetReturn > 0 ? "text-fp-primary" : "text-red-400"}`}
                        >
                          {formatINR(targetValue!)} (
                          {targetReturn > 0 ? "+" : ""}
                          {targetReturn.toFixed(1)}%)
                        </div>
                        <div
                          className={`text-xs ${targetReturn > 0 ? "text-fp-primary/70" : "text-red-400/70"}`}
                        >
                          Gain: {targetReturn > 0 ? "+" : ""}
                          {formatINR(targetValue! - investAmt)}
                        </div>
                      </div>
                    )}

                    {analysis?.stopLoss && (
                      <div className="p-2.5 rounded-xl bg-red-500/5 border border-red-500/20">
                        <div className="text-[10px] text-fp-text-3 mb-1">
                          At stop loss ({analysis.stopLoss})
                        </div>
                        <div className="text-sm font-bold text-red-400">
                          {(() => {
                            const sl = parseFloat(
                              analysis.stopLoss.replace(/[₹,]/g, ""),
                            );
                            if (!sl) return "N/A";
                            const slReturn =
                              ((sl - priceData.price) / priceData.price) * 100;
                            return `${formatINR(investAmt * (1 + slReturn / 100))} (${slReturn.toFixed(1)}%)`;
                          })()}
                        </div>
                        <div className="text-[10px] text-red-400/70">
                          Maximum loss if stop triggered
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="text-[9px] text-fp-text-3 leading-relaxed">
                    All projections are estimates based on AI analysis. Past
                    performance does not guarantee future results.
                  </div>
                </div>
              </Card>
            </div>
          </motion.div>
        )}

        {/* Watchlist */}
        {watchlist.length > 0 && (
          <Card>
            <SectionHeader
              title="Watchlist"
              subtitle={`${watchlist.length} symbols`}
            />
            <div className="flex flex-wrap gap-2">
              {watchlist.map((sym) => (
                <div
                  key={sym}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-fp-card border border-fp-border"
                >
                  <span className="text-sm font-semibold text-fp-text">
                    {sym}
                  </span>
                  <button
                    onClick={() => setSymbol(sym)}
                    className="text-xs text-fp-primary hover:underline"
                  >
                    Analyze
                  </button>
                  <button
                    onClick={() =>
                      setWatchlist((w) => w.filter((s) => s !== sym))
                    }
                    className="text-fp-text-3 hover:text-red-400 text-xs"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Info Box */}
        {!priceData && (
          <Card className="border border-dashed border-fp-border/40 bg-transparent">
            <div className="text-center py-8">
              <div className="text-4xl mb-3">🔍</div>
              <h3 className="text-base font-semibold text-fp-text mb-2">
                Research any stock, MF, or crypto
              </h3>
              <p className="text-xs text-fp-text-3 mb-4 max-w-sm mx-auto">
                Get real-time prices, AI-powered entry/exit analysis, and a
                what-if investment simulator
              </p>
              <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto text-xs">
                {[
                  {
                    icon: "📈",
                    title: "Live Prices",
                    desc: "Stocks, MF, Crypto",
                  },
                  {
                    icon: "🤖",
                    title: "AI Analysis",
                    desc: "Entry, target, stop-loss",
                  },
                  { icon: "🧮", title: "Simulator", desc: "What-if returns" },
                ].map((f) => (
                  <div
                    key={f.title}
                    className="p-3 rounded-xl bg-fp-card border border-fp-border/40"
                  >
                    <div className="text-2xl mb-1">{f.icon}</div>
                    <div className="font-medium text-fp-text">{f.title}</div>
                    <div className="text-fp-text-3">{f.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
