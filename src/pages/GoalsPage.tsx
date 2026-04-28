import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  Card,
  Button,
  Modal,
  Input,
  Select,
  SectionHeader,
  EmptyState,
} from "@/components/Common/UI";
import { useStore } from "@/store";
import {
  formatINR,
  formatINRCompact,
  formatDate,
  calculateProjection,
} from "@/utils";
import { projectGoal } from "@/services/openRouter";
import toast from "react-hot-toast";

const GOAL_ICONS = [
  "🎯",
  "🏠",
  "🚗",
  "✈️",
  "🎓",
  "💍",
  "🏦",
  "🌅",
  "💻",
  "👶",
  "⚕️",
  "🌍",
];
const GOAL_COLORS = [
  "#10D9A0",
  "#3D7FFF",
  "#FFB84D",
  "#B04DFF",
  "#FF6B3D",
  "#FF4D6B",
  "#4DE8FF",
];
const GOAL_CATEGORIES = [
  { value: "savings", label: "🏦 Savings" },
  { value: "investment", label: "📈 Investment" },
  { value: "purchase", label: "🛒 Major Purchase" },
  { value: "education", label: "🎓 Education" },
  { value: "retirement", label: "🌅 Retirement" },
  { value: "emergency", label: "🛡️ Emergency Fund" },
  { value: "travel", label: "✈️ Travel" },
  { value: "other", label: "⭐ Other" },
];

export default function GoalsPage() {
  const { goals, setGoals } = useStore();
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editGoal, setEditGoal] = useState<any>(null);
  const [projectionGoal, setProjectionGoal] = useState<any>(null);

  useEffect(() => {
    loadGoals();
  }, []);

  async function loadGoals() {
    setLoading(true);
    try {
      const data = await window.api.goals.getAll();
      setGoals(data as any);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function deleteGoal(id: string) {
    if (!confirm("Remove this goal?")) return;
    await window.api.goals.delete(id);
    toast.success("Goal removed");
    loadGoals();
  }

  const totalTargeted = goals.reduce((s, g) => s + g.target_amount, 0);
  const totalSaved = goals.reduce((s, g) => s + g.current_amount, 0);

  return (
    <div className="h-full overflow-y-auto p-5">
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-fp-text">Financial Goals</h1>
            <p className="text-xs text-fp-text-3 mt-0.5">
              Track your journey to financial freedom
            </p>
          </div>
          <Button size="sm" icon="+" onClick={() => setShowAddModal(true)}>
            Add Goal
          </Button>
        </div>

        {/* Summary */}
        {goals.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-3">
              <div className="text-xs text-fp-text-3">Total Goals</div>
              <div className="text-xl font-bold text-fp-text">
                {goals.length}
              </div>
            </Card>
            <Card className="p-3">
              <div className="text-xs text-fp-text-3">Total Targeted</div>
              <div className="text-xl font-bold text-fp-text">
                {formatINRCompact(totalTargeted)}
              </div>
            </Card>
            <Card className="p-3">
              <div className="text-xs text-fp-text-3">Total Saved</div>
              <div className="text-xl font-bold text-fp-primary">
                {formatINRCompact(totalSaved)}
              </div>
              <div className="text-xs text-fp-text-3 mt-0.5">
                {totalTargeted > 0
                  ? ((totalSaved / totalTargeted) * 100).toFixed(0)
                  : 0}
                % of all goals
              </div>
            </Card>
          </div>
        )}

        {/* Goals Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="glass-card h-48 shimmer" />
            ))}
          </div>
        ) : goals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goals.map((goal, i) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                index={i}
                onEdit={() => setEditGoal(goal)}
                onDelete={() => deleteGoal(goal.id)}
                onUpdateAmount={async (newAmount: number) => {
                  await window.api.goals.update(goal.id, {
                    ...goal,
                    current_amount: newAmount,
                  });
                  toast.success("Progress updated!");
                  loadGoals();
                }}
                onProject={() => setProjectionGoal(goal)}
              />
            ))}
          </div>
        ) : (
          <Card>
            <EmptyState
              icon="🎯"
              title="No goals yet"
              description="Set financial goals to stay motivated and track your progress towards financial freedom"
              action={
                <Button onClick={() => setShowAddModal(true)}>
                  + Add Your First Goal
                </Button>
              }
            />
          </Card>
        )}
      </div>

      {/* Modals */}
      <GoalModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={() => {
          setShowAddModal(false);
          loadGoals();
        }}
      />

      {editGoal && (
        <GoalModal
          isOpen={true}
          goal={editGoal}
          onClose={() => setEditGoal(null)}
          onSave={() => {
            setEditGoal(null);
            loadGoals();
          }}
        />
      )}

      {projectionGoal && (
        <ProjectionModal
          goal={projectionGoal}
          onClose={() => setProjectionGoal(null)}
        />
      )}
    </div>
  );
}

