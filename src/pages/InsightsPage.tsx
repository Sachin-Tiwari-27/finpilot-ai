import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  Button,
  SectionHeader,
  EmptyState,
} from "@/components/Common/UI";
import { useStore } from "@/store";
import {
  formatINR,
  formatINRCompact,
  getHealthGrade,
  getMonthRange,
} from "@/utils";
import {
  generateMonthlyInsights,
  analyzeSpending,
  analyzePortfolio,
} from "@/services/openRouter";
import toast from "react-hot-toast";

const PRIORITY_COLORS: Record<string, string> = {
  high: "#FF4D6B",
  medium: "#FFB84D",
  low: "#3D7FFF",
};

const CATEGORY_ICONS: Record<string, string> = {
  spending: "💸",
  investing: "📈",
  saving: "🏦",
  tax: "📋",
  general: "💡",
  risk: "⚠️",
};

export default function InsightsPage() {
  const {
    insights,
    setInsights,
    healthScore,
    setHealthScore,
    transactions,
    holdings,
    prices,
  } = useStore();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [spendingAnalysis, setSpendingAnalysis] = useState("");
  const [portfolioAnalysis, setPortfolioAnalysis] = useState("");
  const [analysisLoading, setAnalysisLoading] = useState(false);

  useEffect(() => {
    loadInsights();
  }, []);

  async function loadInsights() {
    setLoading(true);
    try {
      const [active, score] = await Promise.all([
        window.api.insights.getActive(),
        window.api.analytics.getFinancialHealthScore(),
      ]);
      setInsights(active as any);
      setHealthScore(score);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function generateInsights() {
    setGenerating(true);
    try {
      const { startDate, endDate } = getMonthRange();
      const [cats, score] = await Promise.all([
        window.api.transactions.getCategoryBreakdown(
          startDate,
          endDate,
          "expense",
        ),
        window.api.analytics.getFinancialHealthScore(),
      ]);

      const totalPortValue = Object.values(holdings).reduce(
        (s: number, h: any) => {
          const p = (prices as any)[h.symbol];
          return s + (p?.price || h.buy_price) * h.quantity;
        },
        0,
      );

      const { insights: newInsights } = await generateMonthlyInsights(
        score,
        cats as any,
        totalPortValue,
      );

      // Clear old ones and save new
      await window.api.insights.clearAll();
      const expiresAt = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000,
      ).toISOString();
      for (const insight of newInsights) {
        await window.api.insights.save({ ...insight, expires_at: expiresAt });
      }

      toast.success(`Generated ${newInsights.length} new insights!`);
      loadInsights();
    } catch (e: any) {
      toast.error("Generation failed: " + e.message);
    } finally {
      setGenerating(false);
    }
  }

  async function runSpendingAnalysis() {
    setAnalysisLoading(true);
    try {
      const { startDate, endDate } = getMonthRange();
      const txs = await window.api.transactions.getAll({
        startDate,
        endDate,
        type: "expense",
      });
      const result = await analyzeSpending(txs as any, [], "this month");
      setSpendingAnalysis(result);
    } catch (e: any) {
      toast.error("Analysis failed: " + e.message);
    } finally {
      setAnalysisLoading(false);
    }
  }

  async function runPortfolioAnalysis() {
    if (holdings.length === 0) return toast.error("Add holdings first");
    setAnalysisLoading(true);
    try {
      const priceMap: Record<string, number> = {};
      for (const [sym, p] of Object.entries(prices as any)) {
        priceMap[sym] = (p as any).price;
      }
      const totalValue = holdings.reduce(
        (s, h) => s + h.quantity * (priceMap[h.symbol] || h.buy_price),
        0,
      );
      const result = await analyzePortfolio(
        holdings as any,
        priceMap,
        totalValue,
      );
      setPortfolioAnalysis(result);
    } catch (e: any) {
      toast.error("Analysis failed: " + e.message);
    } finally {
      setAnalysisLoading(false);
    }
  }

  async function dismissInsight(id: string) {
    await window.api.insights.dismiss(id);
    setInsights(insights.filter((i) => i.id !== id));
  }

  const {
    grade,
    color: gradeColor,
    label: gradeLabel,
  } = getHealthGrade(healthScore?.score || 0);
  const activeInsights = insights.filter((i) => !i.is_dismissed);

  return (
    <div className="h-full overflow-y-auto p-5">
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-fp-text">AI Insights</h1>
            <p className="text-xs text-fp-text-3 mt-0.5">
              Personalized financial intelligence
            </p>
          </div>
          <Button
            size="sm"
            icon="✨"
            onClick={generateInsights}
            loading={generating}
          >
            Generate Insights
          </Button>
        </div>

        {/* Financial Health Score */}
        {healthScore && (
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
              <div
                className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-5"
                style={{
                  background: `radial-gradient(circle, ${gradeColor}, transparent)`,
                }}
              />
            </div>
            <div className="relative z-10">
              <SectionHeader title="Financial Health Score" icon="❤️" />
              <div className="flex items-center gap-8">
                {/* Score Display */}
                <div className="flex flex-col items-center">
                  <div className="relative w-28 h-28">
                    <svg
                      className="w-full h-full -rotate-90"
                      viewBox="0 0 100 100"
                    >
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="#1E2D4A"
                        strokeWidth="8"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        strokeWidth="8"
                        stroke={gradeColor}
                        strokeLinecap="round"
                        strokeDasharray={`${(healthScore.score / 100) * 251} 251`}
                        style={{ transition: "stroke-dasharray 1s ease-out" }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div
                        className="text-2xl font-black"
                        style={{ color: gradeColor }}
                      >
                        {healthScore.score}
                      </div>
                      <div
                        className="text-3xl font-black"
                        style={{ color: gradeColor }}
                      >
                        {grade}
                      </div>
                    </div>
                  </div>
                  <div
                    className="text-xs font-medium mt-1"
                    style={{ color: gradeColor }}
                  >
                    {gradeLabel}
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    {
                      label: "Monthly Income",
                      value: formatINRCompact(healthScore.income),
                      positive: healthScore.income > 0,
                    },
                    {
                      label: "Monthly Expenses",
                      value: formatINRCompact(healthScore.expenses),
                      positive: healthScore.expenses < healthScore.income,
                    },
                    {
                      label: "Monthly Savings",
                      value: formatINRCompact(healthScore.savings),
                      positive: healthScore.savings > 0,
                    },
                    {
                      label: "Savings Rate",
                      value: `${healthScore.savingsRate.toFixed(1)}%`,
                      positive: healthScore.savingsRate >= 20,
                    },
                    {
                      label: "Expense Ratio",
                      value: `${healthScore.expenseRatio.toFixed(1)}%`,
                      positive: healthScore.expenseRatio <= 80,
                    },
                    {
                      label: "Holdings",
                      value: `${holdings.length} assets`,
                      positive: holdings.length > 0,
                    },
                  ].map((metric) => (
                    <div
                      key={metric.label}
                      className="p-2.5 rounded-xl bg-fp-card border border-fp-border/40"
                    >
                      <div className="text-[10px] text-fp-text-3 mb-0.5">
                        {metric.label}
                      </div>
                      <div
                        className={`text-sm font-bold ${metric.positive ? "text-fp-primary" : "text-red-400"}`}
                      >
                        {metric.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Score Interpretation */}
              <div
                className="mt-4 p-3 rounded-xl border"
                style={{
                  backgroundColor: `${gradeColor}08`,
                  borderColor: `${gradeColor}25`,
                }}
              >
                <div
                  className="text-xs font-medium mb-1"
                  style={{ color: gradeColor }}
                >
                  {healthScore.score >= 80
                    ? "🌟 Excellent financial health! Keep it up."
                    : healthScore.score >= 65
                      ? "✅ Good financial health. Some areas for improvement."
                      : healthScore.score >= 50
                        ? "📊 Fair. Focus on increasing savings rate."
                        : healthScore.score >= 35
                          ? "⚠️ Needs attention. Reduce expenses significantly."
                          : "🚨 Critical. Immediate action needed on finances."}
                </div>
                <div className="text-xs text-fp-text-3">
                  Score based on savings rate (
                  {healthScore.savingsRate.toFixed(0)}%), expense ratio (
                  {healthScore.expenseRatio.toFixed(0)}%), and portfolio
                  diversity. Aim for 25%+ savings rate and under 75% expense
                  ratio.
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* AI Insights Cards */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <SectionHeader
              title="Personalized Insights"
              subtitle={`${activeInsights.length} active`}
              icon="💡"
            />
            {activeInsights.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  await window.api.insights.clearAll();
                  setInsights([]);
                }}
              >
                Clear All
              </Button>
            )}
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="glass-card p-4 h-24 shimmer" />
              ))}
            </div>
          ) : activeInsights.length > 0 ? (
            <div className="space-y-3">
              <AnimatePresence>
                {activeInsights.map((insight, i) => (
                  <motion.div
                    key={insight.id}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 16 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card className="group hover-card">
                      <div className="flex items-start gap-3">
                        {/* Priority indicator */}
                        <div
                          className="w-1 h-full rounded-full flex-shrink-0 self-stretch min-h-12"
                          style={{
                            backgroundColor:
                              PRIORITY_COLORS[insight.priority] || "#3D7FFF",
                          }}
                        />

                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                          style={{
                            backgroundColor: `${PRIORITY_COLORS[insight.priority] || "#3D7FFF"}15`,
                          }}
                        >
                          {CATEGORY_ICONS[insight.category] || "💡"}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-sm font-semibold text-fp-text">
                              {insight.title}
                            </h3>
                            <span
                              className="text-[9px] px-1.5 py-0.5 rounded-full font-medium uppercase tracking-wide"
                              style={{
                                backgroundColor: `${PRIORITY_COLORS[insight.priority]}15`,
                                color: PRIORITY_COLORS[insight.priority],
                              }}
                            >
                              {insight.priority}
                            </span>
                          </div>
                          <p className="text-xs text-fp-text-2 leading-relaxed">
                            {insight.content}
                          </p>
                          {insight.action_label && (
                            <button className="mt-2 text-xs font-medium text-fp-primary hover:underline">
                              → {insight.action_label}
                            </button>
                          )}
                        </div>

                        <button
                          onClick={() => dismissInsight(insight.id)}
                          className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded flex items-center justify-center text-fp-text-3 hover:text-fp-text hover:bg-fp-muted transition-all text-xs flex-shrink-0"
                        >
                          ✕
                        </button>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <Card>
              <EmptyState
                icon="✨"
                title="No insights yet"
                description="Generate personalized AI insights based on your transactions and portfolio"
                action={
                  <Button
                    onClick={generateInsights}
                    loading={generating}
                    icon="✨"
                  >
                    Generate Insights
                  </Button>
                }
              />
            </Card>
          )}
        </div>

        {/* Deep Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Spending Analysis */}
          <Card>
            <SectionHeader
              title="Spending Analysis"
              subtitle="AI review of this month"
              icon="💸"
              action={
                <Button
                  size="sm"
                  variant="ghost"
                  loading={analysisLoading}
                  onClick={runSpendingAnalysis}
                >
                  Analyze
                </Button>
              }
            />
            {spendingAnalysis ? (
              <div className="text-xs text-fp-text-2 leading-relaxed whitespace-pre-wrap">
                {spendingAnalysis}
              </div>
            ) : (
              <EmptyState
                icon="📊"
                title="Click Analyze"
                description="AI will review your spending patterns for this month"
              />
            )}
          </Card>

          {/* Portfolio Analysis */}
          <Card>
            <SectionHeader
              title="Portfolio Analysis"
              subtitle="AI review of investments"
              icon="📈"
              action={
                <Button
                  size="sm"
                  variant="ghost"
                  loading={analysisLoading}
                  onClick={runPortfolioAnalysis}
                >
                  Analyze
                </Button>
              }
            />
            {portfolioAnalysis ? (
              <div className="text-xs text-fp-text-2 leading-relaxed whitespace-pre-wrap">
                {portfolioAnalysis}
              </div>
            ) : (
              <EmptyState
                icon="📈"
                title="Click Analyze"
                description="AI will review your portfolio composition and risks"
              />
            )}
          </Card>
        </div>

        {/* AI Configuration Notice */}
        <Card className="border border-dashed border-fp-border/40 bg-transparent">
          <div className="flex items-start gap-3">
            <div className="text-2xl">🤖</div>
            <div>
              <div className="text-sm font-semibold text-fp-text mb-1">
                AI Configuration
              </div>
              <div className="text-xs text-fp-text-3 leading-relaxed">
                AI insights use{" "}
                <strong className="text-fp-primary">OpenRouter</strong> with
                free models (DeepSeek Chat, LLaMA). Configure your API key in{" "}
                <strong className="text-fp-text">Settings → API Keys</strong>{" "}
                for personalized analysis. Without a key, you'll see demo
                responses.
              </div>
              <div className="flex gap-2 mt-2">
                <a
                  href="https://openrouter.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-fp-primary hover:underline"
                >
                  Get free API key →
                </a>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
