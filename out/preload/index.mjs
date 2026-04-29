import { contextBridge, ipcRenderer } from "electron";
import { electronAPI } from "@electron-toolkit/preload";
const api = {
  // Window controls
  window: {
    minimize: () => ipcRenderer.send("window:minimize"),
    maximize: () => ipcRenderer.send("window:maximize"),
    close: () => ipcRenderer.send("window:close"),
    isMaximized: () => ipcRenderer.invoke("window:isMaximized")
  },
  // File dialogs
  dialog: {
    openFile: (options) => ipcRenderer.invoke("dialog:openFile", options),
    saveFile: (options) => ipcRenderer.invoke("dialog:saveFile", options)
  },
  // Settings
  settings: {
    get: (key) => ipcRenderer.invoke("settings:get", key),
    set: (key, value) => ipcRenderer.invoke("settings:set", key, value),
    getAll: () => ipcRenderer.invoke("settings:getAll")
  },
  // Accounts
  accounts: {
    getAll: () => ipcRenderer.invoke("accounts:getAll"),
    create: (data) => ipcRenderer.invoke("accounts:create", data),
    update: (id, data) => ipcRenderer.invoke("accounts:update", id, data),
    delete: (id) => ipcRenderer.invoke("accounts:delete", id)
  },
  // Categories
  categories: {
    getAll: () => ipcRenderer.invoke("categories:getAll"),
    create: (data) => ipcRenderer.invoke("categories:create", data),
    update: (id, data) => ipcRenderer.invoke("categories:update", id, data),
    delete: (id) => ipcRenderer.invoke("categories:delete", id)
  },
  // Transactions
  transactions: {
    getAll: (filters) => ipcRenderer.invoke("transactions:getAll", filters),
    create: (data) => ipcRenderer.invoke("transactions:create", data),
    update: (id, data) => ipcRenderer.invoke("transactions:update", id, data),
    delete: (id) => ipcRenderer.invoke("transactions:delete", id),
    getSummary: (startDate, endDate) => ipcRenderer.invoke("transactions:getSummary", startDate, endDate),
    getCategoryBreakdown: (startDate, endDate, type) => ipcRenderer.invoke(
      "transactions:getCategoryBreakdown",
      startDate,
      endDate,
      type
    ),
    getMonthlyTrend: (months) => ipcRenderer.invoke("transactions:getMonthlyTrend", months),
    getDailySpending: (startDate, endDate) => ipcRenderer.invoke("transactions:getDailySpending", startDate, endDate),
    importCSV: (filePath, mapping) => ipcRenderer.invoke("transactions:importCSV", filePath, mapping),
    importExcel: (filePath, mapping) => ipcRenderer.invoke("transactions:importExcel", filePath, mapping)
  },
  // Budgets
  budgets: {
    getForMonth: (month) => ipcRenderer.invoke("budgets:getForMonth", month),
    upsert: (data) => ipcRenderer.invoke("budgets:upsert", data),
    delete: (id) => ipcRenderer.invoke("budgets:delete", id)
  },
  // Holdings
  holdings: {
    getAll: () => ipcRenderer.invoke("holdings:getAll"),
    create: (data) => ipcRenderer.invoke("holdings:create", data),
    update: (id, data) => ipcRenderer.invoke("holdings:update", id, data),
    delete: (id) => ipcRenderer.invoke("holdings:delete", id)
  },
  // Prices
  prices: {
    getStockPrice: (symbol) => ipcRenderer.invoke("prices:getStockPrice", symbol),
    getCryptoPrice: (symbol) => ipcRenderer.invoke("prices:getCryptoPrice", symbol),
    refreshAll: () => ipcRenderer.invoke("prices:refreshAll"),
    setManual: (symbol, price, note) => ipcRenderer.invoke("prices:setManual", symbol, price, note),
    getAll: () => ipcRenderer.invoke("prices:getAll"),
    getMarketOverview: () => ipcRenderer.invoke("prices:getMarketOverview")
  },
  // Goals
  goals: {
    getAll: () => ipcRenderer.invoke("goals:getAll"),
    create: (data) => ipcRenderer.invoke("goals:create", data),
    update: (id, data) => ipcRenderer.invoke("goals:update", id, data),
    delete: (id) => ipcRenderer.invoke("goals:delete", id)
  },
  // Milestones (delight)
  milestones: {
    getUncelebrated: () => ipcRenderer.invoke("milestones:getUncelebrated"),
    markCelebrated: (id) => ipcRenderer.invoke("milestones:markCelebrated", id)
  },
  // AI Insights
  insights: {
    getActive: () => ipcRenderer.invoke("insights:getActive"),
    dismiss: (id) => ipcRenderer.invoke("insights:dismiss", id),
    clearAll: () => ipcRenderer.invoke("insights:clearAll"),
    save: (insight) => ipcRenderer.invoke("insights:save", insight)
  },
  // Weekly story (delight)
  weeklyStory: {
    getLatest: () => ipcRenderer.invoke("weeklyStory:getLatest"),
    save: (story) => ipcRenderer.invoke("weeklyStory:save", story)
  },
  // News
  news: {
    fetch: (query) => ipcRenderer.invoke("news:fetch", query)
  },
  // Analytics
  analytics: {
    getNetWorthHistory: () => ipcRenderer.invoke("analytics:getNetWorthHistory"),
    getFinancialHealthScore: () => ipcRenderer.invoke("analytics:getFinancialHealthScore")
  }
};
if (process.contextIsolated) {
  contextBridge.exposeInMainWorld("electron", electronAPI);
  contextBridge.exposeInMainWorld("api", api);
} else {
  window.electron = electronAPI;
  window.api = api;
}
