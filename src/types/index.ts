// ─── Core Domain Types ─────────────────────────────────────────────────────

export interface Account {
  id: string;
  name: string;
  type: "checking" | "savings" | "investment" | "credit" | "other";
  balance: number;
  currency: string;
  institution?: string;
  is_active: number;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  type: "income" | "expense" | "investment";
  color: string;
  icon: string;
  is_custom: number;
  parent_id?: string;
  sort_order: number;
}

export interface Transaction {
  id: string;
  account_id?: string;
  date: string;
  description: string;
  category_id?: string;
  category_name?: string;
  category_color?: string;
  category_icon?: string;
  amount: number;
  type: "income" | "expense" | "transfer";
  notes?: string;
  merchant?: string;
  attachment_path?: string;
  is_recurring: number;
  source: "manual" | "csv_import" | "excel_import" | "pdf_import";
  created_at: string;
}

export interface Budget {
  id: string;
  category_id: string;
  category_name?: string;
  color?: string;
  icon?: string;
  month: string; // YYYY-MM format
  amount: number;
  spent?: number;
}

export interface Holding {
  id: string;
  symbol: string;
  name?: string;
  quantity: number;
  buy_price: number;
  buy_date: string;
  asset_type:
    | "stock"
    | "mutual_fund"
    | "crypto"
    | "etf"
    | "commodity"
    | "fd"
    | "other";
  broker?: string;
  exchange?: string;
  notes?: string;
  is_active: number;
  created_at: string;
}

export interface PriceCache {
  symbol: string;
  price: number | null;
  change_percent: number | null;
  previous_close: number | null;
  market_cap?: number;
  volume?: number;
  source: string;
  last_updated: string;
  is_manual: number;
  manual_note?: string;
}

export interface HoldingWithPrice extends Holding {
  current_price?: number | null;
  current_value?: number;
  cost_basis?: number;
  gain_loss?: number;
  gain_loss_pct?: number;
  price_source?: string;
  price_updated?: string;
  is_price_manual?: boolean;
}

export interface Goal {
  id: string;
  name: string;
  description?: string;
  target_amount: number;
  current_amount: number;
  target_date?: string;
  category: string;
  icon: string;
  color: string;
  is_active: number;
  priority: number;
  progress_pct?: number;
  created_at: string;
}

export interface Milestone {
  id: string;
  type: string;
  value: number;
  title: string;
  message?: string;
  celebrated: number;
  achieved_at: string;
}

export interface Insight {
  id: string;
  type: string;
  title: string;
  content: string;
  priority: "high" | "medium" | "low";
  category: string;
  action_label?: string;
  action_data?: string;
  is_dismissed: number;
  is_read: number;
  expires_at?: string;
  created_at: string;
}

export interface NewsItem {
  id: string;
  title: string;
  summary?: string;
  source: string;
  url: string;
  publishedAt: string;
  imageUrl?: string;
  sentiment: "positive" | "negative" | "neutral";
}

export interface FinancialHealthScore {
  score: number;
  savingsRate: number;
  expenseRatio: number;
  income: number;
  expenses: number;
  savings: number;
}

export interface WeeklyStory {
  id: string;
  week_start: string;
  story: string;
  highlights?: string;
  mood: "positive" | "negative" | "neutral";
  created_at: string;
}

// ─── Chart / Analytics Types ───────────────────────────────────────────────

export interface MonthlySummary {
  month: string;
  income: number;
  expense: number;
  savings?: number;
}

export interface CategoryBreakdown {
  id: string;
  name: string;
  color: string;
  icon: string;
  total: number;
  count: number;
  percentage?: number;
}

export interface DailySpending {
  date: string;
  total: number;
}

export interface PortfolioSummary {
  totalValue: number;
  totalCostBasis: number;
  totalGainLoss: number;
  totalGainLossPct: number;
  allocation: AllocationItem[];
}

export interface AllocationItem {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

// ─── UI / Store Types ──────────────────────────────────────────────────────

export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

export type Theme = "dark" | "light";
export type Currency = "INR" | "USD" | "EUR" | "GBP";

export interface AppSettings {
  currency: Currency;
  theme: Theme;
  priceRefreshInterval: number;
  onboardingComplete: boolean;
  dashboardLayout: string;
}

// ─── Onboarding Types ─────────────────────────────────────────────────────

export type OnboardingStep =
  | "welcome"
  | "what_to_track"
  | "import_or_fresh"
  | "set_goals"
  | "choose_layout"
  | "done";

export interface OnboardingData {
  trackingGoals: string[];
  startFresh: boolean;
  initialGoals: Partial<Goal>[];
  dashboardLayout: string;
}

// ─── Data Source Trust Types ───────────────────────────────────────────────

export type DataFreshness =
  | "realtime"
  | "delayed_15min"
  | "stale"
  | "manual"
  | "unavailable"
  | "demo";

export interface DataSource {
  name: string;
  freshness: DataFreshness;
  lastUpdated?: string;
  note?: string;
}
