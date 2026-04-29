import { app, ipcMain, dialog, BrowserWindow, shell } from "electron";
import { join } from "path";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import Database from "better-sqlite3";
import { existsSync, mkdirSync, readFileSync } from "fs";
import { randomUUID } from "crypto";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import axios from "axios";
import __cjs_url__ from "node:url";
import __cjs_path__ from "node:path";
import __cjs_mod__ from "node:module";
const __filename = __cjs_url__.fileURLToPath(import.meta.url);
const __dirname = __cjs_path__.dirname(__filename);
const require2 = __cjs_mod__.createRequire(import.meta.url);
let db;
async function initDatabase() {
  const userDataPath = app.getPath("userData");
  const dbDir = join(userDataPath, "finpilot-db");
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }
  db = new Database(join(dbDir, "finpilot.db"), {
    verbose: process.env.NODE_ENV === "development" ? console.log : void 0
  });
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  createTables();
  seedDefaultData();
  console.log("✅ Database initialized at:", join(dbDir, "finpilot.db"));
}
function createTables() {
  db.exec(`
    -- User settings & onboarding
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Financial accounts
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'checking',
      balance REAL DEFAULT 0,
      currency TEXT DEFAULT 'INR',
      institution TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Expense/income categories
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'expense',
      color TEXT DEFAULT '#10D9A0',
      icon TEXT DEFAULT '💰',
      is_custom INTEGER DEFAULT 0,
      parent_id TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- All transactions
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      account_id TEXT,
      date TEXT NOT NULL,
      description TEXT NOT NULL,
      category_id TEXT,
      amount REAL NOT NULL,
      type TEXT NOT NULL DEFAULT 'expense',
      notes TEXT,
      merchant TEXT,
      attachment_path TEXT,
      is_recurring INTEGER DEFAULT 0,
      source TEXT DEFAULT 'manual',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (account_id) REFERENCES accounts(id),
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);

    -- Monthly budgets
    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL,
      month TEXT NOT NULL,
      amount REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(category_id, month),
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    -- Investment holdings
    CREATE TABLE IF NOT EXISTS holdings (
      id TEXT PRIMARY KEY,
      symbol TEXT NOT NULL,
      name TEXT,
      quantity REAL NOT NULL,
      buy_price REAL NOT NULL,
      buy_date TEXT NOT NULL,
      asset_type TEXT NOT NULL DEFAULT 'stock',
      broker TEXT,
      notes TEXT,
      exchange TEXT DEFAULT 'NSE',
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_holdings_symbol ON holdings(symbol);

    -- Cached market prices
    CREATE TABLE IF NOT EXISTS price_cache (
      symbol TEXT PRIMARY KEY,
      price REAL,
      change_percent REAL,
      previous_close REAL,
      market_cap REAL,
      volume INTEGER,
      source TEXT DEFAULT 'api',
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_manual INTEGER DEFAULT 0,
      manual_note TEXT
    );

    -- Goals
    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      target_amount REAL NOT NULL,
      current_amount REAL DEFAULT 0,
      target_date TEXT,
      category TEXT DEFAULT 'savings',
      icon TEXT DEFAULT '🎯',
      color TEXT DEFAULT '#10D9A0',
      is_active INTEGER DEFAULT 1,
      priority INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Milestones achieved (for delight feature)
    CREATE TABLE IF NOT EXISTS milestones (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      value REAL,
      title TEXT NOT NULL,
      message TEXT,
      celebrated INTEGER DEFAULT 0,
      achieved_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- AI insights cache
    CREATE TABLE IF NOT EXISTS insights (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      priority TEXT DEFAULT 'medium',
      category TEXT DEFAULT 'general',
      action_label TEXT,
      action_data TEXT,
      is_dismissed INTEGER DEFAULT 0,
      is_read INTEGER DEFAULT 0,
      expires_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Weekly AI story (for delight)
    CREATE TABLE IF NOT EXISTS weekly_stories (
      id TEXT PRIMARY KEY,
      week_start TEXT NOT NULL UNIQUE,
      story TEXT NOT NULL,
      highlights TEXT,
      mood TEXT DEFAULT 'neutral',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Price history for portfolio
    CREATE TABLE IF NOT EXISTS price_history (
      id TEXT PRIMARY KEY,
      symbol TEXT NOT NULL,
      date TEXT NOT NULL,
      close_price REAL NOT NULL,
      source TEXT DEFAULT 'api',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(symbol, date)
    );
    CREATE INDEX IF NOT EXISTS idx_price_history_symbol ON price_history(symbol, date);
  `);
}
function seedDefaultData() {
  const count = db.prepare("SELECT COUNT(*) as cnt FROM categories").get();
  if (count.cnt > 0) return;
  const categories = [
    // Expense categories
    {
      id: "cat_groceries",
      name: "Groceries",
      type: "expense",
      color: "#10D9A0",
      icon: "🛒",
      sort_order: 1
    },
    {
      id: "cat_transport",
      name: "Transport",
      type: "expense",
      color: "#3D7FFF",
      icon: "🚗",
      sort_order: 2
    },
    {
      id: "cat_dining",
      name: "Dining Out",
      type: "expense",
      color: "#FFB84D",
      icon: "🍽️",
      sort_order: 3
    },
    {
      id: "cat_entertainment",
      name: "Entertainment",
      type: "expense",
      color: "#B04DFF",
      icon: "🎬",
      sort_order: 4
    },
    {
      id: "cat_shopping",
      name: "Shopping",
      type: "expense",
      color: "#FF4D6B",
      icon: "🛍️",
      sort_order: 5
    },
    {
      id: "cat_utilities",
      name: "Utilities",
      type: "expense",
      color: "#FFB84D",
      icon: "⚡",
      sort_order: 6
    },
    {
      id: "cat_healthcare",
      name: "Healthcare",
      type: "expense",
      color: "#FF6B3D",
      icon: "🏥",
      sort_order: 7
    },
    {
      id: "cat_rent",
      name: "Rent/Housing",
      type: "expense",
      color: "#4DE8FF",
      icon: "🏠",
      sort_order: 8
    },
    {
      id: "cat_education",
      name: "Education",
      type: "expense",
      color: "#10D9A0",
      icon: "📚",
      sort_order: 9
    },
    {
      id: "cat_subscriptions",
      name: "Subscriptions",
      type: "expense",
      color: "#B04DFF",
      icon: "📱",
      sort_order: 10
    },
    {
      id: "cat_insurance",
      name: "Insurance",
      type: "expense",
      color: "#3D7FFF",
      icon: "🛡️",
      sort_order: 11
    },
    {
      id: "cat_travel",
      name: "Travel",
      type: "expense",
      color: "#FF6B3D",
      icon: "✈️",
      sort_order: 12
    },
    {
      id: "cat_other_exp",
      name: "Other",
      type: "expense",
      color: "#8B9DC3",
      icon: "📦",
      sort_order: 99
    },
    // Income categories
    {
      id: "cat_salary",
      name: "Salary",
      type: "income",
      color: "#10D9A0",
      icon: "💼",
      sort_order: 1
    },
    {
      id: "cat_freelance",
      name: "Freelance",
      type: "income",
      color: "#3D7FFF",
      icon: "💻",
      sort_order: 2
    },
    {
      id: "cat_business",
      name: "Business",
      type: "income",
      color: "#FFB84D",
      icon: "🏢",
      sort_order: 3
    },
    {
      id: "cat_investment_inc",
      name: "Investment Returns",
      type: "income",
      color: "#B04DFF",
      icon: "📈",
      sort_order: 4
    },
    {
      id: "cat_rental",
      name: "Rental Income",
      type: "income",
      color: "#4DE8FF",
      icon: "🏘️",
      sort_order: 5
    },
    {
      id: "cat_other_inc",
      name: "Other Income",
      type: "income",
      color: "#8B9DC3",
      icon: "💰",
      sort_order: 99
    }
  ];
  const insertCat = db.prepare(
    "INSERT OR IGNORE INTO categories (id, name, type, color, icon, is_custom, sort_order) VALUES (?, ?, ?, ?, ?, 0, ?)"
  );
  const insertManyCats = db.transaction((cats) => {
    for (const c of cats) {
      insertCat.run(c.id, c.name, c.type, c.color, c.icon, c.sort_order);
    }
  });
  insertManyCats(categories);
  const settings = [
    ["onboarding_complete", "false"],
    ["currency", "INR"],
    ["theme", "dark"],
    ["language", "en"],
    ["price_refresh_interval", "15"],
    ["dashboard_layout", "default"],
    ["first_launch", (/* @__PURE__ */ new Date()).toISOString()]
  ];
  const insertSetting = db.prepare(
    "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)"
  );
  for (const [k, v] of settings) insertSetting.run(k, v);
}
const dbSettings = {
  get: (key) => {
    const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
    return row?.value ?? null;
  },
  set: (key, value) => {
    db.prepare(
      "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)"
    ).run(key, value);
  },
  getAll: () => {
    return db.prepare("SELECT key, value FROM settings").all();
  }
};
const dbAccounts = {
  getAll: () => db.prepare("SELECT * FROM accounts WHERE is_active = 1 ORDER BY name").all(),
  getById: (id) => db.prepare("SELECT * FROM accounts WHERE id = ?").get(id),
  create: (account) => {
    return db.prepare(
      "INSERT INTO accounts (id, name, type, balance, currency, institution) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(
      account.id,
      account.name,
      account.type,
      account.balance,
      account.currency,
      account.institution
    );
  },
  update: (id, data) => {
    return db.prepare(
      "UPDATE accounts SET name = ?, type = ?, balance = ?, institution = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).run(data.name, data.type, data.balance, data.institution, id);
  },
  delete: (id) => db.prepare("UPDATE accounts SET is_active = 0 WHERE id = ?").run(id)
};
const dbCategories = {
  getAll: () => db.prepare("SELECT * FROM categories ORDER BY type, sort_order, name").all(),
  getByType: (type) => db.prepare(
    "SELECT * FROM categories WHERE type = ? ORDER BY sort_order, name"
  ).all(type),
  create: (cat) => {
    return db.prepare(
      "INSERT INTO categories (id, name, type, color, icon, is_custom, parent_id) VALUES (?, ?, ?, ?, ?, 1, ?)"
    ).run(cat.id, cat.name, cat.type, cat.color, cat.icon, cat.parent_id);
  },
  update: (id, data) => {
    return db.prepare(
      "UPDATE categories SET name = ?, color = ?, icon = ? WHERE id = ?"
    ).run(data.name, data.color, data.icon, id);
  },
  delete: (id) => db.prepare("DELETE FROM categories WHERE id = ? AND is_custom = 1").run(id)
};
const dbTransactions = {
  getAll: (filters) => {
    let query = `
      SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE 1=1
    `;
    const params = [];
    if (filters?.startDate) {
      query += " AND t.date >= ?";
      params.push(filters.startDate);
    }
    if (filters?.endDate) {
      query += " AND t.date <= ?";
      params.push(filters.endDate);
    }
    if (filters?.type) {
      query += " AND t.type = ?";
      params.push(filters.type);
    }
    if (filters?.categoryId) {
      query += " AND t.category_id = ?";
      params.push(filters.categoryId);
    }
    if (filters?.search) {
      query += " AND (t.description LIKE ? OR t.merchant LIKE ?)";
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }
    query += " ORDER BY t.date DESC, t.created_at DESC";
    if (filters?.limit) {
      query += " LIMIT ?";
      params.push(filters.limit);
    }
    return db.prepare(query).all(...params);
  },
  getById: (id) => db.prepare("SELECT * FROM transactions WHERE id = ?").get(id),
  create: (tx) => {
    return db.prepare(
      `
      INSERT INTO transactions (id, account_id, date, description, category_id, amount, type, notes, merchant, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      tx.id,
      tx.account_id,
      tx.date,
      tx.description,
      tx.category_id,
      tx.amount,
      tx.type,
      tx.notes,
      tx.merchant,
      tx.source || "manual"
    );
  },
  bulkCreate: (transactions) => {
    const insert = db.prepare(`
      INSERT OR IGNORE INTO transactions (id, account_id, date, description, category_id, amount, type, notes, merchant, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertMany = db.transaction((txs) => {
      for (const tx of txs) {
        insert.run(
          tx.id,
          tx.account_id,
          tx.date,
          tx.description,
          tx.category_id,
          tx.amount,
          tx.type,
          tx.notes,
          tx.merchant,
          tx.source
        );
      }
    });
    insertMany(transactions);
  },
  update: (id, data) => {
    return db.prepare(
      `
      UPDATE transactions SET date = ?, description = ?, category_id = ?, amount = ?, type = ?, notes = ?, merchant = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `
    ).run(
      data.date,
      data.description,
      data.category_id,
      data.amount,
      data.type,
      data.notes,
      data.merchant,
      id
    );
  },
  delete: (id) => db.prepare("DELETE FROM transactions WHERE id = ?").run(id),
  // Aggregations
  getSummary: (startDate, endDate) => {
    return db.prepare(
      `
      SELECT
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expense,
        COUNT(CASE WHEN type = 'income' THEN 1 END) as income_count,
        COUNT(CASE WHEN type = 'expense' THEN 1 END) as expense_count
      FROM transactions
      WHERE date BETWEEN ? AND ?
    `
    ).get(startDate, endDate);
  },
  getCategoryBreakdown: (startDate, endDate, type) => {
    return db.prepare(
      `
      SELECT c.id, c.name, c.color, c.icon, SUM(t.amount) as total, COUNT(*) as count
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.date BETWEEN ? AND ? AND t.type = ?
      GROUP BY t.category_id
      ORDER BY total DESC
    `
    ).all(startDate, endDate, type);
  },
  getMonthlyTrend: (months) => {
    return db.prepare(
      `
      SELECT 
        strftime('%Y-%m', date) as month,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
      FROM transactions
      WHERE date >= date('now', '-${months} months')
      GROUP BY month
      ORDER BY month
    `
    ).all();
  },
  getDailySpending: (startDate, endDate) => {
    return db.prepare(
      `
      SELECT date, SUM(amount) as total
      FROM transactions
      WHERE type = 'expense' AND date BETWEEN ? AND ?
      GROUP BY date
      ORDER BY date
    `
    ).all(startDate, endDate);
  }
};
const dbBudgets = {
  getForMonth: (month) => {
    return db.prepare(
      `
      SELECT b.*, c.name as category_name, c.color, c.icon,
        COALESCE((
          SELECT SUM(amount) FROM transactions t
          WHERE t.category_id = b.category_id AND strftime('%Y-%m', t.date) = b.month AND t.type = 'expense'
        ), 0) as spent
      FROM budgets b
      JOIN categories c ON b.category_id = c.id
      WHERE b.month = ?
    `
    ).all(month);
  },
  upsert: (budget) => {
    return db.prepare(
      `
      INSERT OR REPLACE INTO budgets (id, category_id, month, amount)
      VALUES (?, ?, ?, ?)
    `
    ).run(budget.id, budget.category_id, budget.month, budget.amount);
  },
  delete: (id) => db.prepare("DELETE FROM budgets WHERE id = ?").run(id)
};
const dbHoldings = {
  getAll: () => db.prepare(
    "SELECT * FROM holdings WHERE is_active = 1 ORDER BY asset_type, symbol"
  ).all(),
  getById: (id) => db.prepare("SELECT * FROM holdings WHERE id = ?").get(id),
  create: (holding) => {
    return db.prepare(
      `
      INSERT INTO holdings (id, symbol, name, quantity, buy_price, buy_date, asset_type, broker, exchange, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      holding.id,
      holding.symbol,
      holding.name,
      holding.quantity,
      holding.buy_price,
      holding.buy_date,
      holding.asset_type,
      holding.broker,
      holding.exchange,
      holding.notes
    );
  },
  update: (id, data) => {
    return db.prepare(
      `
      UPDATE holdings SET quantity = ?, buy_price = ?, buy_date = ?, broker = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `
    ).run(
      data.quantity,
      data.buy_price,
      data.buy_date,
      data.broker,
      data.notes,
      id
    );
  },
  delete: (id) => db.prepare("UPDATE holdings SET is_active = 0 WHERE id = ?").run(id)
};
const dbPriceCache = {
  get: (symbol) => db.prepare("SELECT * FROM price_cache WHERE symbol = ?").get(symbol),
  getAll: () => db.prepare("SELECT * FROM price_cache").all(),
  upsert: (data) => {
    return db.prepare(
      `
      INSERT OR REPLACE INTO price_cache (symbol, price, change_percent, previous_close, market_cap, volume, source, last_updated)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `
    ).run(
      data.symbol,
      data.price,
      data.change_percent,
      data.previous_close,
      data.market_cap,
      data.volume,
      data.source
    );
  },
  setManual: (symbol, price, note) => {
    return db.prepare(
      `
      UPDATE price_cache SET price = ?, is_manual = 1, manual_note = ?, last_updated = CURRENT_TIMESTAMP WHERE symbol = ?
    `
    ).run(price, note, symbol);
  },
  isStale: (symbol, minutesThreshold) => {
    const row = db.prepare(
      `
      SELECT CAST((julianday('now') - julianday(last_updated)) * 24 * 60 AS INTEGER) as minutes_ago
      FROM price_cache WHERE symbol = ?
    `
    ).get(symbol);
    if (!row) return true;
    return row.minutes_ago > minutesThreshold;
  }
};
const dbGoals = {
  getAll: () => db.prepare(
    "SELECT * FROM goals WHERE is_active = 1 ORDER BY priority, created_at"
  ).all(),
  getById: (id) => db.prepare("SELECT * FROM goals WHERE id = ?").get(id),
  create: (goal) => {
    return db.prepare(
      `
      INSERT INTO goals (id, name, description, target_amount, current_amount, target_date, category, icon, color, priority)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      goal.id,
      goal.name,
      goal.description,
      goal.target_amount,
      goal.current_amount,
      goal.target_date,
      goal.category,
      goal.icon,
      goal.color,
      goal.priority
    );
  },
  update: (id, data) => {
    return db.prepare(
      `
      UPDATE goals SET name = ?, description = ?, target_amount = ?, current_amount = ?, target_date = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `
    ).run(
      data.name,
      data.description,
      data.target_amount,
      data.current_amount,
      data.target_date,
      id
    );
  },
  delete: (id) => db.prepare("UPDATE goals SET is_active = 0 WHERE id = ?").run(id)
};
const dbMilestones = {
  create: (milestone) => {
    return db.prepare(
      `
      INSERT OR IGNORE INTO milestones (id, type, value, title, message)
      VALUES (?, ?, ?, ?, ?)
    `
    ).run(
      milestone.id,
      milestone.type,
      milestone.value,
      milestone.title,
      milestone.message
    );
  },
  getUncelebrated: () => db.prepare(
    "SELECT * FROM milestones WHERE celebrated = 0 ORDER BY achieved_at DESC LIMIT 5"
  ).all(),
  markCelebrated: (id) => db.prepare("UPDATE milestones SET celebrated = 1 WHERE id = ?").run(id)
};
const dbInsights = {
  getActive: () => {
    return db.prepare(
      `
      SELECT * FROM insights
      WHERE is_dismissed = 0 AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
      ORDER BY priority DESC, created_at DESC
      LIMIT 10
    `
    ).all();
  },
  create: (insight) => {
    return db.prepare(
      `
      INSERT INTO insights (id, type, title, content, priority, category, action_label, action_data, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      insight.id,
      insight.type,
      insight.title,
      insight.content,
      insight.priority,
      insight.category,
      insight.action_label,
      insight.action_data,
      insight.expires_at
    );
  },
  dismiss: (id) => db.prepare("UPDATE insights SET is_dismissed = 1 WHERE id = ?").run(id),
  clearAll: () => db.prepare("UPDATE insights SET is_dismissed = 1").run()
};
const dbWeeklyStory = {
  get: (weekStart) => db.prepare("SELECT * FROM weekly_stories WHERE week_start = ?").get(weekStart),
  save: (story) => {
    return db.prepare(
      `
      INSERT OR REPLACE INTO weekly_stories (id, week_start, story, highlights, mood)
      VALUES (?, ?, ?, ?, ?)
    `
    ).run(
      story.id,
      story.week_start,
      story.story,
      story.highlights,
      story.mood
    );
  },
  getLatest: () => db.prepare("SELECT * FROM weekly_stories ORDER BY week_start DESC LIMIT 1").get()
};
const ALPHA_VANTAGE_KEY = process.env.VITE_ALPHA_VANTAGE_API_KEY || "";
const COINGECKO_BASE = "https://api.coingecko.com/api/v3";
const ALPHA_VANTAGE_BASE = "https://www.alphavantage.co/query";
process.env.VITE_FINNHUB_API_KEY || "";
const NEWS_API_KEY = process.env.VITE_NEWS_API_KEY || "";
const CRYPTO_MAP = {
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
  USDC: "usd-coin"
};
async function fetchStockPrice(symbol) {
  try {
    const cached = dbPriceCache.get(symbol);
    if (cached && !dbPriceCache.isStale(symbol, 15) && !cached.is_manual) {
      return {
        symbol,
        price: cached.price,
        changePercent: cached.change_percent,
        previousClose: cached.previous_close,
        source: "cache",
        timestamp: cached.last_updated
      };
    }
    if (!ALPHA_VANTAGE_KEY || ALPHA_VANTAGE_KEY === "your-alpha-vantage-key") {
      const mockPrice = cached?.price || Math.random() * 1e3 + 100;
      return {
        symbol,
        price: mockPrice,
        changePercent: (Math.random() - 0.5) * 4,
        previousClose: mockPrice * 0.99,
        source: "demo",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
    const response = await axios.get(ALPHA_VANTAGE_BASE, {
      params: {
        function: "GLOBAL_QUOTE",
        symbol: symbol.endsWith(".NS") ? symbol : `${symbol}.NS`,
        // Add NSE suffix for Indian stocks
        apikey: ALPHA_VANTAGE_KEY
      },
      timeout: 8e3
    });
    const quote = response.data["Global Quote"];
    if (!quote || !quote["05. price"]) {
      const response2 = await axios.get(ALPHA_VANTAGE_BASE, {
        params: { function: "GLOBAL_QUOTE", symbol, apikey: ALPHA_VANTAGE_KEY },
        timeout: 8e3
      });
      const quote2 = response2.data["Global Quote"];
      if (!quote2 || !quote2["05. price"]) return null;
      const price2 = parseFloat(quote2["05. price"]);
      const changePercent2 = parseFloat(
        quote2["10. change percent"]?.replace("%", "") || "0"
      );
      const previousClose2 = parseFloat(quote2["08. previous close"] || "0");
      dbPriceCache.upsert({
        symbol,
        price: price2,
        change_percent: changePercent2,
        previous_close: previousClose2,
        source: "alpha_vantage",
        market_cap: null,
        volume: parseInt(quote2["06. volume"] || "0")
      });
      return {
        symbol,
        price: price2,
        changePercent: changePercent2,
        previousClose: previousClose2,
        source: "Alpha Vantage (15min delay)",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
    const price = parseFloat(quote["05. price"]);
    const changePercent = parseFloat(
      quote["10. change percent"]?.replace("%", "") || "0"
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
      volume
    });
    return {
      symbol,
      price,
      changePercent,
      previousClose,
      source: "Alpha Vantage (15min delay)",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
  } catch (err) {
    console.error(`Price fetch error for ${symbol}:`, err.message);
    const cached = dbPriceCache.get(symbol);
    if (cached) {
      return {
        symbol,
        price: cached.price,
        changePercent: cached.change_percent,
        previousClose: cached.previous_close,
        source: "cached (API error)",
        timestamp: cached.last_updated
      };
    }
    return null;
  }
}
async function fetchCryptoPrice(symbol) {
  try {
    const coinId = CRYPTO_MAP[symbol.toUpperCase()] || symbol.toLowerCase();
    const response = await axios.get(`${COINGECKO_BASE}/simple/price`, {
      params: {
        ids: coinId,
        vs_currencies: "inr",
        include_market_cap: true,
        include_24hr_vol: true,
        include_24hr_change: true
      },
      timeout: 8e3
    });
    const data = response.data[coinId];
    if (!data) return null;
    const result = {
      symbol,
      price: data.inr,
      changePercent: data.inr_24h_change,
      marketCap: data.inr_market_cap,
      volume: data.inr_24h_vol,
      source: "CoinGecko (real-time)"
    };
    dbPriceCache.upsert({
      symbol,
      price: result.price,
      change_percent: result.changePercent,
      previous_close: result.price / (1 + result.changePercent / 100),
      market_cap: result.marketCap,
      volume: result.volume,
      source: "coingecko"
    });
    return result;
  } catch (err) {
    console.error(`Crypto price error for ${symbol}:`, err.message);
    const cached = dbPriceCache.get(symbol);
    if (cached)
      return {
        symbol,
        price: cached.price,
        changePercent: cached.change_percent,
        marketCap: cached.market_cap,
        volume: cached.volume,
        source: "cached"
      };
    return null;
  }
}
async function fetchMultiplePrices(holdings) {
  const results = {};
  const cryptoHoldings = holdings.filter((h) => h.asset_type === "crypto");
  const stockHoldings = holdings.filter((h) => h.asset_type !== "crypto");
  if (cryptoHoldings.length > 0) {
    try {
      const coinIds = cryptoHoldings.map(
        (h) => CRYPTO_MAP[h.symbol.toUpperCase()] || h.symbol.toLowerCase()
      );
      const response = await axios.get(`${COINGECKO_BASE}/simple/price`, {
        params: {
          ids: coinIds.join(","),
          vs_currencies: "inr",
          include_24hr_change: true
        },
        timeout: 1e4
      });
      for (const holding of cryptoHoldings) {
        const coinId = CRYPTO_MAP[holding.symbol.toUpperCase()] || holding.symbol.toLowerCase();
        const data = response.data[coinId];
        if (data) {
          results[holding.symbol] = {
            price: data.inr,
            changePercent: data.inr_24h_change,
            source: "CoinGecko"
          };
          dbPriceCache.upsert({
            symbol: holding.symbol,
            price: data.inr,
            change_percent: data.inr_24h_change,
            previous_close: data.inr / (1 + data.inr_24h_change / 100),
            source: "coingecko",
            market_cap: null,
            volume: null
          });
        }
      }
    } catch (e) {
      console.error("Bulk crypto fetch error:", e);
    }
  }
  for (const holding of stockHoldings) {
    const result = await fetchStockPrice(holding.symbol);
    if (result) results[holding.symbol] = result;
    await sleep(500);
  }
  return results;
}
async function fetchFinancialNews(query) {
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
        apiKey: NEWS_API_KEY
      },
      timeout: 8e3
    });
    return response.data.articles?.map((article) => ({
      id: article.url,
      title: article.title,
      summary: article.description,
      source: article.source.name,
      url: article.url,
      publishedAt: article.publishedAt,
      imageUrl: article.urlToImage,
      sentiment: "neutral"
      // Could use AI to analyze
    })) || [];
  } catch (err) {
    console.error("News fetch error:", err);
    return getMockNews();
  }
}
async function fetchMarketOverview() {
  try {
    const nifty = await fetchStockPrice("^NSEI");
    const sensex = await fetchStockPrice("^BSESN");
    return {
      nifty50: nifty,
      sensex,
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString(),
      source: "Alpha Vantage (15min delay)"
    };
  } catch {
    return null;
  }
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function getMockNews() {
  return [
    {
      id: "1",
      title: "Nifty 50 rallies to new highs on strong FII inflows",
      summary: "Foreign institutional investors pumped ₹8,500 crore into Indian equities.",
      source: "Economic Times",
      url: "#",
      publishedAt: (/* @__PURE__ */ new Date()).toISOString(),
      sentiment: "positive"
    },
    {
      id: "2",
      title: "RBI holds interest rates steady, signals cautious approach",
      summary: "The Reserve Bank of India maintained the repo rate at 6.5%.",
      source: "Business Standard",
      url: "#",
      publishedAt: new Date(Date.now() - 36e5).toISOString(),
      sentiment: "neutral"
    },
    {
      id: "3",
      title: "Indian IT sector outlook remains positive amid global demand",
      summary: "Major IT firms like TCS, Infosys report stable deal pipelines.",
      source: "Mint",
      url: "#",
      publishedAt: new Date(Date.now() - 72e5).toISOString(),
      sentiment: "positive"
    }
  ];
}
function registerAllHandlers() {
  ipcMain.handle("settings:get", (_, key) => dbSettings.get(key));
  ipcMain.handle("settings:set", (_, key, value) => {
    dbSettings.set(key, value);
    return true;
  });
  ipcMain.handle("settings:getAll", () => dbSettings.getAll());
  ipcMain.handle("accounts:getAll", () => dbAccounts.getAll());
  ipcMain.handle("accounts:create", (_, data) => {
    const id = randomUUID();
    dbAccounts.create({ ...data, id });
    return { id, ...data };
  });
  ipcMain.handle("accounts:update", (_, id, data) => {
    dbAccounts.update(id, data);
    return true;
  });
  ipcMain.handle("accounts:delete", (_, id) => {
    dbAccounts.delete(id);
    return true;
  });
  ipcMain.handle("categories:getAll", () => dbCategories.getAll());
  ipcMain.handle("categories:create", (_, data) => {
    const id = randomUUID();
    dbCategories.create({ ...data, id });
    return { id, ...data };
  });
  ipcMain.handle("categories:update", (_, id, data) => {
    dbCategories.update(id, data);
    return true;
  });
  ipcMain.handle("categories:delete", (_, id) => {
    dbCategories.delete(id);
    return true;
  });
  ipcMain.handle(
    "transactions:getAll",
    (_, filters) => dbTransactions.getAll(filters)
  );
  ipcMain.handle("transactions:create", (_, data) => {
    const id = randomUUID();
    dbTransactions.create({ ...data, id });
    checkMilestones();
    return { id, ...data };
  });
  ipcMain.handle("transactions:update", (_, id, data) => {
    dbTransactions.update(id, data);
    return true;
  });
  ipcMain.handle("transactions:delete", (_, id) => {
    dbTransactions.delete(id);
    return true;
  });
  ipcMain.handle(
    "transactions:getSummary",
    (_, startDate, endDate) => dbTransactions.getSummary(startDate, endDate)
  );
  ipcMain.handle(
    "transactions:getCategoryBreakdown",
    (_, startDate, endDate, type) => dbTransactions.getCategoryBreakdown(startDate, endDate, type)
  );
  ipcMain.handle(
    "transactions:getMonthlyTrend",
    (_, months) => dbTransactions.getMonthlyTrend(months)
  );
  ipcMain.handle(
    "transactions:getDailySpending",
    (_, startDate, endDate) => dbTransactions.getDailySpending(startDate, endDate)
  );
  ipcMain.handle(
    "transactions:importCSV",
    async (_, filePath, mapping) => {
      try {
        const content = readFileSync(filePath, "utf-8");
        const parsed = Papa.parse(content, {
          header: true,
          skipEmptyLines: true
        });
        const rows = parsed.data;
        const transactions = rows.map((row) => ({
          id: randomUUID(),
          date: parseDate(row[mapping.date]),
          description: row[mapping.description] || "Imported transaction",
          amount: Math.abs(
            parseFloat(row[mapping.amount]?.replace(/[₹,\s]/g, "") || "0")
          ),
          type: determineType(row, mapping),
          category_id: mapping.defaultCategoryId,
          merchant: row[mapping.merchant] || null,
          notes: row[mapping.notes] || null,
          account_id: mapping.accountId || null,
          source: "csv_import"
        })).filter((t) => t.amount > 0 && t.date);
        dbTransactions.bulkCreate(transactions);
        return { success: true, count: transactions.length };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }
  );
  ipcMain.handle(
    "transactions:importExcel",
    async (_, filePath, mapping) => {
      try {
        const workbook = XLSX.readFile(filePath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);
        const transactions = rows.map((row) => ({
          id: randomUUID(),
          date: parseDate(String(row[mapping.date] || "")),
          description: String(row[mapping.description] || "Imported"),
          amount: Math.abs(
            parseFloat(
              String(row[mapping.amount] || "0").replace(/[₹,\s]/g, "")
            )
          ),
          type: determineType(row, mapping),
          category_id: mapping.defaultCategoryId,
          merchant: row[mapping.merchant] ? String(row[mapping.merchant]) : null,
          notes: null,
          account_id: mapping.accountId || null,
          source: "excel_import"
        })).filter((t) => t.amount > 0 && t.date);
        dbTransactions.bulkCreate(transactions);
        return { success: true, count: transactions.length };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }
  );
  ipcMain.handle(
    "budgets:getForMonth",
    (_, month) => dbBudgets.getForMonth(month)
  );
  ipcMain.handle("budgets:upsert", (_, data) => {
    const id = data.id || randomUUID();
    dbBudgets.upsert({ ...data, id });
    return true;
  });
  ipcMain.handle("budgets:delete", (_, id) => {
    dbBudgets.delete(id);
    return true;
  });
  ipcMain.handle("holdings:getAll", () => dbHoldings.getAll());
  ipcMain.handle("holdings:create", (_, data) => {
    const id = randomUUID();
    dbHoldings.create({ ...data, id });
    return { id, ...data };
  });
  ipcMain.handle("holdings:update", (_, id, data) => {
    dbHoldings.update(id, data);
    return true;
  });
  ipcMain.handle("holdings:delete", (_, id) => {
    dbHoldings.delete(id);
    return true;
  });
  ipcMain.handle("prices:getStockPrice", async (_, symbol) => {
    return fetchStockPrice(symbol);
  });
  ipcMain.handle("prices:getCryptoPrice", async (_, symbol) => {
    return fetchCryptoPrice(symbol);
  });
  ipcMain.handle("prices:refreshAll", async () => {
    const holdings = dbHoldings.getAll();
    if (holdings.length === 0) return {};
    return fetchMultiplePrices(
      holdings.map((h) => ({ symbol: h.symbol, asset_type: h.asset_type }))
    );
  });
  ipcMain.handle(
    "prices:setManual",
    (_, symbol, price, note) => {
      dbPriceCache.setManual(symbol, price, note);
      return true;
    }
  );
  ipcMain.handle("prices:getAll", () => dbPriceCache.getAll());
  ipcMain.handle("prices:getMarketOverview", async () => fetchMarketOverview());
  ipcMain.handle("goals:getAll", () => dbGoals.getAll());
  ipcMain.handle("goals:create", (_, data) => {
    const id = randomUUID();
    dbGoals.create({ ...data, id });
    return { id, ...data };
  });
  ipcMain.handle("goals:update", (_, id, data) => {
    dbGoals.update(id, data);
    return true;
  });
  ipcMain.handle("goals:delete", (_, id) => {
    dbGoals.delete(id);
    return true;
  });
  ipcMain.handle(
    "milestones:getUncelebrated",
    () => dbMilestones.getUncelebrated()
  );
  ipcMain.handle("milestones:markCelebrated", (_, id) => {
    dbMilestones.markCelebrated(id);
    return true;
  });
  ipcMain.handle("insights:getActive", () => dbInsights.getActive());
  ipcMain.handle("insights:dismiss", (_, id) => {
    dbInsights.dismiss(id);
    return true;
  });
  ipcMain.handle("insights:clearAll", () => {
    dbInsights.clearAll();
    return true;
  });
  ipcMain.handle("insights:save", (_, insight) => {
    const id = randomUUID();
    dbInsights.create({ ...insight, id });
    return true;
  });
  ipcMain.handle("weeklyStory:getLatest", () => dbWeeklyStory.getLatest());
  ipcMain.handle("weeklyStory:save", (_, story) => {
    const id = randomUUID();
    dbWeeklyStory.save({ ...story, id });
    return true;
  });
  ipcMain.handle(
    "news:fetch",
    async (_, query) => fetchFinancialNews(query)
  );
  ipcMain.handle("analytics:getNetWorthHistory", () => {
    return [];
  });
  ipcMain.handle("analytics:getFinancialHealthScore", () => {
    const now = /* @__PURE__ */ new Date();
    const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const endOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-31`;
    const summary = dbTransactions.getSummary(startOfMonth, endOfMonth);
    const income = summary?.total_income || 0;
    const expenses = summary?.total_expense || 0;
    const savingsRate = income > 0 ? (income - expenses) / income * 100 : 0;
    const expenseRatio = income > 0 ? expenses / income * 100 : 100;
    let score = 50;
    if (savingsRate >= 30) score += 25;
    else if (savingsRate >= 20) score += 20;
    else if (savingsRate >= 10) score += 10;
    else if (savingsRate < 0) score -= 20;
    if (expenseRatio <= 60) score += 15;
    else if (expenseRatio <= 80) score += 5;
    else if (expenseRatio > 100) score -= 15;
    return {
      score: Math.max(0, Math.min(100, score)),
      savingsRate,
      expenseRatio,
      income,
      expenses,
      savings: income - expenses
    };
  });
}
function checkMilestones() {
  const milestoneNetWorths = [
    1e5,
    5e5,
    1e6,
    25e5,
    5e6,
    1e7
  ];
  const summary = dbTransactions.getSummary("2000-01-01", "2099-12-31");
  const netWorth = (summary?.total_income || 0) - (summary?.total_expense || 0);
  for (const milestone of milestoneNetWorths) {
    if (netWorth >= milestone) {
      const id = `milestone_nw_${milestone}`;
      const label = milestone >= 1e7 ? "₹1 Crore! 🎉" : milestone >= 1e6 ? `₹${milestone / 1e5}L 🚀` : `₹${milestone / 1e5}L`;
      dbMilestones.create({
        id,
        type: "net_worth",
        value: milestone,
        title: `You hit ${label}!`,
        message: `Your net savings just crossed ${label}. Keep up the great work! 🌟`
      });
    }
  }
}
function parseDate(dateStr) {
  if (!dateStr) return "";
  const parts = dateStr.split(/[\/\-\.]/);
  if (parts.length < 3) return dateStr;
  if (parts[0].length <= 2 && parseInt(parts[0]) <= 31) {
    const [day, month, year] = parts;
    return `${year.length === 2 ? "20" + year : year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  if (parts[0].length === 4) return dateStr;
  return dateStr;
}
function determineType(row, mapping) {
  if (mapping.type && row[mapping.type]) {
    const typeVal = String(row[mapping.type]).toLowerCase();
    if (typeVal.includes("credit") || typeVal.includes("income") || typeVal.includes("cr"))
      return "income";
    return "expense";
  }
  if (mapping.creditColumn && row[mapping.creditColumn]) return "income";
  if (mapping.debitColumn && row[mapping.debitColumn]) return "expense";
  return "expense";
}
let mainWindow = null;
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    frame: false,
    // Custom titlebar
    titleBarStyle: "hidden",
    backgroundColor: "#08091A",
    autoHideMenuBar: true,
    icon: join(__dirname, "../../resources/icon.png"),
    webPreferences: {
      preload: join(__dirname, "../preload/index.mjs"),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  mainWindow.on("ready-to-show", () => {
    mainWindow?.show();
    if (is.dev) {
      mainWindow?.webContents.openDevTools({ mode: "detach" });
    }
  });
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}
ipcMain.on("window:minimize", () => mainWindow?.minimize());
ipcMain.on("window:maximize", () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.on("window:close", () => mainWindow?.close());
ipcMain.handle("window:isMaximized", () => mainWindow?.isMaximized());
ipcMain.handle("dialog:openFile", async (_, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result;
});
ipcMain.handle("dialog:saveFile", async (_, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result;
});
app.whenReady().then(async () => {
  await initDatabase();
  electronApp.setAppUserModelId("com.finpilot.ai");
  registerAllHandlers();
  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