// ─── Goal Card ────────────────────────────────────────────────────
function GoalCard({
  goal,
  index,
  onEdit,
  onDelete,
  onUpdateAmount,
  onProject,
}: any) {
  const pct =
    goal.target_amount > 0
      ? Math.min(100, (goal.current_amount / goal.target_amount) * 100)
      : 0;
  const remaining = goal.target_amount - goal.current_amount;
  const isComplete = pct >= 100;
  const [showUpdateInput, setShowUpdateInput] = useState(false);
  const [updateAmount, setUpdateAmount] = useState(String(goal.current_amount));

  const daysRemaining = goal.target_date
    ? Math.ceil(
        (new Date(goal.target_date).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24),
      )
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="group hover-card relative overflow-hidden">
        {/* Background glow based on completion */}
        <div
          className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-5 pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${goal.color || "#10D9A0"}, transparent)`,
          }}
        />

        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{ backgroundColor: `${goal.color || "#10D9A0"}15` }}
              >
                {goal.icon}
              </div>
              <div>
                <h3 className="text-sm font-bold text-fp-text">{goal.name}</h3>
                {goal.description && (
                  <p className="text-xs text-fp-text-3 mt-0.5">
                    {goal.description}
                  </p>
                )}
                {goal.target_date && (
                  <div
                    className={`text-[10px] mt-0.5 ${daysRemaining && daysRemaining < 30 ? "text-fp-warning" : "text-fp-text-3"}`}
                  >
                    {daysRemaining !== null && daysRemaining > 0
                      ? `${daysRemaining} days remaining (${formatDate(goal.target_date, "dd MMM yyyy")})`
                      : daysRemaining !== null && daysRemaining <= 0
                        ? "⚠ Target date passed"
                        : formatDate(goal.target_date, "dd MMM yyyy")}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
              <button
                onClick={onProject}
                className="w-6 h-6 rounded text-xs flex items-center justify-center text-fp-text-3 hover:text-fp-primary hover:bg-fp-primary/10"
                title="Project"
              >
                📊
              </button>
              <button
                onClick={onEdit}
                className="w-6 h-6 rounded text-xs flex items-center justify-center text-fp-text-3 hover:text-fp-text hover:bg-fp-muted"
                title="Edit"
              >
                ✎
              </button>
              <button
                onClick={onDelete}
                className="w-6 h-6 rounded text-xs flex items-center justify-center text-fp-text-3 hover:text-red-400 hover:bg-red-500/10"
                title="Delete"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Progress */}
          <div className="mb-3">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-sm font-bold text-fp-text">
                {formatINRCompact(goal.current_amount)}
              </span>
              <span className="text-xs text-fp-text-3">
                of {formatINRCompact(goal.target_amount)}
              </span>
            </div>
            <div className="h-3 bg-fp-muted rounded-full overflow-hidden relative">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full rounded-full relative overflow-hidden"
                style={{ backgroundColor: goal.color || "#10D9A0" }}
              >
                {/* Shimmer effect on progress bar */}
                <div className="absolute inset-0 shimmer opacity-30" />
              </motion.div>
              {isComplete && (
                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
                  COMPLETE! 🎉
                </div>
              )}
            </div>
            <div className="flex justify-between mt-1">
              <span
                className="text-[10px]"
                style={{ color: goal.color || "#10D9A0" }}
              >
                {pct.toFixed(0)}% done
              </span>
              {!isComplete && (
                <span className="text-[10px] text-fp-text-3">
                  {formatINRCompact(remaining)} to go
                </span>
              )}
            </div>
          </div>

          {/* Update progress */}
          {!showUpdateInput ? (
            <button
              onClick={() => setShowUpdateInput(true)}
              className="w-full py-1.5 rounded-lg text-xs font-medium border border-dashed border-fp-border text-fp-text-3 hover:text-fp-text hover:border-fp-primary/40 transition-all"
            >
              + Update Progress
            </button>
          ) : (
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-fp-text-3 text-xs">
                  ₹
                </span>
                <input
                  type="number"
                  value={updateAmount}
                  onChange={(e) => setUpdateAmount(e.target.value)}
                  className="w-full pl-5 pr-2 py-1.5 text-xs bg-fp-card border border-fp-border rounded-lg text-fp-text focus:outline-none focus:border-fp-primary/50"
                  autoFocus
                />
              </div>
              <button
                onClick={() => {
                  onUpdateAmount(parseFloat(updateAmount));
                  setShowUpdateInput(false);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-fp-bg"
                style={{ backgroundColor: goal.color || "#10D9A0" }}
              >
                Save
              </button>
              <button
                onClick={() => setShowUpdateInput(false)}
                className="px-2 py-1.5 rounded-lg text-xs text-fp-text-3 hover:text-fp-text"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

// ─── Goal Modal ───────────────────────────────────────────────────
function GoalModal({ isOpen, onClose, onSave, goal }: any) {
  const isEdit = !!goal;
  const [form, setForm] = useState({
    name: goal?.name || "",
    description: goal?.description || "",
    target_amount: goal?.target_amount || "",
    current_amount: goal?.current_amount || 0,
    target_date: goal?.target_date || "",
    category: goal?.category || "savings",
    icon: goal?.icon || "🎯",
    color: goal?.color || "#10D9A0",
    priority: goal?.priority || 1,
  });
  const [saving, setSaving] = useState(false);

  const f = (k: string) => (v: string) => setForm((p) => ({ ...p, [k]: v }));

  async function handleSave() {
    if (!form.name || !form.target_amount)
      return toast.error("Name and target amount required");
    setSaving(true);
    try {
      if (isEdit) {
        await window.api.goals.update(goal.id, {
          ...form,
          target_amount: parseFloat(String(form.target_amount)),
          current_amount: parseFloat(String(form.current_amount)),
        });
        toast.success("Goal updated!");
      } else {
        await window.api.goals.create({
          ...form,
          target_amount: parseFloat(String(form.target_amount)),
          current_amount: parseFloat(String(form.current_amount)),
        });
        toast.success("Goal created! 🎯");
      }
      onSave();
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Edit Goal" : "New Financial Goal"}
      size="md"
    >
      <div className="space-y-4">
        {/* Icon picker */}
        <div>
          <label className="block text-xs font-medium text-fp-text-2 mb-2">
            Icon
          </label>
          <div className="flex flex-wrap gap-2">
            {GOAL_ICONS.map((icon) => (
              <button
                key={icon}
                onClick={() => setForm((p) => ({ ...p, icon }))}
                className={`w-9 h-9 rounded-lg text-xl transition-all ${form.icon === icon ? "ring-2 ring-fp-primary bg-fp-primary/10" : "bg-fp-card hover:bg-fp-muted"}`}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>

        {/* Color picker */}
        <div>
          <label className="block text-xs font-medium text-fp-text-2 mb-2">
            Color
          </label>
          <div className="flex gap-2">
            {GOAL_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setForm((p) => ({ ...p, color }))}
                className={`w-7 h-7 rounded-full transition-all ${form.color === color ? "ring-2 ring-offset-2 ring-offset-fp-surface ring-fp-text scale-110" : "hover:scale-105"}`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        <Input
          label="Goal Name"
          value={form.name}
          onChange={f("name")}
          placeholder="e.g. Home Down Payment"
          required
        />
        <Input
          label="Description (optional)"
          value={form.description}
          onChange={f("description")}
          placeholder="Short description"
        />
        <Select
          label="Category"
          value={form.category}
          onChange={f("category")}
          options={GOAL_CATEGORIES}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Target Amount"
            value={String(form.target_amount)}
            onChange={f("target_amount")}
            type="number"
            prefix="₹"
            required
          />
          <Input
            label="Current Savings"
            value={String(form.current_amount)}
            onChange={f("current_amount")}
            type="number"
            prefix="₹"
          />
        </div>

        <Input
          label="Target Date (optional)"
          value={form.target_date}
          onChange={f("target_date")}
          type="date"
        />

        <div className="flex gap-2 pt-1">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSave} loading={saving} className="flex-1">
            {isEdit ? "Update Goal" : "Create Goal"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Projection Modal ─────────────────────────────────────────────
function ProjectionModal({ goal, onClose }: any) {
  const [monthlyContrib, setMonthlyContrib] = useState(10000);
  const [annualReturn, setAnnualReturn] = useState(12);
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const projectionData = Array.from({ length: 10 }, (_, i) => {
    const years = i + 1;
    const projected = calculateProjection(
      goal.current_amount,
      monthlyContrib,
      annualReturn,
      years,
    );
    return { year: `Year ${years}`, projected, target: goal.target_amount };
  });

  const targetYear = projectionData.find(
    (d) => d.projected >= goal.target_amount,
  );

  async function getAIAnalysis() {
    setAiLoading(true);
    try {
      const result = await projectGoal(
        goal.name,
        goal.target_amount,
        goal.current_amount,
        monthlyContrib,
        annualReturn,
      );
      setAiAnalysis(result);
    } catch (e: any) {
      toast.error("AI analysis failed: " + e.message);
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Projection: ${goal.name}`}
      size="xl"
    >
      <div className="space-y-4">
        {/* Controls */}
        <div className="grid grid-cols-2 gap-4 p-3 rounded-xl bg-fp-card border border-fp-border">
          <div>
            <label className="text-xs font-medium text-fp-text-2 mb-1 block">
              Monthly Contribution: {formatINRCompact(monthlyContrib)}
            </label>
            <input
              type="range"
              min={1000}
              max={100000}
              step={1000}
              value={monthlyContrib}
              onChange={(e) => setMonthlyContrib(Number(e.target.value))}
              className="w-full accent-fp-primary"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-fp-text-2 mb-1 block">
              Annual Return: {annualReturn}%
            </label>
            <input
              type="range"
              min={5}
              max={25}
              step={0.5}
              value={annualReturn}
              onChange={(e) => setAnnualReturn(Number(e.target.value))}
              className="w-full accent-fp-primary"
            />
          </div>
        </div>

        {/* Result */}
        {targetYear && (
          <div className="p-3 rounded-xl bg-fp-primary/10 border border-fp-primary/30 text-center">
            <div className="text-xs text-fp-text-3">You'll reach your goal</div>
            <div className="text-lg font-bold text-fp-primary">
              {targetYear.year} 🎉
            </div>
            <div className="text-xs text-fp-text-3">
              at ₹{monthlyContrib.toLocaleString()}/month and {annualReturn}%
              returns
            </div>
          </div>
        )}

        {/* Projection Chart */}
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={projectionData}>
            <CartesianGrid
              stroke="#1E2D4A"
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis
              dataKey="year"
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
              formatter={(v: any) => [formatINR(v), ""]}
              contentStyle={{
                background: "#141E35",
                border: "1px solid #1E2D4A",
                borderRadius: 8,
              }}
            />
            <ReferenceLine
              y={goal.target_amount}
              stroke="#FFB84D"
              strokeDasharray="5 5"
              label={{ value: "Target", fill: "#FFB84D", fontSize: 10 }}
            />
            <Line
              type="monotone"
              dataKey="projected"
              stroke="#10D9A0"
              strokeWidth={2}
              dot={false}
              name="Projected"
            />
          </LineChart>
        </ResponsiveContainer>

        {/* AI Analysis */}
        <div className="flex items-start gap-3">
          <div className="flex-1">
            {aiAnalysis && (
              <div className="p-3 rounded-xl bg-fp-card border border-fp-border text-xs text-fp-text-2 leading-relaxed whitespace-pre-wrap">
                {aiAnalysis}
              </div>
            )}
          </div>
          <Button
            size="sm"
            variant="secondary"
            loading={aiLoading}
            onClick={getAIAnalysis}
            icon="🤖"
          >
            AI Advice
          </Button>
        </div>

        <Button variant="secondary" onClick={onClose} className="w-full">
          Close
        </Button>
      </div>
    </Modal>
  );
}
