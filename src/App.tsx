import { useEffect, useState } from "react";
import { MemoryRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import { useStore } from "@/store";
import Layout from "@/components/Layout/Layout";
import OnboardingFlow from "@/components/Onboarding/OnboardingFlow";
import MilestoneCelebration from "@/components/Common/MilestoneCelebration";

// Pages
import DashboardPage from "@/pages/DashboardPage";
import TransactionsPage from "@/pages/TransactionsPage";
import BudgetPage from "@/pages/BudgetPage";
import PortfolioPage from "@/pages/PortfolioPage";
import ResearchPage from "@/pages/ResearchPage";
import InsightsPage from "@/pages/InsightsPage";
import GoalsPage from "@/pages/GoalsPage";
import SettingsPage from "@/pages/SettingsPage";

export default function App() {
  const {
    settings,
    setSettings,
    setCategories,
    setAccounts,
    setHealthScore,
    setMilestones,
    milestones,
  } = useStore();

  const [initialized, setInitialized] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(false);

  useEffect(() => {
    initApp();
  }, []);

  async function initApp() {
    try {
      const api = window.api;

      // Load settings
      const allSettings = await api.settings.getAll();
      const settingMap = Object.fromEntries(
        allSettings.map((s: any) => [s.key, s.value]),
      );

      const onboardingComplete = settingMap.onboarding_complete === "true";
      setOnboardingDone(onboardingComplete);
      setSettings({
        currency: settingMap.currency || "INR",
        theme: settingMap.theme || "dark",
        onboardingComplete,
        priceRefreshInterval: parseInt(
          settingMap.price_refresh_interval || "15",
        ),
        dashboardLayout: settingMap.dashboard_layout || "default",
      });

      // Load core data in parallel
      const [categories, accounts, healthScore] = await Promise.all([
        api.categories.getAll(),
        api.accounts.getAll(),
        api.analytics.getFinancialHealthScore(),
      ]);

      setCategories(categories);
      setAccounts(accounts);
      setHealthScore(healthScore);

      // Check for uncelebrated milestones
      const uncelebrated = await api.milestones.getUncelebrated();
      if (uncelebrated.length > 0) setMilestones(uncelebrated);

      setInitialized(true);
    } catch (err) {
      console.error("App init error:", err);
      setInitialized(true);
    }
  }

  async function handleOnboardingComplete() {
    try {
      const api = window.api;
      if (!api) throw new Error("API not available");

      await api.settings.set("onboarding_complete", "true");
      setOnboardingDone(true);
      setSettings({ onboardingComplete: true });
      // Reload data after onboarding
      await initApp();
    } catch (err) {
      console.error("Onboarding completion error:", err);
    }
  }

  if (!initialized) {
    return (
      <div className="flex items-center justify-center w-full h-screen bg-fp-bg">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-fp-primary/20 flex items-center justify-center">
            <span className="text-3xl">📊</span>
          </div>
          <div className="text-fp-text-2 text-sm animate-pulse">
            Loading FinPilot AI...
          </div>
        </div>
      </div>
    );
  }

  if (!onboardingDone) {
    return (
      <>
        <OnboardingFlow onComplete={handleOnboardingComplete} />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#141E35",
              color: "#E8EDF5",
              border: "1px solid #1E2D4A",
            },
          }}
        />
      </>
    );
  }

  return (
    <MemoryRouter>
      <div className="flex flex-col h-screen bg-fp-bg overflow-hidden">
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="transactions" element={<TransactionsPage />} />
            <Route path="budget" element={<BudgetPage />} />
            <Route path="portfolio" element={<PortfolioPage />} />
            <Route path="research" element={<ResearchPage />} />
            <Route path="insights" element={<InsightsPage />} />
            <Route path="goals" element={<GoalsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>

        {/* Milestone Celebration Overlay */}
        {milestones.length > 0 && (
          <MilestoneCelebration
            milestone={milestones[0]}
            onDismiss={async () => {
              await window.api.milestones.markCelebrated(milestones[0].id);
              setMilestones(milestones.slice(1));
            }}
          />
        )}

        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#141E35",
              color: "#E8EDF5",
              border: "1px solid #1E2D4A",
              borderRadius: "12px",
            },
            success: {
              iconTheme: { primary: "#10D9A0", secondary: "#141E35" },
            },
            error: { iconTheme: { primary: "#FF4D6B", secondary: "#141E35" } },
          }}
        />
      </div>
    </MemoryRouter>
  );
}
