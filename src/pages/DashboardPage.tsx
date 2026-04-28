import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  Card,
  Skeleton,
  SectionHeader,
  ChangeChip,
  DataSourceTag,
  Button,
  EmptyState,
} from "@/components/Common/UI";
import { useStore } from "@/store";
import {
  formatINR,
  formatINRCompact,
  formatDate,
  getMonthRange,
  getLast12Months,
  getHealthGrade,
  calcPortfolioSummary,
} from "@/utils";
import { generateWeeklyStory } from "@/services/openRouter";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const STAGGER = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const {
    transactions,
    setTransactions,
    holdings,
    setHoldings,
    prices,
    setPrices,
    healthScore,
    setHealthScore,
    weeklyStory,
    setWeeklyStory,
    news,
    setNews,
    goals,
    setGoals,
  } = useStore();

  const [loading, setLoading] = useState(true);
  const [monthlySummary, setMonthlySummary] = useState<any>(null);
  const [monthlyTrend, setMonthlyTrend] = useState<any[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<any[]>([]);
  const [portfolio, setPortfolio] = useState<any>(null);
  const [generatingStory, setGeneratingStory] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    const api = window.api;
    const { startDate, endDate } = getMonthRange();
    const { startDate: yr12Start } = getLast12Months();

    try {
      const [
        txs,
        hlds,
        summary,
        trend,
        cats,
        pricesAll,
        score,
        allGoals,
        latestStory,
        latestNews,
      ] = await Promise.all([
        api.transactions.getAll({ startDate, endDate, limit: 5 }),
        api.holdings.getAll(),
        api.transactions.getSummary(startDate, endDate),
        api.transactions.getMonthlyTrend(12),
        api.transactions.getCategoryBreakdown(startDate, endDate, "expense"),
        api.prices.getAll(),
        api.analytics.getFinancialHealthScore(),
        api.goals.getAll(),
        api.weeklyStory.getLatest(),
        api.news.fetch(),
      ]);

      setTransactions(txs as any);
      setHoldings(hlds as any);
      setMonthlySummary(summary);
      setMonthlyTrend(
        (trend as any[]).map((m) => ({
          ...m,
          savings: (m.income || 0) - (m.expense || 0),
          label: m.month ? m.month.slice(5) : "",
        })),
      );
      setCategoryBreakdown((cats as any[]).slice(0, 5));
      setHealthScore(score);
      setGoals(allGoals as any);
      setNews(latestNews as any);

      // Enrich prices
      const priceMap: Record<string, any> = {};
      for (const p of pricesAll as any[]) {
        priceMap[p.symbol] = p;
      }
      setPrices(priceMap);

      if (hlds.length > 0) {
        const portfolioCalc = calcPortfolioSummary(hlds as any, priceMap);
        setPortfolio(portfolioCalc);
      }

      // Weekly story
      if (latestStory) {
        setWeeklyStory(latestStory as any);
      }
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function generateStory() {
    setGeneratingStory(true);
    try {
      const api = window.api;
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const weekTxs = await api.transactions.getAll({
        startDate: weekAgo.toISOString().split("T")[0],
        endDate: now.toISOString().split("T")[0],
      });
      const income = (weekTxs as any[])
        .filter((t) => t.type === "income")
        .reduce((s: number, t: any) => s + t.amount, 0);
      const expense = (weekTxs as any[])
        .filter((t) => t.type === "expense")
        .reduce((s: number, t: any) => s + t.amount, 0);
      const topTxs = (weekTxs as any[]).slice(0, 3);

      const story = await generateWeeklyStory(
        income,
        expense,
        topTxs,
        expense * 1.1,
      );
      await api.weeklyStory.save({
        week_start: weekAgo.toISOString().split("T")[0],
        ...story,
      });
      setWeeklyStory({
        ...story,
        created_at: new Date().toISOString(),
        id: "",
        week_start: "",
      });
      toast.success("Weekly story generated!");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate story");
    } finally {
      setGeneratingStory(false);
    }
  }

  const income = monthlySummary?.total_income || 0;
  const expense = monthlySummary?.total_expense || 0;
  const savings = income - expense;
  const savingsRate = income > 0 ? (savings / income) * 100 : 0;
  const {
    grade,
    color: gradeColor,
    label: gradeLabel,
  } = getHealthGrade(healthScore?.score || 0);

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="h-full overflow-y-auto p-5">
      <div className="max-w-7xl mx-auto space-y-5">
        {/* Header */}
        <motion.div
          {...STAGGER}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-xl font-bold text-fp-text">Dashboard</h1>
            <p className="text-xs text-fp-text-3 mt-0.5">
              {formatDate(new Date().toISOString(), "EEEE, dd MMMM yyyy")}
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={loadDashboard}
            icon="↻"
          >
            Refresh
          </Button>
        </motion.div>

        {/* TOP METRICS ROW */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Net Worth */}
          <motion.div {...STAGGER} transition={{ delay: 0.05 }}>
            <Card
              className="col-span-1 hover-card"
              onClick={() => navigate("/portfolio")}
            >
              <div className="text-xs text-fp-text-3 mb-2 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-fp-primary status-dot" />
                Net Worth
              </div>
              <div className="text-2xl font-bold text-fp-text number-ticker">
                {formatINRCompact((portfolio?.totalValue || 0) + savings)}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <ChangeChip value={portfolio?.totalGainLossPct || 0} />
                <span className="text-xs text-fp-text-3">all time</span>
              </div>
              {portfolio && (
                <DataSourceTag
                  source={Object.values(prices)[0]?.source || "estimated"}
                />
              )}
            </Card>
          </motion.div>

          {/* Monthly Income */}
          <motion.div {...STAGGER} transition={{ delay: 0.1 }}>
            <Card
              className="hover-card"
              onClick={() => navigate("/transactions")}
            >
              <div className="text-xs text-fp-text-3 mb-2">Monthly Income</div>
              <div className="text-2xl font-bold text-fp-primary">
                {formatINRCompact(income)}
              </div>
              <div className="text-xs text-fp-text-3 mt-1">
                Spent: {formatINRCompact(expense)}{" "}
                <span className="text-fp-warning">
                  ({(100 - savingsRate).toFixed(0)}%)
                </span>
              </div>
              <div className="h-1.5 bg-fp-muted rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-fp-danger rounded-full"
                  style={{
                    width: `${Math.min(100, (expense / income) * 100)}%`,
                  }}
                />
              </div>
            </Card>
          </motion.div>

          {/* Monthly Savings */}
          <motion.div {...STAGGER} transition={{ delay: 0.15 }}>
            <Card className="hover-card" onClick={() => navigate("/budget")}>
              <div className="text-xs text-fp-text-3 mb-2">Monthly Savings</div>
              <div
                className={`text-2xl font-bold ${savings >= 0 ? "text-fp-primary" : "text-red-400"}`}
              >
                {formatINRCompact(savings)}
              </div>
              <div className="text-xs text-fp-text-3 mt-1">
                Savings rate:{" "}
                <span
                  className={
                    savingsRate >= 20 ? "text-fp-primary" : "text-fp-warning"
                  }
                >
                  {savingsRate.toFixed(0)}%
                </span>
              </div>
              <div className="h-1.5 bg-fp-muted rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-fp-primary rounded-full"
                  style={{ width: `${Math.min(100, savingsRate)}%` }}
                />
              </div>
            </Card>
          </motion.div>

          {/* Health Score */}
          <motion.div {...STAGGER} transition={{ delay: 0.2 }}>
            <Card className="hover-card" onClick={() => navigate("/insights")}>
              <div className="text-xs text-fp-text-3 mb-2">Health Score</div>
              <div className="flex items-end gap-2">
                <div
                  className="text-2xl font-bold"
                  style={{ color: gradeColor }}
                >
                  {healthScore?.score || 0}
                </div>
                <div
                  className="text-sm font-bold pb-0.5"
                  style={{ color: gradeColor }}
                >
                  / 100
                </div>
                <div
                  className="ml-auto text-3xl font-black"
                  style={{ color: gradeColor }}
                >
                  {grade}
                </div>
              </div>
              <div className="text-xs mt-1" style={{ color: gradeColor }}>
                {gradeLabel}
              </div>
              <div className="h-1.5 bg-fp-muted rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${healthScore?.score || 0}%`,
                    backgroundColor: gradeColor,
                  }}
                />
              </div>
            </Card>
          </motion.div>
        </div>

        {/* MIDDLE ROW: Trend + Portfolio */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* 12-Month Trend */}
          <motion.div
            {...STAGGER}
            transition={{ delay: 0.25 }}
            className="lg:col-span-3"
          >
            <Card className="h-64">
              <SectionHeader
                title="12-Month Cash Flow"
                subtitle="Income vs expenses"
                icon="📈"
              />
              {monthlyTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={monthlyTrend}>
                    <defs>
                      <linearGradient
                        id="incomeGrad"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#10D9A0"
                          stopOpacity={0.25}
                        />
                        <stop
                          offset="95%"
                          stopColor="#10D9A0"
                          stopOpacity={0}
                        />
                      </linearGradient>
                      <linearGradient
                        id="expenseGrad"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#FF4D6B"
                          stopOpacity={0.25}
                        />
                        <stop
                          offset="95%"
                          stopColor="#FF4D6B"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      stroke="#1E2D4A"
                      strokeDasharray="3 3"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "#4A5A7A", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={(v) => formatINRCompact(v)}
                      tick={{ fill: "#4A5A7A", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#141E35",
                        border: "1px solid #1E2D4A",
                        borderRadius: 12,
                      }}
                      formatter={(val: any) => [formatINR(val), ""]}
                    />
                    <Area
                      type="monotone"
                      dataKey="income"
                      stroke="#10D9A0"
                      strokeWidth={2}
                      fill="url(#incomeGrad)"
                      name="Income"
                    />
                    <Area
                      type="monotone"
                      dataKey="expense"
                      stroke="#FF4D6B"
                      strokeWidth={2}
                      fill="url(#expenseGrad)"
                      name="Expenses"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState
                  icon="📉"
                  title="No data yet"
                  description="Add transactions to see your cash flow trend"
                />
              )}
            </Card>
          </motion.div>

          {/* Portfolio Allocation */}
          <motion.div
            {...STAGGER}
            transition={{ delay: 0.3 }}
            className="lg:col-span-2"
          >
            <Card className="h-64">
              <SectionHeader title="Portfolio" subtitle="Allocation" icon="◈" />
              {portfolio ? (
                <div className="flex items-center gap-2">
                  <ResponsiveContainer width={110} height={110}>
                    <PieChart>
                      <Pie
                        data={portfolio.allocation}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={50}
                        dataKey="value"
                        paddingAngle={2}
                      >
                        {portfolio.allocation.map((entry: any, i: number) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: any) => [formatINR(v), ""]}
                        contentStyle={{
                          background: "#141E35",
                          border: "1px solid #1E2D4A",
                          borderRadius: 8,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-1.5 min-w-0">
                    {portfolio.allocation.map((a: any) => (
                      <div key={a.name} className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: a.color }}
                        />
                        <span className="text-[11px] text-fp-text-2 truncate flex-1">
                          {a.name}
                        </span>
                        <span className="text-[11px] font-mono text-fp-text flex-shrink-0">
                          {a.percentage.toFixed(0)}%
                        </span>
                      </div>
                    ))}
                    <div className="pt-1 border-t border-fp-border/40 mt-2">
                      <div className="text-xs text-fp-text-3">Total</div>
                      <div className="text-sm font-bold text-fp-text">
                        {formatINRCompact(portfolio.totalValue)}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <EmptyState
                  icon="📊"
                  title="No holdings yet"
                  description="Add investments in Portfolio"
                  action={
                    <Button size="sm" onClick={() => navigate("/portfolio")}>
                      Add Holdings
                    </Button>
                  }
                />
              )}
            </Card>
          </motion.div>
        </div>

        {/* BOTTOM ROW: Recent Txs + Weekly Story + Goals */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Recent Transactions */}
          <motion.div {...STAGGER} transition={{ delay: 0.35 }}>
            <Card className="h-64 flex flex-col">
              <SectionHeader
                title="Recent"
                subtitle="Transactions"
                icon="↔"
                action={
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => navigate("/transactions")}
                  >
                    View all
                  </Button>
                }
              />
              {transactions.length > 0 ? (
                <div className="flex-1 overflow-y-auto space-y-2">
                  {transactions.map((tx: any) => (
                    <div
                      key={tx.id}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-fp-card transition-all"
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                        style={{
                          backgroundColor: `${tx.category_color || "#3D7FFF"}20`,
                        }}
                      >
                        {tx.category_icon || "💰"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-fp-text truncate">
                          {tx.description}
                        </div>
                        <div className="text-[10px] text-fp-text-3">
                          {formatDate(tx.date, "dd MMM")}
                        </div>
                      </div>
                      <div
                        className={`text-xs font-semibold flex-shrink-0 ${tx.type === "income" ? "text-fp-primary" : "text-red-400"}`}
                      >
                        {tx.type === "income" ? "+" : "-"}
                        {formatINRCompact(tx.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon="💸"
                  title="No transactions"
                  description="Add your first transaction"
                  action={
                    <Button size="sm" onClick={() => navigate("/transactions")}>
                      Add Transaction
                    </Button>
                  }
                />
              )}
            </Card>
          </motion.div>

          {/* Weekly AI Story */}
          <motion.div {...STAGGER} transition={{ delay: 0.4 }}>
            <Card className="h-64 flex flex-col">
              <SectionHeader
                title="Your Week"
                subtitle="AI financial story"
                icon="✨"
                action={
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={generateStory}
                    loading={generatingStory}
                  >
                    {weeklyStory ? "Refresh" : "Generate"}
                  </Button>
                }
              />
              {weeklyStory ? (
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium mb-3 ${
                        weeklyStory.mood === "positive"
                          ? "bg-fp-primary/10 text-fp-primary"
                          : weeklyStory.mood === "negative"
                            ? "bg-red-500/10 text-red-400"
                            : "bg-fp-card text-fp-text-3"
                      }`}
                    >
                      {weeklyStory.mood === "positive"
                        ? "📈 Good week"
                        : weeklyStory.mood === "negative"
                          ? "📉 Tough week"
                          : "📊 Steady week"}
                    </div>
                    <p className="text-sm text-fp-text-2 leading-relaxed">
                      {weeklyStory.story}
                    </p>
                  </div>
                  {weeklyStory.highlights && (
                    <div className="mt-3 p-2 rounded-lg bg-fp-card text-xs text-fp-primary font-medium">
                      💡 {weeklyStory.highlights}
                    </div>
                  )}
                </div>
              ) : (
                <EmptyState
                  icon="✨"
                  title="No story yet"
                  description="Generate your weekly financial narrative with AI"
                />
              )}
            </Card>
          </motion.div>

          {/* Goals Progress */}
          <motion.div {...STAGGER} transition={{ delay: 0.45 }}>
            <Card className="h-64 flex flex-col">
              <SectionHeader
                title="Goals"
                subtitle="Progress"
                icon="◎"
                action={
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => navigate("/goals")}
                  >
                    View all
                  </Button>
                }
              />
              {goals.length > 0 ? (
                <div className="flex-1 overflow-y-auto space-y-3">
                  {goals.slice(0, 3).map((goal: any) => {
                    const pct = Math.min(
                      100,
                      (goal.current_amount / goal.target_amount) * 100,
                    );
                    return (
                      <div key={goal.id}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm">{goal.icon}</span>
                            <span className="text-xs font-medium text-fp-text truncate max-w-24">
                              {goal.name}
                            </span>
                          </div>
                          <span className="text-xs text-fp-text-3">
                            {pct.toFixed(0)}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-fp-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: goal.color || "#10D9A0",
                            }}
                          />
                        </div>
                        <div className="flex justify-between mt-0.5">
                          <span className="text-[10px] text-fp-text-3">
                            {formatINRCompact(goal.current_amount)}
                          </span>
                          <span className="text-[10px] text-fp-text-3">
                            {formatINRCompact(goal.target_amount)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  icon="🎯"
                  title="No goals set"
                  description="Set financial goals to track progress"
                  action={
                    <Button size="sm" onClick={() => navigate("/goals")}>
                      Add Goal
                    </Button>
                  }
                />
              )}
            </Card>
          </motion.div>
        </div>

        {/* Market News */}
        {news.length > 0 && (
          <motion.div {...STAGGER} transition={{ delay: 0.5 }}>
            <Card>
              <SectionHeader
                title="Market News"
                subtitle="Latest financial updates"
                icon="📰"
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {news.slice(0, 3).map((item: any) => (
                  <a
                    key={item.id}
                    href={item.url !== "#" ? item.url : undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-xl bg-fp-card border border-fp-border/40 hover:border-fp-border/70 transition-all cursor-pointer block"
                  >
                    <div
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] mb-2 ${
                        item.sentiment === "positive"
                          ? "bg-fp-primary/10 text-fp-primary"
                          : item.sentiment === "negative"
                            ? "bg-red-500/10 text-red-400"
                            : "bg-fp-muted text-fp-text-3"
                      }`}
                    >
                      {item.sentiment === "positive"
                        ? "↑"
                        : item.sentiment === "negative"
                          ? "↓"
                          : "→"}{" "}
                      {item.source}
                    </div>
                    <div className="text-xs font-medium text-fp-text leading-snug line-clamp-2">
                      {item.title}
                    </div>
                    <div className="text-[10px] text-fp-text-3 mt-1">
                      {formatDate(item.publishedAt, "dd MMM · HH:mm")}
                    </div>
                  </a>
                ))}
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="h-full overflow-y-auto p-5 space-y-5">
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card p-4 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-2 w-full" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3 glass-card p-4 h-64">
          <Skeleton className="h-4 w-32 mb-4" />
          <Skeleton className="h-40 w-full" />
        </div>
        <div className="col-span-2 glass-card p-4 h-64">
          <Skeleton className="h-4 w-24 mb-4" />
          <div className="flex gap-4">
            <Skeleton className="w-28 h-28 rounded-full" />
            <div className="flex-1 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-3 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
