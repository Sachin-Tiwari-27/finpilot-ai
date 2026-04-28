import { ipcMain } from "electron";
import { randomUUID } from "crypto";
import { readFileSync } from "fs";
import Papa from "papaparse";
import * as XLSX from "xlsx";

import {
  dbSettings,
  dbAccounts,
  dbCategories,
  dbTransactions,
  dbBudgets,
  dbHoldings,
  dbPriceCache,
  dbGoals,
  dbMilestones,
  dbInsights,
  dbWeeklyStory,
} from "./db";
import {
  fetchStockPrice,
  fetchCryptoPrice,
  fetchMultiplePrices,
  fetchFinancialNews,
  fetchMarketOverview,
} from "./apiService";

export function registerAllHandlers(): void {
  // ─── Settings ─────────────────────────────────────────────────
  ipcMain.handle("settings:get", (_, key: string) => dbSettings.get(key));
  ipcMain.handle("settings:set", (_, key: string, value: string) => {
    dbSettings.set(key, value);
    return true;
  });
  ipcMain.handle("settings:getAll", () => dbSettings.getAll());

  // ─── Accounts ─────────────────────────────────────────────────
  ipcMain.handle("accounts:getAll", () => dbAccounts.getAll());
  ipcMain.handle("accounts:create", (_, data: any) => {
    const id = randomUUID();
    dbAccounts.create({ ...data, id });
    return { id, ...data };
  });
  ipcMain.handle("accounts:update", (_, id: string, data: any) => {
    dbAccounts.update(id, data);
    return true;
  });
  ipcMain.handle("accounts:delete", (_, id: string) => {
    dbAccounts.delete(id);
    return true;
  });

  // ─── Categories ───────────────────────────────────────────────
  ipcMain.handle("categories:getAll", () => dbCategories.getAll());
  ipcMain.handle("categories:create", (_, data: any) => {
    const id = randomUUID();
    dbCategories.create({ ...data, id });
    return { id, ...data };
  });
  ipcMain.handle("categories:update", (_, id: string, data: any) => {
    dbCategories.update(id, data);
    return true;
  });
  ipcMain.handle("categories:delete", (_, id: string) => {
    dbCategories.delete(id);
    return true;
  });

  // ─── Transactions ─────────────────────────────────────────────
  ipcMain.handle("transactions:getAll", (_, filters: any) =>
    dbTransactions.getAll(filters),
  );
  ipcMain.handle("transactions:create", (_, data: any) => {
    const id = randomUUID();
    dbTransactions.create({ ...data, id });
    checkMilestones();
    return { id, ...data };
  });
  ipcMain.handle("transactions:update", (_, id: string, data: any) => {
    dbTransactions.update(id, data);
    return true;
  });
  ipcMain.handle("transactions:delete", (_, id: string) => {
    dbTransactions.delete(id);
    return true;
  });
  ipcMain.handle(
    "transactions:getSummary",
    (_, startDate: string, endDate: string) =>
      dbTransactions.getSummary(startDate, endDate),
  );
  ipcMain.handle(
    "transactions:getCategoryBreakdown",
    (_, startDate: string, endDate: string, type: string) =>
      dbTransactions.getCategoryBreakdown(startDate, endDate, type),
  );
  ipcMain.handle("transactions:getMonthlyTrend", (_, months: number) =>
    dbTransactions.getMonthlyTrend(months),
  );
  ipcMain.handle(
    "transactions:getDailySpending",
    (_, startDate: string, endDate: string) =>
      dbTransactions.getDailySpending(startDate, endDate),
  );

  // ─── Import CSV/Excel ─────────────────────────────────────────
  ipcMain.handle(
    "transactions:importCSV",
    async (_, filePath: string, mapping: any) => {
      try {
        const content = readFileSync(filePath, "utf-8");
        const parsed = Papa.parse(content, {
          header: true,
          skipEmptyLines: true,
        });
        const rows = parsed.data as Record<string, string>[];

        const transactions = rows
          .map((row) => ({
            id: randomUUID(),
            date: parseDate(row[mapping.date]),
            description: row[mapping.description] || "Imported transaction",
            amount: Math.abs(
              parseFloat(row[mapping.amount]?.replace(/[₹,\s]/g, "") || "0"),
            ),
            type: determineType(row, mapping),
            category_id: mapping.defaultCategoryId,
            merchant: row[mapping.merchant] || null,
            notes: row[mapping.notes] || null,
            account_id: mapping.accountId || null,
            source: "csv_import",
          }))
          .filter((t) => t.amount > 0 && t.date);

        dbTransactions.bulkCreate(transactions);
        return { success: true, count: transactions.length };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },
  );

  ipcMain.handle(
    "transactions:importExcel",
    async (_, filePath: string, mapping: any) => {
      try {
        const workbook = XLSX.readFile(filePath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, any>[];

        const transactions = rows
          .map((row) => ({
            id: randomUUID(),
            date: parseDate(String(row[mapping.date] || "")),
            description: String(row[mapping.description] || "Imported"),
            amount: Math.abs(
              parseFloat(
                String(row[mapping.amount] || "0").replace(/[₹,\s]/g, ""),
              ),
            ),
            type: determineType(row, mapping),
            category_id: mapping.defaultCategoryId,
            merchant: row[mapping.merchant]
              ? String(row[mapping.merchant])
              : null,
            notes: null,
            account_id: mapping.accountId || null,
            source: "excel_import",
          }))
          .filter((t) => t.amount > 0 && t.date);

        dbTransactions.bulkCreate(transactions);
        return { success: true, count: transactions.length };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },
  );

  // ─── Budgets ──────────────────────────────────────────────────
  ipcMain.handle("budgets:getForMonth", (_, month: string) =>
    dbBudgets.getForMonth(month),
  );
  ipcMain.handle("budgets:upsert", (_, data: any) => {
    const id = data.id || randomUUID();
    dbBudgets.upsert({ ...data, id });
    return true;
  });
  ipcMain.handle("budgets:delete", (_, id: string) => {
    dbBudgets.delete(id);
    return true;
  });

  // ─── Holdings ─────────────────────────────────────────────────
  ipcMain.handle("holdings:getAll", () => dbHoldings.getAll());
  ipcMain.handle("holdings:create", (_, data: any) => {
    const id = randomUUID();
    dbHoldings.create({ ...data, id });
    return { id, ...data };
  });
  ipcMain.handle("holdings:update", (_, id: string, data: any) => {
    dbHoldings.update(id, data);
    return true;
  });
  ipcMain.handle("holdings:delete", (_, id: string) => {
    dbHoldings.delete(id);
    return true;
  });

  // ─── Price Data ───────────────────────────────────────────────
  ipcMain.handle("prices:getStockPrice", async (_, symbol: string) => {
    return fetchStockPrice(symbol);
  });
  ipcMain.handle("prices:getCryptoPrice", async (_, symbol: string) => {
    return fetchCryptoPrice(symbol);
  });
  ipcMain.handle("prices:refreshAll", async () => {
    const holdings = dbHoldings.getAll() as any[];
    if (holdings.length === 0) return {};
    return fetchMultiplePrices(
      holdings.map((h) => ({ symbol: h.symbol, asset_type: h.asset_type })),
    );
  });
  ipcMain.handle(
    "prices:setManual",
    (_, symbol: string, price: number, note: string) => {
      dbPriceCache.setManual(symbol, price, note);
      return true;
    },
  );
  ipcMain.handle("prices:getAll", () => dbPriceCache.getAll());
  ipcMain.handle("prices:getMarketOverview", async () => fetchMarketOverview());

  // ─── Goals ────────────────────────────────────────────────────
  ipcMain.handle("goals:getAll", () => dbGoals.getAll());
  ipcMain.handle("goals:create", (_, data: any) => {
    const id = randomUUID();
    dbGoals.create({ ...data, id });
    return { id, ...data };
  });
  ipcMain.handle("goals:update", (_, id: string, data: any) => {
    dbGoals.update(id, data);
    return true;
  });
  ipcMain.handle("goals:delete", (_, id: string) => {
    dbGoals.delete(id);
    return true;
  });

  // ─── Milestones ───────────────────────────────────────────────
  ipcMain.handle("milestones:getUncelebrated", () =>
    dbMilestones.getUncelebrated(),
  );
  ipcMain.handle("milestones:markCelebrated", (_, id: string) => {
    dbMilestones.markCelebrated(id);
    return true;
  });

  // ─── AI Insights ──────────────────────────────────────────────
  ipcMain.handle("insights:getActive", () => dbInsights.getActive());
  ipcMain.handle("insights:dismiss", (_, id: string) => {
    dbInsights.dismiss(id);
    return true;
  });
  ipcMain.handle("insights:clearAll", () => {
    dbInsights.clearAll();
    return true;
  });
  ipcMain.handle("insights:save", (_, insight: any) => {
    const id = randomUUID();
    dbInsights.create({ ...insight, id });
    return true;
  });

  // ─── Weekly Story ─────────────────────────────────────────────
  ipcMain.handle("weeklyStory:getLatest", () => dbWeeklyStory.getLatest());
  ipcMain.handle("weeklyStory:save", (_, story: any) => {
    const id = randomUUID();
    dbWeeklyStory.save({ ...story, id });
    return true;
  });

  // ─── News ─────────────────────────────────────────────────────
  ipcMain.handle("news:fetch", async (_, query?: string) =>
    fetchFinancialNews(query),
  );

  // ─── Analytics ────────────────────────────────────────────────
  ipcMain.handle("analytics:getNetWorthHistory", () => {
    // Calculate net worth at different points
    return [];
  });

  ipcMain.handle("analytics:getFinancialHealthScore", () => {
    const now = new Date();
    const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const endOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-31`;

    const summary = dbTransactions.getSummary(startOfMonth, endOfMonth) as any;
    const income = summary?.total_income || 0;
    const expenses = summary?.total_expense || 0;

    const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;
    const expenseRatio = income > 0 ? (expenses / income) * 100 : 100;

    // Simple health score calculation
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
      savings: income - expenses,
    };
  });
}

// ─── Milestone Checker ───────────────────────────────────────────
function checkMilestones() {
  const milestoneNetWorths = [
    100000, 500000, 1000000, 2500000, 5000000, 10000000,
  ]; // ₹1L, 5L, 10L, 25L, 50L, 1Cr
  const summary = dbTransactions.getSummary("2000-01-01", "2099-12-31") as any;
  const netWorth = (summary?.total_income || 0) - (summary?.total_expense || 0);

  for (const milestone of milestoneNetWorths) {
    if (netWorth >= milestone) {
      const id = `milestone_nw_${milestone}`;
      const label =
        milestone >= 10000000
          ? "₹1 Crore! 🎉"
          : milestone >= 1000000
            ? `₹${milestone / 100000}L 🚀`
            : `₹${milestone / 100000}L`;
      dbMilestones.create({
        id,
        type: "net_worth",
        value: milestone,
        title: `You hit ${label}!`,
        message: `Your net savings just crossed ${label}. Keep up the great work! 🌟`,
      });
    }
  }
}

// ─── Helpers ─────────────────────────────────────────────────────
function parseDate(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split(/[\/\-\.]/);
  if (parts.length < 3) return dateStr;

  // Try DD/MM/YYYY (Indian format)
  if (parts[0].length <= 2 && parseInt(parts[0]) <= 31) {
    const [day, month, year] = parts;
    return `${year.length === 2 ? "20" + year : year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  // Try YYYY-MM-DD (ISO format)
  if (parts[0].length === 4) return dateStr;

  return dateStr;
}

function determineType(row: Record<string, any>, mapping: any): string {
  if (mapping.type && row[mapping.type]) {
    const typeVal = String(row[mapping.type]).toLowerCase();
    if (
      typeVal.includes("credit") ||
      typeVal.includes("income") ||
      typeVal.includes("cr")
    )
      return "income";
    return "expense";
  }
  if (mapping.creditColumn && row[mapping.creditColumn]) return "income";
  if (mapping.debitColumn && row[mapping.debitColumn]) return "expense";
  return "expense";
}
