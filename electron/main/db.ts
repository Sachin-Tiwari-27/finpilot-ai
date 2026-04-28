import Database from "better-sqlite3";
import { app } from "electron";
import { join } from "path";
import { mkdirSync, existsSync } from "fs";

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) throw new Error("Database not initialized");
  return db;
}

export async function initDatabase(): Promise<void> {
  const userDataPath = app.getPath("userData");
  const dbDir = join(userDataPath, "finpilot-db");

  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }

  db = new Database(join(dbDir, "finpilot.db"), {
    verbose: process.env.NODE_ENV === "development" ? console.log : undefined,
  });

  // Enable WAL mode for performance
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  createTables();
  seedDefaultData();
  console.log("✅ Database initialized at:", join(dbDir, "finpilot.db"));
}

function createTables(): void {
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

function seedDefaultData(): void {
  // Only seed if categories don't exist
  const count = db.prepare("SELECT COUNT(*) as cnt FROM categories").get() as {
    cnt: number;
  };
  if (count.cnt > 0) return;

  // Default categories
  const categories = [
    // Expense categories
    {
      id: "cat_groceries",
      name: "Groceries",
      type: "expense",
      color: "#10D9A0",
      icon: "🛒",
      sort_order: 1,
    },
    {
      id: "cat_transport",
      name: "Transport",
      type: "expense",
      color: "#3D7FFF",
      icon: "🚗",
      sort_order: 2,
    },
    {
      id: "cat_dining",
      name: "Dining Out",
      type: "expense",
      color: "#FFB84D",
      icon: "🍽️",
      sort_order: 3,
    },
    {
      id: "cat_entertainment",
      name: "Entertainment",
      type: "expense",
      color: "#B04DFF",
      icon: "🎬",
      sort_order: 4,
    },
    {
      id: "cat_shopping",
      name: "Shopping",
      type: "expense",
      color: "#FF4D6B",
      icon: "🛍️",
      sort_order: 5,
    },
    {
      id: "cat_utilities",
      name: "Utilities",
      type: "expense",
      color: "#FFB84D",
      icon: "⚡",
      sort_order: 6,
    },
    {
      id: "cat_healthcare",
      name: "Healthcare",
      type: "expense",
      color: "#FF6B3D",
      icon: "🏥",
      sort_order: 7,
    },
    {
      id: "cat_rent",
      name: "Rent/Housing",
      type: "expense",
      color: "#4DE8FF",
      icon: "🏠",
      sort_order: 8,
    },
    {
      id: "cat_education",
      name: "Education",
      type: "expense",
      color: "#10D9A0",
      icon: "📚",
      sort_order: 9,
    },
    {
      id: "cat_subscriptions",
      name: "Subscriptions",
      type: "expense",
      color: "#B04DFF",
      icon: "📱",
      sort_order: 10,
    },
    {
      id: "cat_insurance",
      name: "Insurance",
      type: "expense",
      color: "#3D7FFF",
      icon: "🛡️",
      sort_order: 11,
    },
    {
      id: "cat_travel",
      name: "Travel",
      type: "expense",
      color: "#FF6B3D",
      icon: "✈️",
      sort_order: 12,
    },
    {
      id: "cat_other_exp",
      name: "Other",
      type: "expense",
      color: "#8B9DC3",
      icon: "📦",
      sort_order: 99,
    },

    // Income categories
    {
      id: "cat_salary",
      name: "Salary",
      type: "income",
      color: "#10D9A0",
      icon: "💼",
      sort_order: 1,
    },
    {
      id: "cat_freelance",
      name: "Freelance",
      type: "income",
      color: "#3D7FFF",
      icon: "💻",
      sort_order: 2,
    },
    {
      id: "cat_business",
      name: "Business",
      type: "income",
      color: "#FFB84D",
      icon: "🏢",
      sort_order: 3,
    },
    {
      id: "cat_investment_inc",
      name: "Investment Returns",
      type: "income",
      color: "#B04DFF",
      icon: "📈",
      sort_order: 4,
    },
    {
      id: "cat_rental",
      name: "Rental Income",
      type: "income",
      color: "#4DE8FF",
      icon: "🏘️",
      sort_order: 5,
    },
    {
      id: "cat_other_inc",
      name: "Other Income",
      type: "income",
      color: "#8B9DC3",
      icon: "💰",
      sort_order: 99,
    },
  ];

  const insertCat = db.prepare(
    "INSERT OR IGNORE INTO categories (id, name, type, color, icon, is_custom, sort_order) VALUES (?, ?, ?, ?, ?, 0, ?)",
  );
  const insertManyCats = db.transaction((cats: typeof categories) => {
    for (const c of cats) {
      insertCat.run(c.id, c.name, c.type, c.color, c.icon, c.sort_order);
    }
  });
  insertManyCats(categories);

  // Default settings
  const settings = [
    ["onboarding_complete", "false"],
    ["currency", "INR"],
    ["theme", "dark"],
    ["language", "en"],
    ["price_refresh_interval", "15"],
    ["dashboard_layout", "default"],
    ["first_launch", new Date().toISOString()],
  ];
  const insertSetting = db.prepare(
    "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)",
  );
  for (const [k, v] of settings) insertSetting.run(k, v);
}

// ============================================================
// DATABASE OPERATIONS - used by IPC handlers
// ============================================================

// --- Settings ---
export const dbSettings = {
  get: (key: string) => {
    const row = db
      .prepare("SELECT value FROM settings WHERE key = ?")
      .get(key) as { value: string } | undefined;
    return row?.value ?? null;
  },
  set: (key: string, value: string) => {
    db.prepare(
      "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
    ).run(key, value);
  },
  getAll: () => {
    return db.prepare("SELECT key, value FROM settings").all() as {
      key: string;
      value: string;
    }[];
  },
};

// --- Accounts ---
export const dbAccounts = {
  getAll: () =>
    db
      .prepare("SELECT * FROM accounts WHERE is_active = 1 ORDER BY name")
      .all(),
  getById: (id: string) =>
    db.prepare("SELECT * FROM accounts WHERE id = ?").get(id),
  create: (account: any) => {
    return db
      .prepare(
        "INSERT INTO accounts (id, name, type, balance, currency, institution) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .run(
        account.id,
        account.name,
        account.type,
        account.balance,
        account.currency,
        account.institution,
      );
  },
  update: (id: string, data: any) => {
    return db
      .prepare(
        "UPDATE accounts SET name = ?, type = ?, balance = ?, institution = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      )
      .run(data.name, data.type, data.balance, data.institution, id);
  },
  delete: (id: string) =>
    db.prepare("UPDATE accounts SET is_active = 0 WHERE id = ?").run(id),
};

// --- Categories ---
export const dbCategories = {
  getAll: () =>
    db
      .prepare("SELECT * FROM categories ORDER BY type, sort_order, name")
      .all(),
  getByType: (type: string) =>
    db
      .prepare(
        "SELECT * FROM categories WHERE type = ? ORDER BY sort_order, name",
      )
      .all(type),
  create: (cat: any) => {
    return db
      .prepare(
        "INSERT INTO categories (id, name, type, color, icon, is_custom, parent_id) VALUES (?, ?, ?, ?, ?, 1, ?)",
      )
      .run(cat.id, cat.name, cat.type, cat.color, cat.icon, cat.parent_id);
  },
  update: (id: string, data: any) => {
    return db
      .prepare(
        "UPDATE categories SET name = ?, color = ?, icon = ? WHERE id = ?",
      )
      .run(data.name, data.color, data.icon, id);
  },
  delete: (id: string) =>
    db.prepare("DELETE FROM categories WHERE id = ? AND is_custom = 1").run(id),
};

// --- Transactions ---
export const dbTransactions = {
  getAll: (filters?: any) => {
    let query = `
      SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];

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

  getById: (id: string) =>
    db.prepare("SELECT * FROM transactions WHERE id = ?").get(id),

  create: (tx: any) => {
    return db
      .prepare(
        `
      INSERT INTO transactions (id, account_id, date, description, category_id, amount, type, notes, merchant, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      )
      .run(
        tx.id,
        tx.account_id,
        tx.date,
        tx.description,
        tx.category_id,
        tx.amount,
        tx.type,
        tx.notes,
        tx.merchant,
        tx.source || "manual",
      );
  },

  bulkCreate: (transactions: any[]) => {
    const insert = db.prepare(`
      INSERT OR IGNORE INTO transactions (id, account_id, date, description, category_id, amount, type, notes, merchant, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertMany = db.transaction((txs: any[]) => {
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
          tx.source,
        );
      }
    });
    insertMany(transactions);
  },

  update: (id: string, data: any) => {
    return db
      .prepare(
        `
      UPDATE transactions SET date = ?, description = ?, category_id = ?, amount = ?, type = ?, notes = ?, merchant = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
      )
      .run(
        data.date,
        data.description,
        data.category_id,
        data.amount,
        data.type,
        data.notes,
        data.merchant,
        id,
      );
  },

  delete: (id: string) =>
    db.prepare("DELETE FROM transactions WHERE id = ?").run(id),

  // Aggregations
  getSummary: (startDate: string, endDate: string) => {
    return db
      .prepare(
        `
      SELECT
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expense,
        COUNT(CASE WHEN type = 'income' THEN 1 END) as income_count,
        COUNT(CASE WHEN type = 'expense' THEN 1 END) as expense_count
      FROM transactions
      WHERE date BETWEEN ? AND ?
    `,
      )
      .get(startDate, endDate);
  },

  getCategoryBreakdown: (startDate: string, endDate: string, type: string) => {
    return db
      .prepare(
        `
      SELECT c.id, c.name, c.color, c.icon, SUM(t.amount) as total, COUNT(*) as count
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.date BETWEEN ? AND ? AND t.type = ?
      GROUP BY t.category_id
      ORDER BY total DESC
    `,
      )
      .all(startDate, endDate, type);
  },

  getMonthlyTrend: (months: number) => {
    return db
      .prepare(
        `
      SELECT 
        strftime('%Y-%m', date) as month,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
      FROM transactions
      WHERE date >= date('now', '-${months} months')
      GROUP BY month
      ORDER BY month
    `,
      )
      .all();
  },

  getDailySpending: (startDate: string, endDate: string) => {
    return db
      .prepare(
        `
      SELECT date, SUM(amount) as total
      FROM transactions
      WHERE type = 'expense' AND date BETWEEN ? AND ?
      GROUP BY date
      ORDER BY date
    `,
      )
      .all(startDate, endDate);
  },
};

// --- Budgets ---
export const dbBudgets = {
  getForMonth: (month: string) => {
    return db
      .prepare(
        `
      SELECT b.*, c.name as category_name, c.color, c.icon,
        COALESCE((
          SELECT SUM(amount) FROM transactions t
          WHERE t.category_id = b.category_id AND strftime('%Y-%m', t.date) = b.month AND t.type = 'expense'
        ), 0) as spent
      FROM budgets b
      JOIN categories c ON b.category_id = c.id
      WHERE b.month = ?
    `,
      )
      .all(month);
  },
  upsert: (budget: any) => {
    return db
      .prepare(
        `
      INSERT OR REPLACE INTO budgets (id, category_id, month, amount)
      VALUES (?, ?, ?, ?)
    `,
      )
      .run(budget.id, budget.category_id, budget.month, budget.amount);
  },
  delete: (id: string) =>
    db.prepare("DELETE FROM budgets WHERE id = ?").run(id),
};

// --- Holdings ---
export const dbHoldings = {
  getAll: () =>
    db
      .prepare(
        "SELECT * FROM holdings WHERE is_active = 1 ORDER BY asset_type, symbol",
      )
      .all(),
  getById: (id: string) =>
    db.prepare("SELECT * FROM holdings WHERE id = ?").get(id),
  create: (holding: any) => {
    return db
      .prepare(
        `
      INSERT INTO holdings (id, symbol, name, quantity, buy_price, buy_date, asset_type, broker, exchange, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      )
      .run(
        holding.id,
        holding.symbol,
        holding.name,
        holding.quantity,
        holding.buy_price,
        holding.buy_date,
        holding.asset_type,
        holding.broker,
        holding.exchange,
        holding.notes,
      );
  },
  update: (id: string, data: any) => {
    return db
      .prepare(
        `
      UPDATE holdings SET quantity = ?, buy_price = ?, buy_date = ?, broker = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
      )
      .run(
        data.quantity,
        data.buy_price,
        data.buy_date,
        data.broker,
        data.notes,
        id,
      );
  },
  delete: (id: string) =>
    db.prepare("UPDATE holdings SET is_active = 0 WHERE id = ?").run(id),
};

// --- Price Cache ---
export const dbPriceCache = {
  get: (symbol: string) =>
    db.prepare("SELECT * FROM price_cache WHERE symbol = ?").get(symbol),
  getAll: () => db.prepare("SELECT * FROM price_cache").all(),
  upsert: (data: any) => {
    return db
      .prepare(
        `
      INSERT OR REPLACE INTO price_cache (symbol, price, change_percent, previous_close, market_cap, volume, source, last_updated)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `,
      )
      .run(
        data.symbol,
        data.price,
        data.change_percent,
        data.previous_close,
        data.market_cap,
        data.volume,
        data.source,
      );
  },
  setManual: (symbol: string, price: number, note: string) => {
    return db
      .prepare(
        `
      UPDATE price_cache SET price = ?, is_manual = 1, manual_note = ?, last_updated = CURRENT_TIMESTAMP WHERE symbol = ?
    `,
      )
      .run(price, note, symbol);
  },
  isStale: (symbol: string, minutesThreshold: number) => {
    const row = db
      .prepare(
        `
      SELECT CAST((julianday('now') - julianday(last_updated)) * 24 * 60 AS INTEGER) as minutes_ago
      FROM price_cache WHERE symbol = ?
    `,
      )
      .get(symbol) as { minutes_ago: number } | undefined;
    if (!row) return true;
    return row.minutes_ago > minutesThreshold;
  },
};

// --- Goals ---
export const dbGoals = {
  getAll: () =>
    db
      .prepare(
        "SELECT * FROM goals WHERE is_active = 1 ORDER BY priority, created_at",
      )
      .all(),
  getById: (id: string) =>
    db.prepare("SELECT * FROM goals WHERE id = ?").get(id),
  create: (goal: any) => {
    return db
      .prepare(
        `
      INSERT INTO goals (id, name, description, target_amount, current_amount, target_date, category, icon, color, priority)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      )
      .run(
        goal.id,
        goal.name,
        goal.description,
        goal.target_amount,
        goal.current_amount,
        goal.target_date,
        goal.category,
        goal.icon,
        goal.color,
        goal.priority,
      );
  },
  update: (id: string, data: any) => {
    return db
      .prepare(
        `
      UPDATE goals SET name = ?, description = ?, target_amount = ?, current_amount = ?, target_date = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
      )
      .run(
        data.name,
        data.description,
        data.target_amount,
        data.current_amount,
        data.target_date,
        id,
      );
  },
  delete: (id: string) =>
    db.prepare("UPDATE goals SET is_active = 0 WHERE id = ?").run(id),
};

// --- Milestones ---
export const dbMilestones = {
  create: (milestone: any) => {
    return db
      .prepare(
        `
      INSERT OR IGNORE INTO milestones (id, type, value, title, message)
      VALUES (?, ?, ?, ?, ?)
    `,
      )
      .run(
        milestone.id,
        milestone.type,
        milestone.value,
        milestone.title,
        milestone.message,
      );
  },
  getUncelebrated: () =>
    db
      .prepare(
        "SELECT * FROM milestones WHERE celebrated = 0 ORDER BY achieved_at DESC LIMIT 5",
      )
      .all(),
  markCelebrated: (id: string) =>
    db.prepare("UPDATE milestones SET celebrated = 1 WHERE id = ?").run(id),
};

// --- Insights ---
export const dbInsights = {
  getActive: () => {
    return db
      .prepare(
        `
      SELECT * FROM insights
      WHERE is_dismissed = 0 AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
      ORDER BY priority DESC, created_at DESC
      LIMIT 10
    `,
      )
      .all();
  },
  create: (insight: any) => {
    return db
      .prepare(
        `
      INSERT INTO insights (id, type, title, content, priority, category, action_label, action_data, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      )
      .run(
        insight.id,
        insight.type,
        insight.title,
        insight.content,
        insight.priority,
        insight.category,
        insight.action_label,
        insight.action_data,
        insight.expires_at,
      );
  },
  dismiss: (id: string) =>
    db.prepare("UPDATE insights SET is_dismissed = 1 WHERE id = ?").run(id),
  clearAll: () => db.prepare("UPDATE insights SET is_dismissed = 1").run(),
};

// --- Weekly Story ---
export const dbWeeklyStory = {
  get: (weekStart: string) =>
    db
      .prepare("SELECT * FROM weekly_stories WHERE week_start = ?")
      .get(weekStart),
  save: (story: any) => {
    return db
      .prepare(
        `
      INSERT OR REPLACE INTO weekly_stories (id, week_start, story, highlights, mood)
      VALUES (?, ?, ?, ?, ?)
    `,
      )
      .run(
        story.id,
        story.week_start,
        story.story,
        story.highlights,
        story.mood,
      );
  },
  getLatest: () =>
    db
      .prepare("SELECT * FROM weekly_stories ORDER BY week_start DESC LIMIT 1")
      .get(),
};
