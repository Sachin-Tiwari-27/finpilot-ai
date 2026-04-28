import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  Card,
  Button,
  Modal,
  Input,
  Select,
  SectionHeader,
  EmptyState,
  Badge,
  Skeleton,
} from "@/components/Common/UI";
import { useStore } from "@/store";
import {
  formatINR,
  formatINRCompact,
  formatDate,
  getMonthRange,
  getCurrentMonth,
} from "@/utils";
import toast from "react-hot-toast";

export default function TransactionsPage() {
  const { categories, setTransactions } = useStore();
  const [transactions, setLocalTx] = useState<any[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<any[]>([]);
  const [dailySpending, setDailySpending] = useState<any[]>([]);
  const [monthlySummary, setMonthlySummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterCategory, setFilterCategory] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedTx, setSelectedTx] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [selectedMonth, filterType, filterCategory]);

  async function loadData() {
    setLoading(true);
    const api = window.api;
    const { startDate, endDate } = getMonthRange(selectedMonth);
    try {
      const filters: any = { startDate, endDate };
      if (filterType !== "all") filters.type = filterType;
      if (filterCategory) filters.categoryId = filterCategory;
      if (search) filters.search = search;

      const [txs, cats, daily, summary] = await Promise.all([
        api.transactions.getAll(filters),
        api.transactions.getCategoryBreakdown(startDate, endDate, "expense"),
        api.transactions.getDailySpending(startDate, endDate),
        api.transactions.getSummary(startDate, endDate),
      ]);

      const total = (cats as any[]).reduce((s, c) => s + c.total, 0);
      setLocalTx(txs as any[]);
      setCategoryBreakdown(
        (cats as any[]).map((c) => ({
          ...c,
          percentage: total > 0 ? (c.total / total) * 100 : 0,
        })),
      );
      setDailySpending(daily as any[]);
      setMonthlySummary(summary);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const expenseCats = categories.filter((c) => c.type === "expense");
  const incomeCats = categories.filter((c) => c.type === "income");

  // Generate month options
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return {
      value: val,
      label: d.toLocaleString("default", { month: "long", year: "numeric" }),
    };
  });

  return (
    <div className="h-full overflow-y-auto p-5">
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-fp-text">Transactions</h1>
            <p className="text-xs text-fp-text-3 mt-0.5">
              {transactions.length} transactions
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon="↓"
              onClick={() => setShowImportModal(true)}
            >
              Import
            </Button>
            <Button size="sm" icon="+" onClick={() => setShowAddModal(true)}>
              Add
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="p-3">
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-fp-card border border-fp-border rounded-lg px-3 py-1.5 text-xs text-fp-text focus:outline-none focus:border-fp-primary/50"
            >
              {monthOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1">
              {["all", "expense", "income"].map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${filterType === t ? "bg-fp-primary/15 text-fp-primary" : "text-fp-text-3 hover:text-fp-text"}`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-fp-card border border-fp-border rounded-lg px-3 py-1.5 text-xs text-fp-text focus:outline-none focus:border-fp-primary/50"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadData()}
              placeholder="Search..."
              className="bg-fp-card border border-fp-border rounded-lg px-3 py-1.5 text-xs text-fp-text placeholder:text-fp-text-3 focus:outline-none focus:border-fp-primary/50 flex-1 min-w-32"
            />
            <Button size="sm" variant="ghost" onClick={loadData}>
              Search
            </Button>
          </div>
        </Card>

        {/* Summary Row */}
        {monthlySummary && (
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-3">
              <div className="text-xs text-fp-text-3">Income</div>
              <div className="text-xl font-bold text-fp-primary">
                {formatINRCompact(monthlySummary.total_income || 0)}
              </div>
            </Card>
            <Card className="p-3">
              <div className="text-xs text-fp-text-3">Expenses</div>
              <div className="text-xl font-bold text-red-400">
                {formatINRCompact(monthlySummary.total_expense || 0)}
              </div>
            </Card>
            <Card className="p-3">
              <div className="text-xs text-fp-text-3">Savings</div>
              <div
                className={`text-xl font-bold ${(monthlySummary.total_income || 0) - (monthlySummary.total_expense || 0) >= 0 ? "text-fp-primary" : "text-red-400"}`}
              >
                {formatINRCompact(
                  (monthlySummary.total_income || 0) -
                    (monthlySummary.total_expense || 0),
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Spending Heatmap */}
          <Card className="lg:col-span-3">
            <SectionHeader
              title="Spending Heatmap"
              subtitle="Daily expense intensity"
            />
            <SpendingHeatmap data={dailySpending} month={selectedMonth} />
          </Card>

          {/* Category Breakdown */}
          <Card className="lg:col-span-2">
            <SectionHeader
              title="Top Categories"
              subtitle="Expense breakdown"
            />
            {categoryBreakdown.length > 0 ? (
              <div className="space-y-2.5">
                {categoryBreakdown.slice(0, 6).map((cat) => (
                  <div
                    key={cat.id}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setFilterCategory(cat.id)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{cat.icon}</span>
                        <span className="text-xs text-fp-text-2">
                          {cat.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-fp-text-3">
                          {cat.percentage.toFixed(0)}%
                        </span>
                        <span className="text-xs font-medium text-fp-text">
                          {formatINRCompact(cat.total)}
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-fp-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${cat.percentage}%`,
                          backgroundColor: cat.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon="📊"
                title="No expenses"
                description="Add expense transactions"
              />
            )}
          </Card>
        </div>

        {/* Transaction Table */}
        <Card>
          <SectionHeader
            title="Transactions"
            subtitle={`${transactions.length} records`}
            action={
              <span className="text-xs text-fp-text-3">Click to edit</span>
            }
          />
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-3 p-2">
                  <Skeleton className="w-8 h-8 rounded-lg" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-3 w-48" />
                    <Skeleton className="h-2 w-24" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : transactions.length > 0 ? (
            <div className="space-y-0.5 max-h-96 overflow-y-auto">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  onClick={() => setSelectedTx(tx)}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-fp-card cursor-pointer transition-all group"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm"
                    style={{
                      backgroundColor: `${tx.category_color || "#3D7FFF"}20`,
                    }}
                  >
                    {tx.category_icon || "💰"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-fp-text truncate">
                      {tx.description}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-fp-text-3">
                        {formatDate(tx.date)}
                      </span>
                      {tx.category_name && (
                        <Badge color={tx.category_color}>
                          {tx.category_name}
                        </Badge>
                      )}
                      {tx.source !== "manual" && (
                        <span className="text-[10px] text-fp-text-3">
                          {tx.source}
                        </span>
                      )}
                    </div>
                  </div>
                  <div
                    className={`text-sm font-semibold flex-shrink-0 ${tx.type === "income" ? "text-fp-primary" : "text-red-400"}`}
                  >
                    {tx.type === "income" ? "+" : "-"}
                    {formatINR(tx.amount)}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTx(tx.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded flex items-center justify-center text-fp-text-3 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon="💸"
              title="No transactions found"
              description="Add a transaction or import from CSV/Excel"
              action={
                <Button size="sm" onClick={() => setShowAddModal(true)}>
                  + Add Transaction
                </Button>
              }
            />
          )}
        </Card>
      </div>

      {/* Add Transaction Modal */}
      <AddTransactionModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={() => {
          setShowAddModal(false);
          loadData();
        }}
        categories={categories}
      />

      {/* Edit/View Modal */}
      {selectedTx && (
        <EditTransactionModal
          tx={selectedTx}
          onClose={() => setSelectedTx(null)}
          onSave={() => {
            setSelectedTx(null);
            loadData();
          }}
          categories={categories}
        />
      )}

      {/* Import Modal */}
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={() => {
          setShowImportModal(false);
          loadData();
        }}
        categories={categories}
      />
    </div>
  );

  async function handleDeleteTx(id: string) {
    if (!confirm("Delete this transaction?")) return;
    await window.api.transactions.delete(id);
    toast.success("Transaction deleted");
    loadData();
  }
}

