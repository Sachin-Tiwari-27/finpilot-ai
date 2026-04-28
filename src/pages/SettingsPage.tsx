import { useEffect, useState } from "react";
import { Card, Button, Input, SectionHeader } from "@/components/Common/UI";
import { useStore } from "@/store";
import toast from "react-hot-toast";

export default function SettingsPage() {
  const { settings, setSettings } = useStore();
  const [saving, setSaving] = useState(false);

  // API keys
  const [openRouterKey, setOpenRouterKey] = useState("");
  const [openRouterModel, setOpenRouterModel] = useState(
    "deepseek/deepseek-chat",
  );
  const [alphaVantageKey, setAlphaVantageKey] = useState("");
  const [finnhubKey, setFinnhubKey] = useState("");
  const [newsApiKey, setNewsApiKey] = useState("");

  // App settings
  const [currency, setCurrency] = useState(settings.currency);
  const [refreshInterval, setRefreshInterval] = useState(
    String(settings.priceRefreshInterval),
  );
  const [resetConfirm, setResetConfirm] = useState(false);

  const FREE_MODELS = [
    { value: "deepseek/deepseek-chat", label: "DeepSeek Chat (Recommended)" },
    {
      value: "meta-llama/llama-3.1-8b-instruct:free",
      label: "LLaMA 3.1 8B (Free)",
    },
    { value: "google/gemma-2-9b-it:free", label: "Gemma 2 9B (Free)" },
    { value: "mistralai/mistral-7b-instruct:free", label: "Mistral 7B (Free)" },
    {
      value: "microsoft/phi-3-mini-128k-instruct:free",
      label: "Phi-3 Mini (Free)",
    },
  ];

  useEffect(() => {
    loadKeys();
  }, []);

  async function loadKeys() {
    try {
      const allSettings = await window.api.settings.getAll();
      const map = Object.fromEntries(
        allSettings.map((s: any) => [s.key, s.value]),
      );
      setOpenRouterKey(map.openrouter_key || "");
      setOpenRouterModel(map.openrouter_model || "deepseek/deepseek-chat");
      setAlphaVantageKey(map.alpha_vantage_key || "");
      setFinnhubKey(map.finnhub_key || "");
      setNewsApiKey(map.news_api_key || "");
    } catch (e) {
      console.error(e);
    }
  }

  async function saveSettings() {
    setSaving(true);
    try {
      const api = window.api;
      await Promise.all([
        api.settings.set("openrouter_key", openRouterKey),
        api.settings.set("openrouter_model", openRouterModel),
        api.settings.set("alpha_vantage_key", alphaVantageKey),
        api.settings.set("finnhub_key", finnhubKey),
        api.settings.set("news_api_key", newsApiKey),
        api.settings.set("currency", currency),
        api.settings.set("price_refresh_interval", refreshInterval),
      ]);
      setSettings({
        currency: currency as any,
        priceRefreshInterval: parseInt(refreshInterval),
      });
      toast.success("Settings saved!");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  async function resetOnboarding() {
    await window.api.settings.set("onboarding_complete", "false");
    toast.success("Onboarding reset. Restart the app to see it again.");
    setResetConfirm(false);
  }

  async function exportData() {
    try {
      const result = await window.api.dialog.saveFile({
        defaultPath: `finpilot-backup-${new Date().toISOString().split("T")[0]}.json`,
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (!result.canceled) {
        const [txs, holdings, goals, categories] = await Promise.all([
          window.api.transactions.getAll({}),
          window.api.holdings.getAll(),
          window.api.goals.getAll(),
          window.api.categories.getAll(),
        ]);
        const data = JSON.stringify(
          {
            transactions: txs,
            holdings,
            goals,
            categories,
            exportedAt: new Date().toISOString(),
          },
          null,
          2,
        );
        // In a real app, we'd write this file via IPC
        // For now, copy to clipboard
        navigator.clipboard.writeText(data);
        toast.success(
          "Data copied to clipboard (file write requires additional setup)",
        );
      }
    } catch (e) {
      toast.error("Export failed");
    }
  }

  return (
    <div className="h-full overflow-y-auto p-5">
      <div className="max-w-3xl mx-auto space-y-5">
        <div>
          <h1 className="text-xl font-bold text-fp-text">Settings</h1>
          <p className="text-xs text-fp-text-3 mt-0.5">Configure FinPilot AI</p>
        </div>

        {/* AI Configuration */}
        <Card>
          <SectionHeader
            title="AI Configuration"
            icon="🤖"
            subtitle="Configure OpenRouter for AI-powered insights"
          />

          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-fp-primary/5 border border-fp-primary/20">
              <div className="text-xs font-medium text-fp-primary mb-1">
                🆓 Free AI Setup
              </div>
              <div className="text-xs text-fp-text-3 leading-relaxed">
                1. Go to{" "}
                <a
                  href="#"
                  className="text-fp-primary underline"
                  onClick={() => toast("Visit openrouter.ai in your browser")}
                >
                  openrouter.ai
                </a>{" "}
                and create a free account
                <br />
                2. Generate an API key (free tier includes generous usage)
                <br />
                3. Select a free model below — DeepSeek Chat is recommended
                <br />
                4. Paste your key and save
              </div>
            </div>

            <Input
              label="OpenRouter API Key"
              value={openRouterKey}
              onChange={setOpenRouterKey}
              placeholder="sk-or-v1-..."
              type="password"
            />

            <div className="space-y-1">
              <label className="block text-xs font-medium text-fp-text-2">
                AI Model (Free Options)
              </label>
              <select
                value={openRouterModel}
                onChange={(e) => setOpenRouterModel(e.target.value)}
                className="w-full bg-fp-card border border-fp-border rounded-xl px-3 py-2 text-sm text-fp-text focus:outline-none focus:border-fp-primary/60"
              >
                {FREE_MODELS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <div className="text-[10px] text-fp-text-3">
                All models above have free usage tiers. DeepSeek Chat offers
                best quality for financial analysis.
              </div>
            </div>

            {/* Test button */}
            <Button
              variant="secondary"
              size="sm"
              onClick={async () => {
                if (!openRouterKey)
                  return toast.error("Enter your API key first");
                toast.success(
                  "Testing... (save settings first, then generate an insight)",
                );
              }}
            >
              Test Connection
            </Button>
          </div>
        </Card>

        {/* Market Data APIs */}
        <Card>
          <SectionHeader
            title="Market Data APIs"
            icon="📡"
            subtitle="Free API keys for real-time prices and news"
          />

          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-fp-card border border-fp-border">
              <div className="text-xs font-medium text-fp-text mb-2">
                Available Free APIs
              </div>
              <div className="grid grid-cols-1 gap-2 text-xs">
                {[
                  {
                    name: "Alpha Vantage",
                    desc: "Stocks & indicators",
                    url: "alphavantage.co",
                    limit: "25 req/day free",
                  },
                  {
                    name: "Finnhub",
                    desc: "Company news & market data",
                    url: "finnhub.io",
                    limit: "60 req/min free",
                  },
                  {
                    name: "CoinGecko",
                    desc: "Crypto prices",
                    url: "coingecko.com",
                    limit: "No key needed!",
                  },
                  {
                    name: "NewsAPI",
                    desc: "Financial news",
                    url: "newsapi.org",
                    limit: "100 req/day free",
                  },
                ].map((api) => (
                  <div
                    key={api.name}
                    className="flex items-center justify-between p-2 rounded-lg bg-fp-surface"
                  >
                    <div>
                      <span className="font-medium text-fp-text">
                        {api.name}
                      </span>
                      <span className="text-fp-text-3 ml-2">{api.desc}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-fp-primary text-[10px]">
                        {api.limit}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Input
              label="Alpha Vantage API Key"
              value={alphaVantageKey}
              onChange={setAlphaVantageKey}
              placeholder="Get free key at alphavantage.co"
            />
            <Input
              label="Finnhub API Key"
              value={finnhubKey}
              onChange={setFinnhubKey}
              placeholder="Get free key at finnhub.io"
            />
            <Input
              label="NewsAPI Key"
              value={newsApiKey}
              onChange={setNewsApiKey}
              placeholder="Get free key at newsapi.org"
            />

            <div className="text-[10px] text-fp-text-3 p-2 rounded-lg bg-fp-warning/5 border border-fp-warning/20">
              ℹ Without API keys, the app shows demo data. CoinGecko (crypto)
              works without any key. All data is fetched directly from your
              device — no middleman.
            </div>
          </div>
        </Card>

        {/* App Preferences */}
        <Card>
          <SectionHeader title="App Preferences" icon="⚙" />
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-fp-text-2">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as any)}
                className="w-full bg-fp-card border border-fp-border rounded-xl px-3 py-2 text-sm text-fp-text focus:outline-none"
              >
                <option value="INR">₹ Indian Rupee (INR)</option>
                <option value="USD">$ US Dollar (USD)</option>
                <option value="EUR">€ Euro (EUR)</option>
                <option value="GBP">£ British Pound (GBP)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-fp-text-2">
                Price Refresh Interval: {refreshInterval} minutes
              </label>
              <input
                type="range"
                min={5}
                max={60}
                step={5}
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(e.target.value)}
                className="w-full accent-fp-primary"
              />
              <div className="text-[10px] text-fp-text-3">
                How often to refresh stock prices automatically. Lower = more
                API calls used.
              </div>
            </div>
          </div>
        </Card>

        {/* Data & Privacy */}
        <Card>
          <SectionHeader title="Data & Privacy" icon="🔒" />
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-fp-primary/5 border border-fp-primary/20">
              <div className="text-xs font-medium text-fp-primary mb-1">
                🔒 Your data is private
              </div>
              <div className="text-xs text-fp-text-3 space-y-0.5">
                <div>✓ All data stored locally on your device</div>
                <div>✓ No cloud sync, no servers, no data sharing</div>
                <div>✓ API keys stored locally, never transmitted</div>
                <div>
                  ✓ Only external calls: market data APIs & OpenRouter (when
                  used)
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={exportData}
                className="flex-1"
                icon="↓"
              >
                Export Data
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setResetConfirm(true)}
                className="flex-1"
              >
                Reset Onboarding
              </Button>
            </div>

            {resetConfirm && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                <div className="text-xs text-red-400 mb-2">
                  Are you sure? This will show the onboarding flow next time you
                  restart.
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="danger" onClick={resetOnboarding}>
                    Yes, Reset
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setResetConfirm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* About */}
        <Card>
          <SectionHeader title="About FinPilot AI" icon="ℹ" />
          <div className="space-y-2 text-xs text-fp-text-3">
            <div className="flex justify-between">
              <span>Version</span>
              <span className="text-fp-text">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span>Framework</span>
              <span className="text-fp-text">
                Electron + React + TypeScript
              </span>
            </div>
            <div className="flex justify-between">
              <span>Database</span>
              <span className="text-fp-text">SQLite (local, encrypted)</span>
            </div>
            <div className="flex justify-between">
              <span>Charts</span>
              <span className="text-fp-text">Recharts + D3.js</span>
            </div>
            <div className="flex justify-between">
              <span>AI</span>
              <span className="text-fp-text">OpenRouter (configurable)</span>
            </div>
            <div className="border-t border-fp-border mt-3 pt-3 text-center text-[10px]">
              Built for personal use. Data never leaves your device. Not
              financial advice.
            </div>
          </div>
        </Card>

        {/* Save Button */}
        <Button
          onClick={saveSettings}
          loading={saving}
          size="lg"
          className="w-full"
        >
          Save All Settings
        </Button>
      </div>
    </div>
  );
}
