import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Area,
  AreaChart,
} from "recharts";
import {
  Card,
  Button,
  Modal,
  Input,
  Select,
  SectionHeader,
  EmptyState,
  ChangeChip,
  DataSourceTag,
  Badge,
} from "@/components/Common/UI";
import { useStore } from "@/store";
import {
  formatINR,
  formatINRCompact,
  formatDate,
  formatPercent,
  calcPortfolioSummary,
  getChangeColor,
} from "@/utils";
import toast from "react-hot-toast";

const ASSET_TYPES = [
  { value: "stock", label: "📈 Stock" },
  { value: "mutual_fund", label: "🏦 Mutual Fund" },
  { value: "crypto", label: "₿ Crypto" },
  { value: "etf", label: "📊 ETF" },
  { value: "fd", label: "🔒 Fixed Deposit" },
  { value: "commodity", label: "🥇 Commodity" },
  { value: "other", label: "📦 Other" },
];

const EXCHANGES = ["NSE", "BSE", "NYSE", "NASDAQ", "Other"];

export default function PortfolioPage() {
  const { holdings, setHoldings, prices, setPrices } = useStore();
  const [portfolio, setPortfolio] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editHolding, setEditHolding] = useState<any>(null);
  const [manualPriceHolding, setManualPriceHolding] = useState<any>(null);
  const [sortBy, setSortBy] = useState<"value" | "gain" | "name">("value");
  const [filterType, setFilterType] = useState("all");

  useEffect(() => {
    loadPortfolio();
  }, []);

  async function loadPortfolio() {
    setLoading(true);
    try {
      const [hlds, pricesAll] = await Promise.all([
        window.api.holdings.getAll(),
        window.api.prices.getAll(),
      ]);
      setHoldings(hlds as any);
      const priceMap: Record<string, any> = {};
      for (const p of pricesAll as any[]) priceMap[p.symbol] = p;
      setPrices(priceMap);
      setPortfolio(calcPortfolioSummary(hlds as any, priceMap));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function refreshPrices() {
    setRefreshing(true);
    try {
      const updated = await window.api.prices.refreshAll();
      const current = { ...prices, ...updated };
      setPrices(current);
      setPortfolio(calcPortfolioSummary(holdings, current));
      toast.success("Prices refreshed!");
    } catch (e: any) {
      toast.error("Refresh failed: " + e.message);
    } finally {
      setRefreshing(false);
    }
  }

  const enrichedHoldings = portfolio?.holdings || [];
  const filteredHoldings = enrichedHoldings.filter(
    (h: any) => filterType === "all" || h.asset_type === filterType,
  );
  const sortedHoldings = [...filteredHoldings].sort((a: any, b: any) => {
    if (sortBy === "value")
      return (b.current_value || 0) - (a.current_value || 0);
    if (sortBy === "gain")
      return (b.gain_loss_pct || 0) - (a.gain_loss_pct || 0);
    return a.symbol.localeCompare(b.symbol);
  });

  return (
    <div className="h-full overflow-y-auto p-5">
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-fp-text">Portfolio</h1>
            <p className="text-xs text-fp-text-3 mt-0.5">
              {holdings.length} holdings
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={refreshPrices}
              loading={refreshing}
              icon="↻"
            >
              Refresh Prices
            </Button>
            <Button size="sm" icon="+" onClick={() => setShowAddModal(true)}>
              Add Holding
            </Button>
          </div>
        </div>

        {/* Trust Layer - Data Sources */}
        {holdings.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-fp-text-3">Data sources:</span>
            {Array.from(
              new Set(Object.values(prices).map((p: any) => p.source)),
            ).map((src: any) => (
              <DataSourceTag key={src} source={src} />
            ))}
            <span className="text-xs text-fp-text-3 ml-auto">
              ℹ Prices may be delayed. Always verify before trading.
            </span>
          </div>
        )}

        {/* Summary Cards */}
        {portfolio && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-3">
              <div className="text-xs text-fp-text-3 mb-1">Portfolio Value</div>
              <div className="text-xl font-bold text-fp-text">
                {formatINRCompact(portfolio.totalValue)}
              </div>
            </Card>
            <Card className="p-3">
              <div className="text-xs text-fp-text-3 mb-1">Total Invested</div>
              <div className="text-xl font-bold text-fp-text">
                {formatINRCompact(portfolio.totalCostBasis)}
              </div>
            </Card>
            <Card className="p-3">
              <div className="text-xs text-fp-text-3 mb-1">Total Gain/Loss</div>
              <div
                className="text-xl font-bold"
                style={{ color: getChangeColor(portfolio.totalGainLoss) }}
              >
                {portfolio.totalGainLoss >= 0 ? "+" : ""}
                {formatINRCompact(portfolio.totalGainLoss)}
              </div>
            </Card>
            <Card className="p-3">
              <div className="text-xs text-fp-text-3 mb-1">Overall Return</div>
              <div className="flex items-center gap-2">
                <div
                  className="text-xl font-bold"
                  style={{ color: getChangeColor(portfolio.totalGainLossPct) }}
                >
                  {formatPercent(portfolio.totalGainLossPct)}
                </div>
                <ChangeChip value={portfolio.totalGainLossPct} />
              </div>
            </Card>
          </div>
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Allocation Donut */}
          <Card className="lg:col-span-2">
            <SectionHeader title="Allocation" subtitle="By asset type" />
            {portfolio && portfolio.allocation.length > 0 ? (
              <div className="flex items-center gap-3">
                <ResponsiveContainer width={130} height={130}>
                  <PieChart>
                    <Pie
                      data={portfolio.allocation}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={60}
                      dataKey="value"
                      paddingAngle={2}
                    >
                      {portfolio.allocation.map((e: any, i: number) => (
                        <Cell key={i} fill={e.color} />
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
                <div className="flex-1 space-y-2">
                  {portfolio.allocation.map((a: any) => (
                    <div key={a.name} className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: a.color }}
                      />
                      <span className="text-xs text-fp-text-2 flex-1 capitalize">
                        {a.name.toLowerCase()}
                      </span>
                      <span className="text-xs font-mono text-fp-text">
                        {a.percentage.toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState
                icon="📊"
                title="No holdings"
                description="Add your first holding to see allocation"
              />
            )}
          </Card>

          {/* Holdings Bar Chart */}
          <Card className="lg:col-span-3">
            <SectionHeader
              title="Holdings Performance"
              subtitle="Gain/Loss %"
            />
            {sortedHoldings.length > 0 ? (
              <ResponsiveContainer width="100%" height={150}>
                <AreaChart
                  data={sortedHoldings.slice(0, 8).map((h: any) => ({
                    name: h.symbol,
                    value: h.gain_loss_pct || 0,
                    gain: h.gain_loss_pct > 0 ? h.gain_loss_pct : 0,
                    loss: h.gain_loss_pct < 0 ? h.gain_loss_pct : 0,
                  }))}
                >
                  <defs>
                    <linearGradient id="gainGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10D9A0" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10D9A0" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    stroke="#1E2D4A"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#4A5A7A", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) => `${v.toFixed(0)}%`}
                    tick={{ fill: "#4A5A7A", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(v: any) => [
                      `${Number(v).toFixed(2)}%`,
                      "Return",
                    ]}
                    contentStyle={{
                      background: "#141E35",
                      border: "1px solid #1E2D4A",
                      borderRadius: 8,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#10D9A0"
                    fill="url(#gainGrad)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                icon="📈"
                title="No data"
                description="Holdings performance will appear here"
              />
            )}
          </Card>
        </div>

        {/* Holdings Table */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <SectionHeader
              title="Holdings"
              subtitle={`${sortedHoldings.length} positions`}
            />
            <div className="flex items-center gap-2">
              {/* Filter by type */}
              <div className="flex gap-1">
                {["all", "stock", "mutual_fund", "crypto"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilterType(t)}
                    className={`px-2 py-0.5 rounded text-xs transition-all ${filterType === t ? "bg-fp-primary/15 text-fp-primary" : "text-fp-text-3 hover:text-fp-text"}`}
                  >
                    {t === "all"
                      ? "All"
                      : t === "mutual_fund"
                        ? "MF"
                        : t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-fp-card border border-fp-border rounded-lg px-2 py-1 text-xs text-fp-text focus:outline-none"
              >
                <option value="value">By Value</option>
                <option value="gain">By Return</option>
                <option value="name">By Name</option>
              </select>
            </div>
          </div>

          {sortedHoldings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-fp-text-3 border-b border-fp-border/40">
                    <th className="text-left pb-2 pr-4">Symbol</th>
                    <th className="text-right pb-2 pr-4">Qty</th>
                    <th className="text-right pb-2 pr-4">Buy Price</th>
                    <th className="text-right pb-2 pr-4">
                      Current Price
                      <span className="text-[9px] text-fp-text-3 ml-1">
                        (may be delayed)
                      </span>
                    </th>
                    <th className="text-right pb-2 pr-4">Current Value</th>
                    <th className="text-right pb-2 pr-4">Gain/Loss</th>
                    <th className="text-right pb-2">Return</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-fp-border/20">
                  {sortedHoldings.map((h: any) => (
                    <HoldingRow
                      key={h.id}
                      holding={h}
                      onEdit={() => setEditHolding(h)}
                      onDelete={async () => {
                        if (!confirm(`Remove ${h.symbol}?`)) return;
                        await window.api.holdings.delete(h.id);
                        toast.success("Holding removed");
                        loadPortfolio();
                      }}
                      onSetManualPrice={() => setManualPriceHolding(h)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon="📈"
              title="No holdings yet"
              description="Add your stocks, mutual funds, or crypto to track portfolio performance"
              action={
                <Button size="sm" onClick={() => setShowAddModal(true)}>
                  + Add Holding
                </Button>
              }
            />
          )}
        </Card>
      </div>

      {/* Modals */}
      <AddHoldingModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={() => {
          setShowAddModal(false);
          loadPortfolio();
        }}
      />

      {editHolding && (
        <AddHoldingModal
          isOpen={true}
          holding={editHolding}
          onClose={() => setEditHolding(null)}
          onSave={() => {
            setEditHolding(null);
            loadPortfolio();
          }}
        />
      )}

      {manualPriceHolding && (
        <ManualPriceModal
          holding={manualPriceHolding}
          onClose={() => setManualPriceHolding(null)}
          onSave={() => {
            setManualPriceHolding(null);
            loadPortfolio();
          }}
        />
      )}
    </div>
  );
}

// ─── Holding Row ──────────────────────────────────────────────────
function HoldingRow({ holding: h, onEdit, onDelete, onSetManualPrice }: any) {
  const isPos = (h.gain_loss || 0) >= 0;
  const priceUnavailable = h.current_price === null;

  return (
    <tr className="group hover:bg-fp-card/50 transition-all">
      <td className="py-2.5 pr-4">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
            style={{ background: "rgba(61,127,255,0.1)" }}
          >
            {h.asset_type === "crypto"
              ? "₿"
              : h.asset_type === "mutual_fund"
                ? "🏦"
                : "📈"}
          </div>
          <div>
            <div className="font-semibold text-fp-text">{h.symbol}</div>
            <div className="text-[10px] text-fp-text-3 capitalize">
              {h.asset_type?.replace("_", " ")}
            </div>
          </div>
        </div>
      </td>
      <td className="py-2.5 pr-4 text-right font-mono text-fp-text">
        {h.quantity}
      </td>
      <td className="py-2.5 pr-4 text-right font-mono text-fp-text">
        {formatINR(h.buy_price)}
      </td>
      <td className="py-2.5 pr-4 text-right">
        {priceUnavailable ? (
          <div className="flex items-center justify-end gap-1">
            <span className="text-fp-text-3 text-[10px]">Unavailable</span>
            <button
              onClick={onSetManualPrice}
              className="text-fp-primary text-[10px] hover:underline"
            >
              Set manually
            </button>
          </div>
        ) : (
          <div>
            <div className="font-mono text-fp-text">
              {formatINR(h.current_price)}
            </div>
            {h.is_price_manual && (
              <div className="text-[9px] text-fp-text-3">✎ Manual</div>
            )}
            {!h.is_price_manual && (
              <DataSourceTag
                source={h.price_source || "api"}
                updatedAt={h.price_updated}
              />
            )}
          </div>
        )}
      </td>
      <td className="py-2.5 pr-4 text-right font-mono">
        <span className={priceUnavailable ? "text-fp-text-3" : "text-fp-text"}>
          {formatINR(h.current_value || 0)}
        </span>
        {priceUnavailable && (
          <div className="text-[9px] text-fp-warning">Using buy price</div>
        )}
      </td>
      <td
        className="py-2.5 pr-4 text-right font-mono"
        style={{ color: isPos ? "#10D9A0" : "#FF4D6B" }}
      >
        {isPos ? "+" : ""}
        {formatINR(h.gain_loss || 0)}
      </td>
      <td className="py-2.5 text-right">
        <ChangeChip value={h.gain_loss_pct || 0} />
      </td>
      <td className="py-2.5">
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
          <button
            onClick={onEdit}
            className="w-6 h-6 rounded text-fp-text-3 hover:text-fp-text hover:bg-fp-muted flex items-center justify-center text-xs"
          >
            ✎
          </button>
          <button
            onClick={onSetManualPrice}
            className="w-6 h-6 rounded text-fp-text-3 hover:text-fp-primary hover:bg-fp-primary/10 flex items-center justify-center text-xs"
            title="Set manual price"
          >
            ₹
          </button>
          <button
            onClick={onDelete}
            className="w-6 h-6 rounded text-fp-text-3 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center text-xs"
          >
            ✕
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Add/Edit Holding Modal ───────────────────────────────────────
function AddHoldingModal({ isOpen, onClose, onSave, holding }: any) {
  const isEdit = !!holding;
  const [form, setForm] = useState({
    symbol: holding?.symbol || "",
    name: holding?.name || "",
    quantity: holding?.quantity || "",
    buy_price: holding?.buy_price || "",
    buy_date: holding?.buy_date || new Date().toISOString().split("T")[0],
    asset_type: holding?.asset_type || "stock",
    broker: holding?.broker || "",
    exchange: holding?.exchange || "NSE",
    notes: holding?.notes || "",
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!form.symbol || !form.quantity || !form.buy_price)
      return toast.error("Symbol, quantity, and price are required");
    setSaving(true);
    try {
      if (isEdit) {
        await window.api.holdings.update(holding.id, {
          ...form,
          quantity: parseFloat(String(form.quantity)),
          buy_price: parseFloat(String(form.buy_price)),
        });
        toast.success("Holding updated!");
      } else {
        await window.api.holdings.create({
          ...form,
          quantity: parseFloat(String(form.quantity)),
          buy_price: parseFloat(String(form.buy_price)),
        });
        toast.success("Holding added!");
      }
      onSave();
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const f = (k: string) => (v: string) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Edit ${holding.symbol}` : "Add Holding"}
      size="md"
    >
      <div className="space-y-3">
        <Select
          label="Asset Type"
          value={form.asset_type}
          onChange={f("asset_type")}
          options={ASSET_TYPES}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Symbol / Ticker"
            value={form.symbol}
            onChange={(v) =>
              setForm((p) => ({ ...p, symbol: v.toUpperCase() }))
            }
            placeholder="e.g. TCS, BTC"
            required
          />
          <Input
            label="Name (optional)"
            value={form.name}
            onChange={f("name")}
            placeholder="Company name"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Quantity"
            value={String(form.quantity)}
            onChange={f("quantity")}
            type="number"
            placeholder="0"
            required
            min="0"
            step="0.001"
          />
          <Input
            label="Buy Price"
            value={String(form.buy_price)}
            onChange={f("buy_price")}
            type="number"
            prefix="₹"
            placeholder="0"
            required
            min="0"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Buy Date"
            value={form.buy_date}
            onChange={f("buy_date")}
            type="date"
          />
          <Select
            label="Exchange"
            value={form.exchange}
            onChange={f("exchange")}
            options={EXCHANGES.map((e) => ({ value: e, label: e }))}
          />
        </div>
        <Input
          label="Broker (optional)"
          value={form.broker}
          onChange={f("broker")}
          placeholder="e.g. Zerodha"
        />
        <Input
          label="Notes (optional)"
          value={form.notes}
          onChange={f("notes")}
        />

        <div className="p-2 rounded-lg bg-fp-card border border-fp-border text-xs text-fp-text-3">
          ℹ Prices are fetched automatically. If unavailable, you can set them
          manually.
        </div>

        <div className="flex gap-2 pt-1">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSave} loading={saving} className="flex-1">
            {isEdit ? "Update" : "Add Holding"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Manual Price Modal (Trust Layer) ───────────────────────────
function ManualPriceModal({ holding, onClose, onSave }: any) {
  const [price, setPrice] = useState(
    String(holding.current_price || holding.buy_price),
  );
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!price || parseFloat(price) <= 0)
      return toast.error("Enter a valid price");
    setSaving(true);
    try {
      await window.api.prices.setManual(
        holding.symbol,
        parseFloat(price),
        note || "User entered",
      );
      toast.success("Manual price set!");
      onSave();
    } catch {
      toast.error("Failed to set price");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Set Price: ${holding.symbol}`}
      size="sm"
    >
      <div className="space-y-4">
        <div className="p-3 rounded-lg bg-fp-warning/10 border border-fp-warning/20 text-xs text-fp-warning">
          ⚠ Setting manual price overrides automatic price fetching. This data
          will be marked as manually entered.
        </div>
        <Input
          label="Current Market Price"
          value={price}
          onChange={setPrice}
          type="number"
          prefix="₹"
          placeholder="Enter current price"
        />
        <Input
          label="Note (reason for manual entry)"
          value={note}
          onChange={setNote}
          placeholder="e.g. API unavailable, delisted stock"
        />
        <div className="p-2 rounded-lg bg-fp-card border border-fp-border text-xs text-fp-text-3">
          Last auto-fetched price:{" "}
          <span className="text-fp-text">
            {holding.current_price
              ? formatINR(holding.current_price)
              : "Not available"}
          </span>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSave} loading={saving} className="flex-1">
            Set Price
          </Button>
        </div>
      </div>
    </Modal>
  );
}