// ─── Spending Heatmap ─────────────────────────────────────────────
function SpendingHeatmap({ data, month }: { data: any[]; month: string }) {
  const [year, monthNum] = month.split("-").map(Number);
  const daysInMonth = new Date(year, monthNum, 0).getDate();
  const firstDay = new Date(year, monthNum - 1, 1).getDay();
  const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;

  const spendingMap: Record<string, number> = {};
  for (const d of data) spendingMap[d.date] = d.total;
  const maxSpend = Math.max(...Object.values(spendingMap), 1);

  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const dateStr = `${month}-${String(day).padStart(2, "0")}`;
    return { day, dateStr, amount: spendingMap[dateStr] || 0 };
  });

  const [tooltip, setTooltip] = useState<{
    day: any;
    x: number;
    y: number;
  } | null>(null);

  return (
    <div>
      <div className="flex gap-1 mb-2">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="flex-1 text-center text-[9px] text-fp-text-3">
            {d}
          </div>
        ))}
      </div>
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: "repeat(7, 1fr)" }}
      >
        {Array.from({ length: adjustedFirstDay }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {days.map((day) => {
          const intensity = day.amount / maxSpend;
          return (
            <div
              key={day.day}
              className="aspect-square rounded flex items-center justify-center text-[9px] cursor-pointer transition-all hover:scale-110 relative"
              style={{
                backgroundColor:
                  day.amount > 0
                    ? `rgba(255, 77, 107, ${0.15 + intensity * 0.75})`
                    : "#1E2D4A40",
                color: intensity > 0.5 ? "#fff" : "#4A5A7A",
              }}
              onMouseEnter={(e) =>
                setTooltip({ day, x: e.clientX, y: e.clientY })
              }
              onMouseLeave={() => setTooltip(null)}
            >
              {day.day}
            </div>
          );
        })}
      </div>
      {/* Legend */}
      <div className="flex items-center gap-2 mt-2 justify-end">
        <span className="text-[10px] text-fp-text-3">Low</span>
        {[0.15, 0.35, 0.55, 0.75, 0.9].map((o) => (
          <div
            key={o}
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: `rgba(255, 77, 107, ${o})` }}
          />
        ))}
        <span className="text-[10px] text-fp-text-3">High</span>
      </div>

      {tooltip && (
        <div
          className="fixed z-50 bg-fp-card border border-fp-border rounded-lg px-3 py-2 text-xs shadow-xl pointer-events-none"
          style={{ left: tooltip.x + 10, top: tooltip.y - 40 }}
        >
          <div className="font-medium text-fp-text">
            {formatDate(tooltip.day.dateStr)}
          </div>
          <div className="text-fp-primary">
            {tooltip.day.amount > 0
              ? formatINR(tooltip.day.amount)
              : "No spending"}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Add Transaction Modal ────────────────────────────────────────
function AddTransactionModal({ isOpen, onClose, onSave, categories }: any) {
  const [form, setForm] = useState({
    description: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    type: "expense",
    category_id: "",
    notes: "",
    merchant: "",
  });
  const [saving, setSaving] = useState(false);

  const relevantCats = categories.filter((c: any) => c.type === form.type);

  async function handleSave() {
    if (!form.description || !form.amount)
      return toast.error("Description and amount are required");
    setSaving(true);
    try {
      await window.api.transactions.create({
        ...form,
        amount: parseFloat(form.amount),
        category_id: form.category_id || null,
      });
      toast.success("Transaction added!");
      setForm({
        description: "",
        amount: "",
        date: new Date().toISOString().split("T")[0],
        type: "expense",
        category_id: "",
        notes: "",
        merchant: "",
      });
      onSave();
    } catch (e) {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Transaction" size="md">
      <div className="space-y-3">
        <div className="flex gap-2">
          {["expense", "income"].map((t) => (
            <button
              key={t}
              onClick={() =>
                setForm((f) => ({ ...f, type: t, category_id: "" }))
              }
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                form.type === t
                  ? t === "expense"
                    ? "bg-red-500/20 text-red-400 border border-red-500/30"
                    : "bg-fp-primary/20 text-fp-primary border border-fp-primary/30"
                  : "bg-fp-card text-fp-text-3 border border-fp-border"
              }`}
            >
              {t === "expense" ? "💸 Expense" : "💰 Income"}
            </button>
          ))}
        </div>
        <Input
          label="Description"
          value={form.description}
          onChange={(v) => setForm((f) => ({ ...f, description: v }))}
          placeholder="e.g. Swiggy order"
          required
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Amount"
            value={form.amount}
            onChange={(v) => setForm((f) => ({ ...f, amount: v }))}
            type="number"
            prefix="₹"
            placeholder="0"
            required
          />
          <Input
            label="Date"
            value={form.date}
            onChange={(v) => setForm((f) => ({ ...f, date: v }))}
            type="date"
          />
        </div>
        <Select
          label="Category"
          value={form.category_id}
          onChange={(v) => setForm((f) => ({ ...f, category_id: v }))}
          options={[
            { value: "", label: "Select category..." },
            ...relevantCats.map((c: any) => ({
              value: c.id,
              label: `${c.icon} ${c.name}`,
            })),
          ]}
        />
        <Input
          label="Merchant (optional)"
          value={form.merchant}
          onChange={(v) => setForm((f) => ({ ...f, merchant: v }))}
          placeholder="e.g. Swiggy"
        />
        <Input
          label="Notes (optional)"
          value={form.notes}
          onChange={(v) => setForm((f) => ({ ...f, notes: v }))}
          placeholder="Any notes..."
        />
        <div className="flex gap-2 pt-1">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSave} loading={saving} className="flex-1">
            Save Transaction
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Edit Transaction Modal ───────────────────────────────────────
function EditTransactionModal({ tx, onClose, onSave, categories }: any) {
  const [form, setForm] = useState({ ...tx });
  const [saving, setSaving] = useState(false);
  const relevantCats = categories.filter((c: any) => c.type === form.type);

  async function handleSave() {
    setSaving(true);
    try {
      await window.api.transactions.update(tx.id, {
        ...form,
        amount: parseFloat(String(form.amount)),
      });
      toast.success("Transaction updated!");
      onSave();
    } catch {
      toast.error("Failed to update");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={true} onClose={onClose} title="Edit Transaction" size="md">
      <div className="space-y-3">
        <Input
          label="Description"
          value={form.description}
          onChange={(v) => setForm((f: any) => ({ ...f, description: v }))}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Amount"
            value={form.amount}
            onChange={(v) => setForm((f: any) => ({ ...f, amount: v }))}
            type="number"
            prefix="₹"
          />
          <Input
            label="Date"
            value={form.date}
            onChange={(v) => setForm((f: any) => ({ ...f, date: v }))}
            type="date"
          />
        </div>
        <Select
          label="Category"
          value={form.category_id || ""}
          onChange={(v) => setForm((f: any) => ({ ...f, category_id: v }))}
          options={[
            { value: "", label: "Uncategorized" },
            ...relevantCats.map((c: any) => ({
              value: c.id,
              label: `${c.icon} ${c.name}`,
            })),
          ]}
        />
        <Input
          label="Notes"
          value={form.notes || ""}
          onChange={(v) => setForm((f: any) => ({ ...f, notes: v }))}
        />
        <div className="flex gap-2 pt-1">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSave} loading={saving} className="flex-1">
            Update
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Import Modal ─────────────────────────────────────────────────
function ImportModal({ isOpen, onClose, onImport, categories }: any) {
  const [step, setStep] = useState<"upload" | "mapping" | "importing">(
    "upload",
  );
  const [filePath, setFilePath] = useState("");
  const [fileType, setFileType] = useState<"csv" | "excel">("csv");
  const [mapping, setMapping] = useState({
    date: "Date",
    description: "Description",
    amount: "Amount",
    type: "",
    merchant: "",
    notes: "",
    defaultCategoryId: "",
  });
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function pickFile() {
    const result = await window.api.dialog.openFile({
      filters: [{ name: "Data Files", extensions: ["csv", "xlsx", "xls"] }],
      properties: ["openFile"],
    });
    if (!result.canceled && result.filePaths[0]) {
      const fp = result.filePaths[0];
      setFilePath(fp);
      setFileType(fp.endsWith(".csv") ? "csv" : "excel");
      setStep("mapping");
    }
  }

  async function handleImport() {
    setImporting(true);
    try {
      const finalMapping = { ...mapping, accountId: null };
      const res =
        fileType === "csv"
          ? await window.api.transactions.importCSV(filePath, finalMapping)
          : await window.api.transactions.importExcel(filePath, finalMapping);
      setResult(res);
      if (res.success) {
        toast.success(`Imported ${res.count} transactions!`);
        onImport();
      } else {
        toast.error(res.error || "Import failed");
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setImporting(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Import Transactions"
      size="lg"
    >
      {step === "upload" && (
        <div className="text-center py-8">
          <div className="text-5xl mb-4">📂</div>
          <h3 className="text-base font-semibold text-fp-text mb-2">
            Select your bank statement
          </h3>
          <p className="text-xs text-fp-text-3 mb-6">
            Supports CSV and Excel (.xlsx) formats from any bank
          </p>
          <Button onClick={pickFile} icon="↑">
            Choose File
          </Button>
          <div className="mt-6 p-3 rounded-xl bg-fp-card border border-fp-border text-left">
            <div className="text-xs font-medium text-fp-text mb-2">
              💡 Common column names
            </div>
            <div className="text-xs text-fp-text-3 space-y-0.5">
              <div>
                Date:{" "}
                <code className="text-fp-primary">
                  Date, Transaction Date, Txn Date
                </code>
              </div>
              <div>
                Description:{" "}
                <code className="text-fp-primary">
                  Description, Narration, Details
                </code>
              </div>
              <div>
                Amount:{" "}
                <code className="text-fp-primary">
                  Amount, Debit, Credit, Transaction Amount
                </code>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === "mapping" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-fp-card border border-fp-border">
            <span className="text-sm">📄</span>
            <span className="text-xs text-fp-text truncate">
              {filePath.split(/[/\\]/).pop()}
            </span>
            <button
              onClick={() => setStep("upload")}
              className="ml-auto text-xs text-fp-text-3 hover:text-fp-text"
            >
              Change
            </button>
          </div>

          <div className="text-xs font-medium text-fp-text-2 mb-2">
            Column Mapping
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Date column"
              value={mapping.date}
              onChange={(v) => setMapping((m) => ({ ...m, date: v }))}
              placeholder="Date"
            />
            <Input
              label="Description column"
              value={mapping.description}
              onChange={(v) => setMapping((m) => ({ ...m, description: v }))}
              placeholder="Description"
            />
            <Input
              label="Amount column"
              value={mapping.amount}
              onChange={(v) => setMapping((m) => ({ ...m, amount: v }))}
              placeholder="Amount"
            />
            <Input
              label="Type column (optional)"
              value={mapping.type}
              onChange={(v) => setMapping((m) => ({ ...m, type: v }))}
              placeholder="Dr/Cr or blank"
            />
          </div>
          <Select
            label="Default Category"
            value={mapping.defaultCategoryId}
            onChange={(v) =>
              setMapping((m) => ({ ...m, defaultCategoryId: v }))
            }
            options={[
              { value: "", label: "Uncategorized" },
              ...categories
                .filter((c: any) => c.type === "expense")
                .map((c: any) => ({
                  value: c.id,
                  label: `${c.icon} ${c.name}`,
                })),
            ]}
          />

          <div className="flex gap-2 pt-2">
            <Button variant="secondary" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              loading={importing}
              className="flex-1"
            >
              Import Now
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
