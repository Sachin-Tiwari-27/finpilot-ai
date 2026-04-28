import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  Card,
  Button,
  Modal,
  Select,
  SectionHeader,
  EmptyState,
} from "@/components/Common/UI";
import { useStore } from "@/store";
import {
  formatINR,
  formatINRCompact,
  getCurrentMonth,
  getMonthRange,
} from "@/utils";
import toast from "react-hot-toast";

export default function BudgetPage() {
  const { categories } = useStore();
  const [budgets, setBudgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [showEditModal, setShowEditModal] = useState(false);
  const [editBudget, setEditBudget] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadBudgets();
  }, [selectedMonth]);

  async function loadBudgets() {
    setLoading(true);
    try {
      const data = await window.api.budgets.getForMonth(selectedMonth);
      setBudgets(data as any[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const totalBudgeted = budgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent = budgets.reduce((s, b) => s + (b.spent || 0), 0);
  const overBudgetCount = budgets.filter(
    (b) => (b.spent || 0) > b.amount,
  ).length;

  const monthOptions = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return {
      value: val,
      label: d.toLocaleString("default", { month: "long", year: "numeric" }),
    };
  });

  const expenseCategories = categories.filter((c) => c.type === "expense");
  const unbudgetedCats = expenseCategories.filter(
    (c) => !budgets.find((b) => b.category_id === c.id),
  );

  // Radar chart data
  const radarData = budgets.slice(0, 6).map((b) => ({
    category: b.category_name,
    budget: 100,
    spent: Math.min(150, ((b.spent || 0) / b.amount) * 100),
  }));

  return (
    <div className="h-full overflow-y-auto p-5">
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-fp-text">Budget</h1>
            <p className="text-xs text-fp-text-3 mt-0.5">
              Track spending against your planned budget
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-fp-card border border-fp-border rounded-lg px-3 py-1.5 text-xs text-fp-text focus:outline-none"
            >
              {monthOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <Button size="sm" icon="+" onClick={() => setShowAddModal(true)}>
              Add Budget
            </Button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-3">
            <div className="text-xs text-fp-text-3 mb-1">Total Budgeted</div>
            <div className="text-xl font-bold text-fp-text">
              {formatINRCompact(totalBudgeted)}
            </div>
            <div className="text-xs text-fp-text-3 mt-1">
              {budgets.length} categories
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-fp-text-3 mb-1">Total Spent</div>
            <div
              className={`text-xl font-bold ${totalSpent > totalBudgeted ? "text-red-400" : "text-fp-primary"}`}
            >
              {formatINRCompact(totalSpent)}
            </div>
            <div
              className="text-xs mt-1"
              style={{
                color: totalSpent > totalBudgeted ? "#FF4D6B" : "#10D9A0",
              }}
            >
              {totalBudgeted > 0
                ? ((totalSpent / totalBudgeted) * 100).toFixed(0)
                : 0}
              % used
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-fp-text-3 mb-1">Status</div>
            <div
              className={`text-xl font-bold ${overBudgetCount > 0 ? "text-fp-warning" : "text-fp-primary"}`}
            >
              {overBudgetCount > 0
                ? `${overBudgetCount} over budget`
                : "On Track ✓"}
            </div>
            <div className="text-xs text-fp-text-3 mt-1">
              Remaining:{" "}
              {formatINRCompact(Math.max(0, totalBudgeted - totalSpent))}
            </div>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Budget Progress Cards */}
          <div className="lg:col-span-2 space-y-3">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="glass-card p-4 h-20 shimmer" />
              ))
            ) : budgets.length > 0 ? (
              budgets.map((budget) => (
                <BudgetProgressCard
                  key={budget.id}
                  budget={budget}
                  onEdit={() => {
                    setEditBudget(budget);
                    setShowEditModal(true);
                  }}
                  onDelete={async () => {
                    await window.api.budgets.delete(budget.id);
                    toast.success("Budget removed");
                    loadBudgets();
                  }}
                />
              ))
            ) : (
              <Card>
                <EmptyState
                  icon="📊"
                  title="No budgets set"
                  description="Set monthly spending limits for each category to track your progress"
                  action={
                    <Button size="sm" onClick={() => setShowAddModal(true)}>
                      + Add Budget
                    </Button>
                  }
                />
              </Card>
            )}
          </div>

          {/* Radar + Quick Stats */}
          <div className="space-y-4">
            {radarData.length >= 3 && (
              <Card>
                <SectionHeader title="Spending Radar" subtitle="vs budget %" />
                <ResponsiveContainer width="100%" height={180}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#1E2D4A" />
                    <PolarAngleAxis
                      dataKey="category"
                      tick={{ fill: "#4A5A7A", fontSize: 10 }}
                    />
                    <Radar
                      name="Budget"
                      dataKey="budget"
                      stroke="#3D7FFF"
                      fill="#3D7FFF"
                      fillOpacity={0.1}
                    />
                    <Radar
                      name="Spent"
                      dataKey="spent"
                      stroke="#FF4D6B"
                      fill="#FF4D6B"
                      fillOpacity={0.2}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#141E35",
                        border: "1px solid #1E2D4A",
                        borderRadius: 8,
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </Card>
            )}

            {/* Quick Actions */}
            <Card>
              <SectionHeader title="Budget Tips" icon="💡" />
              <div className="space-y-2">
                {budgets
                  .filter((b) => (b.spent || 0) > b.amount * 0.8)
                  .slice(0, 3)
                  .map((b) => {
                    const pct = (b.spent / b.amount) * 100;
                    return (
                      <div
                        key={b.id}
                        className="p-2 rounded-lg bg-fp-card border border-fp-warning/20"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{b.icon}</span>
                          <div>
                            <div className="text-xs font-medium text-fp-warning">
                              {b.category_name}
                            </div>
                            <div className="text-[10px] text-fp-text-3">
                              {pct > 100
                                ? `₹${formatINRCompact(b.spent - b.amount)} over budget`
                                : `${pct.toFixed(0)}% used`}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                {budgets.filter((b) => (b.spent || 0) <= b.amount * 0.8)
                  .length > 0 && (
                  <div className="p-2 rounded-lg bg-fp-primary/5 border border-fp-primary/20">
                    <div className="text-xs text-fp-primary font-medium">
                      ✓{" "}
                      {
                        budgets.filter((b) => (b.spent || 0) <= b.amount * 0.8)
                          .length
                      }{" "}
                      categories on track
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editBudget && (
        <BudgetEditModal
          isOpen={showEditModal}
          budget={editBudget}
          onClose={() => {
            setShowEditModal(false);
            setEditBudget(null);
          }}
          onSave={() => {
            setShowEditModal(false);
            setEditBudget(null);
            loadBudgets();
          }}
        />
      )}

      {/* Add Modal */}
      <AddBudgetModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={() => {
          setShowAddModal(false);
          loadBudgets();
        }}
        categories={unbudgetedCats}
        month={selectedMonth}
      />
    </div>
  );
}

// ─── Budget Progress Card ──────────────────────────────────────────
function BudgetProgressCard({ budget, onEdit, onDelete }: any) {
  const spent = budget.spent || 0;
  const pct = Math.min(100, (spent / budget.amount) * 100);
  const isOver = spent > budget.amount;
  const isWarning = pct >= 80 && !isOver;
  const remaining = budget.amount - spent;

  const color = isOver
    ? "#FF4D6B"
    : isWarning
      ? "#FFB84D"
      : budget.color || "#10D9A0";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-4 group hover-card"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
            style={{ backgroundColor: `${color}15` }}
          >
            {budget.icon}
          </div>
          <div>
            <div className="text-sm font-semibold text-fp-text">
              {budget.category_name}
            </div>
            <div className="text-xs text-fp-text-3">
              {formatINR(spent)} of {formatINR(budget.amount)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status badge */}
          <span
            className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
              isOver
                ? "bg-red-500/10 text-red-400"
                : isWarning
                  ? "bg-fp-warning/10 text-fp-warning"
                  : "bg-fp-primary/10 text-fp-primary"
            }`}
          >
            {isOver
              ? `Over by ${formatINRCompact(spent - budget.amount)}`
              : isWarning
                ? `${pct.toFixed(0)}% used`
                : `${formatINRCompact(remaining)} left`}
          </span>

          {/* Actions (shown on hover) */}
          <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-all">
            <button
              onClick={onEdit}
              className="w-6 h-6 rounded flex items-center justify-center text-fp-text-3 hover:text-fp-text hover:bg-fp-muted text-xs"
            >
              ✎
            </button>
            <button
              onClick={onDelete}
              className="w-6 h-6 rounded flex items-center justify-center text-fp-text-3 hover:text-red-400 hover:bg-red-500/10 text-xs"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-fp-muted rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>

      {/* Micro stats */}
      <div className="flex justify-between mt-1.5">
        <span className="text-[10px] text-fp-text-3">₹0</span>
        {isOver && (
          <span className="text-[10px] text-red-400 font-medium">
            Budget exceeded!
          </span>
        )}
        <span className="text-[10px] text-fp-text-3">
          {formatINRCompact(budget.amount)}
        </span>
      </div>
    </motion.div>
  );
}

// ─── Budget Edit Modal (with slider) ─────────────────────────────
function BudgetEditModal({ isOpen, budget, onClose, onSave }: any) {
  const [amount, setAmount] = useState(budget.amount);
  const maxSlider = Math.max(budget.amount * 2, 50000);

  async function handleSave() {
    await window.api.budgets.upsert({ ...budget, amount });
    toast.success("Budget updated!");
    onSave();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Budget: ${budget.category_name}`}
      size="sm"
    >
      <div className="space-y-5">
        <div className="text-center">
          <div className="text-4xl mb-2">{budget.icon}</div>
          <div className="text-2xl font-bold text-fp-text">
            {formatINR(amount)}
          </div>
          <div className="text-xs text-fp-text-3 mt-1">per month</div>
        </div>

        {/* Slider */}
        <div>
          <input
            type="range"
            min={0}
            max={maxSlider}
            step={500}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full accent-fp-primary"
          />
          <div className="flex justify-between text-[10px] text-fp-text-3 mt-1">
            <span>₹0</span>
            <span>{formatINRCompact(maxSlider)}</span>
          </div>
        </div>

        {/* Quick presets */}
        <div className="flex gap-2 flex-wrap">
          {[5000, 10000, 15000, 20000, 30000, 50000].map((preset) => (
            <button
              key={preset}
              onClick={() => setAmount(preset)}
              className={`px-2 py-1 rounded-lg text-xs transition-all ${amount === preset ? "bg-fp-primary/20 text-fp-primary" : "bg-fp-card text-fp-text-3 hover:text-fp-text"}`}
            >
              {formatINRCompact(preset)}
            </button>
          ))}
        </div>

        {/* Current spent */}
        <div className="p-2 rounded-lg bg-fp-card border border-fp-border text-xs text-fp-text-3">
          Currently spent this month:{" "}
          <span className="text-fp-text font-medium">
            {formatINR(budget.spent || 0)}
          </span>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSave} className="flex-1">
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Add Budget Modal ─────────────────────────────────────────────
function AddBudgetModal({ isOpen, onClose, onSave, categories, month }: any) {
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState(10000);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!categoryId) return toast.error("Please select a category");
    setSaving(true);
    try {
      await window.api.budgets.upsert({
        category_id: categoryId,
        month,
        amount,
      });
      toast.success("Budget added!");
      setCategoryId("");
      setAmount(10000);
      onSave();
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Budget" size="sm">
      <div className="space-y-4">
        <Select
          label="Category"
          value={categoryId}
          onChange={setCategoryId}
          options={[
            { value: "", label: "Select category..." },
            ...categories.map((c: any) => ({
              value: c.id,
              label: `${c.icon} ${c.name}`,
            })),
          ]}
        />
        <div>
          <label className="block text-xs font-medium text-fp-text-2 mb-1">
            Monthly Limit
          </label>
          <div className="text-2xl font-bold text-fp-text text-center mb-3">
            {formatINR(amount)}
          </div>
          <input
            type="range"
            min={0}
            max={100000}
            step={500}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full accent-fp-primary"
          />
          <div className="flex gap-2 flex-wrap mt-2">
            {[5000, 10000, 20000, 30000, 50000].map((p) => (
              <button
                key={p}
                onClick={() => setAmount(p)}
                className="px-2 py-0.5 rounded text-xs bg-fp-card text-fp-text-3 hover:text-fp-text transition-all"
              >
                {formatINRCompact(p)}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSave} loading={saving} className="flex-1">
            Add Budget
          </Button>
        </div>
      </div>
    </Modal>
  );
}
