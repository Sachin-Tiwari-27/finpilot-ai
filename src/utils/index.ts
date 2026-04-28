import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  subMonths,
} from "date-fns";

// ─── Currency Formatting ─────────────────────────────────────────
export function formatINR(amount: number, compact = false): string {
  if (compact) {
    if (Math.abs(amount) >= 10000000)
      return `₹${(amount / 10000000).toFixed(2)}Cr`;
    if (Math.abs(amount) >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
    if (Math.abs(amount) >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatINRCompact(amount: number): string {
  return formatINR(amount, true);
}

export function formatPercent(value: number, decimals = 1): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
}

// ─── Date Helpers ────────────────────────────────────────────────
export function formatDate(dateStr: string, fmt = "dd MMM yyyy"): string {
  try {
    return format(parseISO(dateStr), fmt);
  } catch {
    return dateStr;
  }
}

export function getCurrentMonth(): string {
  return format(new Date(), "yyyy-MM");
}

export function getMonthRange(monthStr?: string): {
  startDate: string;
  endDate: string;
} {
  const date = monthStr ? parseISO(`${monthStr}-01`) : new Date();
  return {
    startDate: format(startOfMonth(date), "yyyy-MM-dd"),
    endDate: format(endOfMonth(date), "yyyy-MM-dd"),
  };
}

export function getLast12Months(): { startDate: string; endDate: string } {
  return {
    startDate: format(subMonths(new Date(), 11), "yyyy-MM-01"),
    endDate: format(endOfMonth(new Date()), "yyyy-MM-dd"),
  };
}

export function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  return format(monday, "yyyy-MM-dd");
}

// ─── Financial Calculations ──────────────────────────────────────
export function calculateXIRR(
  cashFlows: { amount: number; date: Date }[],
): number {
  // Simple approximation of XIRR
  if (cashFlows.length < 2) return 0;
  const totalInvested = cashFlows
    .filter((cf) => cf.amount < 0)
    .reduce((s, cf) => s + Math.abs(cf.amount), 0);
  const finalValue = cashFlows[cashFlows.length - 1].amount;
  if (totalInvested === 0) return 0;
  const years =
    (cashFlows[cashFlows.length - 1].date.getTime() -
      cashFlows[0].date.getTime()) /
    (365.25 * 24 * 60 * 60 * 1000);
  if (years === 0) return 0;
  return (Math.pow(finalValue / totalInvested, 1 / years) - 1) * 100;
}

export function calculateCAGR(
  initialValue: number,
  finalValue: number,
  years: number,
): number {
  if (initialValue <= 0 || years <= 0) return 0;
  return (Math.pow(finalValue / initialValue, 1 / years) - 1) * 100;
}

export function calculateProjection(
  currentAmount: number,
  monthlyContribution: number,
  annualReturn: number,
  years: number,
): number {
  const monthlyRate = annualReturn / 100 / 12;
  const months = years * 12;
  // Future value of current amount
  const fvCurrent = currentAmount * Math.pow(1 + monthlyRate, months);
  // Future value of monthly contributions (annuity)
  const fvContributions =
    monthlyContribution *
    ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
  return fvCurrent + fvContributions;
}

export function getHealthGrade(score: number): {
  grade: string;
  color: string;
  label: string;
} {
  if (score >= 80) return { grade: "A", color: "#10D9A0", label: "Excellent" };
  if (score >= 65) return { grade: "B", color: "#3D7FFF", label: "Good" };
  if (score >= 50) return { grade: "C", color: "#FFB84D", label: "Fair" };
  if (score >= 35) return { grade: "D", color: "#FF6B3D", label: "Needs Work" };
  return { grade: "F", color: "#FF4D6B", label: "Critical" };
}

// ─── Portfolio Calculations ──────────────────────────────────────
export function calcPortfolioSummary(
  holdings: any[],
  prices: Record<string, any>,
) {
  let totalValue = 0;
  let totalCostBasis = 0;

  const enriched = holdings.map((h) => {
    const priceData = prices[h.symbol];
    const currentPrice = priceData?.price ?? null;
    const currentValue =
      currentPrice !== null
        ? h.quantity * currentPrice
        : h.quantity * h.buy_price;
    const costBasis = h.quantity * h.buy_price;
    const gainLoss = currentValue - costBasis;
    const gainLossPct = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;

    totalValue += currentValue;
    totalCostBasis += costBasis;

    return {
      ...h,
      current_price: currentPrice,
      current_value: currentValue,
      cost_basis: costBasis,
      gain_loss: gainLoss,
      gain_loss_pct: gainLossPct,
      price_source: priceData?.source ?? "estimated",
      price_updated: priceData?.last_updated ?? null,
      is_price_manual: priceData?.is_manual === 1,
    };
  });

  // Allocation by asset type
  const byType: Record<string, number> = {};
  for (const h of enriched) {
    byType[h.asset_type] = (byType[h.asset_type] || 0) + h.current_value;
  }

  const ASSET_COLORS: Record<string, string> = {
    stock: "#10D9A0",
    mutual_fund: "#3D7FFF",
    crypto: "#FFB84D",
    etf: "#B04DFF",
    fd: "#4DE8FF",
    commodity: "#FF6B3D",
    other: "#8B9DC3",
  };

  const allocation = Object.entries(byType).map(([type, value]) => ({
    name: type.replace("_", " ").toUpperCase(),
    value,
    percentage: totalValue > 0 ? (value / totalValue) * 100 : 0,
    color: ASSET_COLORS[type] || "#8B9DC3",
  }));

  return {
    totalValue,
    totalCostBasis,
    totalGainLoss: totalValue - totalCostBasis,
    totalGainLossPct:
      totalCostBasis > 0
        ? ((totalValue - totalCostBasis) / totalCostBasis) * 100
        : 0,
    allocation,
    holdings: enriched,
  };
}

// ─── Color & Styling Helpers ─────────────────────────────────────
export function getChangeColor(value: number): string {
  if (value > 0) return "#10D9A0";
  if (value < 0) return "#FF4D6B";
  return "#8B9DC3";
}

export function getChangeIcon(value: number): string {
  if (value > 0) return "↑";
  if (value < 0) return "↓";
  return "→";
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

// ─── Data Source Label ────────────────────────────────────────────
export function getDataSourceLabel(source: string): {
  label: string;
  color: string;
  icon: string;
} {
  switch (source) {
    case "Alpha Vantage (15min delay)":
    case "alpha_vantage":
      return {
        label: "Alpha Vantage · 15min delay",
        color: "#FFB84D",
        icon: "🔸",
      };
    case "CoinGecko":
    case "CoinGecko (real-time)":
    case "coingecko":
      return { label: "CoinGecko · Live", color: "#10D9A0", icon: "🟢" };
    case "manual":
    case "cache (API error)":
      return { label: "Manual entry", color: "#8B9DC3", icon: "✏️" };
    case "demo":
      return { label: "Demo data", color: "#B04DFF", icon: "🟣" };
    case "cache":
      return { label: "Cached", color: "#4DE8FF", icon: "📦" };
    default:
      return { label: source || "Unknown", color: "#8B9DC3", icon: "❓" };
  }
}

// ─── Generate IDs ────────────────────────────────────────────────
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

// ─── Milestone Detection ─────────────────────────────────────────
export function detectMilestones(netWorth: number): string | null {
  const milestones = [
    { value: 100000, label: "₹1 Lakh" },
    { value: 500000, label: "₹5 Lakhs" },
    { value: 1000000, label: "₹10 Lakhs" },
    { value: 2500000, label: "₹25 Lakhs" },
    { value: 5000000, label: "₹50 Lakhs" },
    { value: 10000000, label: "₹1 Crore" },
    { value: 50000000, label: "₹5 Crores" },
  ];
  // Return the highest milestone crossed
  for (let i = milestones.length - 1; i >= 0; i--) {
    if (netWorth >= milestones[i].value) return milestones[i].label;
  }
  return null;
}
