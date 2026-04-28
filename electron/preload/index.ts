import { contextBridge, ipcRenderer } from "electron";
import { electronAPI } from "@electron-toolkit/preload";

// Typed API object exposed to renderer
const api = {
  // Window controls
  window: {
    minimize: () => ipcRenderer.send("window:minimize"),
    maximize: () => ipcRenderer.send("window:maximize"),
    close: () => ipcRenderer.send("window:close"),
    isMaximized: () => ipcRenderer.invoke("window:isMaximized"),
  },

  // File dialogs
  dialog: {
    openFile: (options: Electron.OpenDialogOptions) =>
      ipcRenderer.invoke("dialog:openFile", options),
    saveFile: (options: Electron.SaveDialogOptions) =>
      ipcRenderer.invoke("dialog:saveFile", options),
  },

  // Settings
  settings: {
    get: (key: string) => ipcRenderer.invoke("settings:get", key),
    set: (key: string, value: string) =>
      ipcRenderer.invoke("settings:set", key, value),
    getAll: () => ipcRenderer.invoke("settings:getAll"),
  },

  // Accounts
  accounts: {
    getAll: () => ipcRenderer.invoke("accounts:getAll"),
    create: (data: any) => ipcRenderer.invoke("accounts:create", data),
    update: (id: string, data: any) =>
      ipcRenderer.invoke("accounts:update", id, data),
    delete: (id: string) => ipcRenderer.invoke("accounts:delete", id),
  },

  // Categories
  categories: {
    getAll: () => ipcRenderer.invoke("categories:getAll"),
    create: (data: any) => ipcRenderer.invoke("categories:create", data),
    update: (id: string, data: any) =>
      ipcRenderer.invoke("categories:update", id, data),
    delete: (id: string) => ipcRenderer.invoke("categories:delete", id),
  },

  // Transactions
  transactions: {
    getAll: (filters?: any) =>
      ipcRenderer.invoke("transactions:getAll", filters),
    create: (data: any) => ipcRenderer.invoke("transactions:create", data),
    update: (id: string, data: any) =>
      ipcRenderer.invoke("transactions:update", id, data),
    delete: (id: string) => ipcRenderer.invoke("transactions:delete", id),
    getSummary: (startDate: string, endDate: string) =>
      ipcRenderer.invoke("transactions:getSummary", startDate, endDate),
    getCategoryBreakdown: (startDate: string, endDate: string, type: string) =>
      ipcRenderer.invoke(
        "transactions:getCategoryBreakdown",
        startDate,
        endDate,
        type,
      ),
    getMonthlyTrend: (months: number) =>
      ipcRenderer.invoke("transactions:getMonthlyTrend", months),
    getDailySpending: (startDate: string, endDate: string) =>
      ipcRenderer.invoke("transactions:getDailySpending", startDate, endDate),
    importCSV: (filePath: string, mapping: any) =>
      ipcRenderer.invoke("transactions:importCSV", filePath, mapping),
    importExcel: (filePath: string, mapping: any) =>
      ipcRenderer.invoke("transactions:importExcel", filePath, mapping),
  },

  // Budgets
  budgets: {
    getForMonth: (month: string) =>
      ipcRenderer.invoke("budgets:getForMonth", month),
    upsert: (data: any) => ipcRenderer.invoke("budgets:upsert", data),
    delete: (id: string) => ipcRenderer.invoke("budgets:delete", id),
  },

  // Holdings
  holdings: {
    getAll: () => ipcRenderer.invoke("holdings:getAll"),
    create: (data: any) => ipcRenderer.invoke("holdings:create", data),
    update: (id: string, data: any) =>
      ipcRenderer.invoke("holdings:update", id, data),
    delete: (id: string) => ipcRenderer.invoke("holdings:delete", id),
  },

  // Prices
  prices: {
    getStockPrice: (symbol: string) =>
      ipcRenderer.invoke("prices:getStockPrice", symbol),
    getCryptoPrice: (symbol: string) =>
      ipcRenderer.invoke("prices:getCryptoPrice", symbol),
    refreshAll: () => ipcRenderer.invoke("prices:refreshAll"),
    setManual: (symbol: string, price: number, note: string) =>
      ipcRenderer.invoke("prices:setManual", symbol, price, note),
    getAll: () => ipcRenderer.invoke("prices:getAll"),
    getMarketOverview: () => ipcRenderer.invoke("prices:getMarketOverview"),
  },

  // Goals
  goals: {
    getAll: () => ipcRenderer.invoke("goals:getAll"),
    create: (data: any) => ipcRenderer.invoke("goals:create", data),
    update: (id: string, data: any) =>
      ipcRenderer.invoke("goals:update", id, data),
    delete: (id: string) => ipcRenderer.invoke("goals:delete", id),
  },

  // Milestones (delight)
  milestones: {
    getUncelebrated: () => ipcRenderer.invoke("milestones:getUncelebrated"),
    markCelebrated: (id: string) =>
      ipcRenderer.invoke("milestones:markCelebrated", id),
  },

  // AI Insights
  insights: {
    getActive: () => ipcRenderer.invoke("insights:getActive"),
    dismiss: (id: string) => ipcRenderer.invoke("insights:dismiss", id),
    clearAll: () => ipcRenderer.invoke("insights:clearAll"),
    save: (insight: any) => ipcRenderer.invoke("insights:save", insight),
  },

  // Weekly story (delight)
  weeklyStory: {
    getLatest: () => ipcRenderer.invoke("weeklyStory:getLatest"),
    save: (story: any) => ipcRenderer.invoke("weeklyStory:save", story),
  },

  // News
  news: {
    fetch: (query?: string) => ipcRenderer.invoke("news:fetch", query),
  },

  // Analytics
  analytics: {
    getNetWorthHistory: () =>
      ipcRenderer.invoke("analytics:getNetWorthHistory"),
    getFinancialHealthScore: () =>
      ipcRenderer.invoke("analytics:getFinancialHealthScore"),
  },
};

// Expose to renderer
if (process.contextIsolated) {
  contextBridge.exposeInMainWorld("electron", electronAPI);
  contextBridge.exposeInMainWorld("api", api);
} else {
  // @ts-ignore
  window.electron = electronAPI;
  // @ts-ignore
  window.api = api;
}

// Type export for TypeScript support in renderer
export type AppAPI = typeof api;
