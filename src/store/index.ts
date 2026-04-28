import { create } from "zustand";
import type {
  Account,
  Category,
  Transaction,
  Budget,
  Holding,
  Goal,
  Insight,
  NewsItem,
  FinancialHealthScore,
  WeeklyStory,
  AppSettings,
  Milestone,
} from "@/types";

interface AppState {
  // Settings
  settings: AppSettings;
  setSettings: (s: Partial<AppSettings>) => void;

  // Data
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  holdings: Holding[];
  goals: Goal[];
  insights: Insight[];
  news: NewsItem[];
  milestones: Milestone[];
  weeklyStory: WeeklyStory | null;
  healthScore: FinancialHealthScore | null;
  prices: Record<string, any>;

  // UI
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  isLoading: boolean;
  setIsLoading: (v: boolean) => void;
  activeModal: string | null;
  setActiveModal: (v: string | null) => void;

  // Setters
  setAccounts: (v: Account[]) => void;
  setCategories: (v: Category[]) => void;
  setTransactions: (v: Transaction[]) => void;
  setBudgets: (v: Budget[]) => void;
  setHoldings: (v: Holding[]) => void;
  setGoals: (v: Goal[]) => void;
  setInsights: (v: Insight[]) => void;
  setNews: (v: NewsItem[]) => void;
  setMilestones: (v: Milestone[]) => void;
  setWeeklyStory: (v: WeeklyStory | null) => void;
  setHealthScore: (v: FinancialHealthScore | null) => void;
  setPrices: (v: Record<string, any>) => void;
}

export const useStore = create<AppState>((set) => ({
  settings: {
    currency: "INR",
    theme: "dark",
    priceRefreshInterval: 15,
    onboardingComplete: false,
    dashboardLayout: "default",
  },
  setSettings: (s) =>
    set((state) => ({ settings: { ...state.settings, ...s } })),

  accounts: [],
  categories: [],
  transactions: [],
  budgets: [],
  holdings: [],
  goals: [],
  insights: [],
  news: [],
  milestones: [],
  weeklyStory: null,
  healthScore: null,
  prices: {},

  sidebarOpen: true,
  setSidebarOpen: (v) => set({ sidebarOpen: v }),
  isLoading: false,
  setIsLoading: (v) => set({ isLoading: v }),
  activeModal: null,
  setActiveModal: (v) => set({ activeModal: v }),

  setAccounts: (v) => set({ accounts: v }),
  setCategories: (v) => set({ categories: v }),
  setTransactions: (v) => set({ transactions: v }),
  setBudgets: (v) => set({ budgets: v }),
  setHoldings: (v) => set({ holdings: v }),
  setGoals: (v) => set({ goals: v }),
  setInsights: (v) => set({ insights: v }),
  setNews: (v) => set({ news: v }),
  setMilestones: (v) => set({ milestones: v }),
  setWeeklyStory: (v) => set({ weeklyStory: v }),
  setHealthScore: (v) => set({ healthScore: v }),
  setPrices: (v) => set({ prices: v }),
}));
