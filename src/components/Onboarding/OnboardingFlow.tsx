import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/Common/UI";
import toast from "react-hot-toast";

interface Props {
  onComplete: () => void;
}

type Step = "welcome" | "goals" | "account" | "done";

const TRACKING_OPTIONS = [
  {
    id: "expenses",
    icon: "💸",
    label: "Track expenses",
    desc: "Know where your money goes",
  },
  {
    id: "investments",
    icon: "📈",
    label: "Monitor investments",
    desc: "Stocks, MF, crypto portfolio",
  },
  {
    id: "savings",
    icon: "🏦",
    label: "Build savings",
    desc: "Work towards financial goals",
  },
  {
    id: "budget",
    icon: "📊",
    label: "Stick to budget",
    desc: "Control spending categories",
  },
];

const GOAL_TEMPLATES = [
  {
    id: "emergency",
    icon: "🛡️",
    label: "Emergency Fund",
    desc: "6 months of expenses",
    target: 300000,
  },
  {
    id: "home",
    icon: "🏠",
    label: "Buy a Home",
    desc: "Down payment savings",
    target: 2000000,
  },
  {
    id: "retirement",
    icon: "🌅",
    label: "Retirement",
    desc: "Long-term wealth building",
    target: 10000000,
  },
  {
    id: "travel",
    icon: "✈️",
    label: "Travel Fund",
    desc: "Your dream vacation",
    target: 100000,
  },
  {
    id: "education",
    icon: "🎓",
    label: "Education",
    desc: "Skill development or course",
    target: 500000,
  },
  {
    id: "custom",
    icon: "⭐",
    label: "Custom Goal",
    desc: "Define your own target",
    target: 0,
  },
];

export default function OnboardingFlow({ onComplete }: Props) {
  const [step, setStep] = useState<Step>("welcome");
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [selectedTracking, setSelectedTracking] = useState<string[]>([
    "expenses",
  ]);
  const [accountName, setAccountName] = useState("My Bank Account");
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleComplete() {
    setSaving(true);
    try {
      // Save account if income specified
      if (monthlyIncome && parseFloat(monthlyIncome) > 0) {
        await window.api.accounts.create({
          name: accountName,
          type: "checking",
          balance: parseFloat(monthlyIncome),
          currency: "INR",
        });
      }

      // Save selected goals
      for (const goalId of selectedGoals) {
        const template = GOAL_TEMPLATES.find((g) => g.id === goalId);
        if (template && template.id !== "custom") {
          await window.api.goals.create({
            name: template.label,
            description: template.desc,
            target_amount: template.target,
            current_amount: 0,
            category: "savings",
            icon: template.icon,
            color: "#10D9A0",
            priority: 1,
          });
        }
      }

      await onComplete();
    } catch (err) {
      toast.error("Setup failed. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const steps: Step[] = ["welcome", "goals", "account", "done"];
  const stepIndex = steps.indexOf(step);
  const progress = ((stepIndex + 1) / steps.length) * 100;

  return (
    <div className="fixed inset-0 bg-fp-bg flex items-center justify-center overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-fp-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-fp-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-lg mx-4">
        {/* Progress bar */}
        {step !== "welcome" && step !== "done" && (
          <div className="mb-6">
            <div className="h-1 bg-fp-border rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-fp-primary to-fp-accent"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <div className="flex justify-between mt-1">
              {steps
                .filter((s) => s !== "welcome" && s !== "done")
                .map((s, i) => (
                  <span
                    key={s}
                    className={`text-xs ${stepIndex > i + 1 ? "text-fp-primary" : stepIndex === i + 1 ? "text-fp-text" : "text-fp-text-3"}`}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </span>
                ))}
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* WELCOME */}
          {step === "welcome" && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              className="glass-card p-8 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="w-20 h-20 rounded-3xl bg-gradient-to-br from-fp-primary/30 to-fp-accent/30 border border-fp-primary/30 flex items-center justify-center text-4xl mx-auto mb-6"
              >
                📊
              </motion.div>
              <h1 className="text-3xl font-bold gradient-text-green mb-3">
                Welcome to FinPilot AI
              </h1>
              <p className="text-fp-text-2 mb-2">
                Your intelligent financial co-pilot.
              </p>
              <p className="text-fp-text-3 text-sm mb-8 leading-relaxed">
                Track spending, monitor investments, get AI insights, and build
                wealth — all in one place, completely private and local.
              </p>

              <div className="grid grid-cols-2 gap-3 mb-8 text-left">
                {TRACKING_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() =>
                      setSelectedTracking((prev) =>
                        prev.includes(opt.id)
                          ? prev.filter((x) => x !== opt.id)
                          : [...prev, opt.id],
                      )
                    }
                    className={`p-3 rounded-xl border transition-all text-left ${
                      selectedTracking.includes(opt.id)
                        ? "border-fp-primary/50 bg-fp-primary/10 text-fp-primary"
                        : "border-fp-border bg-fp-card text-fp-text-2 hover:border-fp-border/80"
                    }`}
                  >
                    <div className="text-xl mb-1">{opt.icon}</div>
                    <div className="text-xs font-semibold">{opt.label}</div>
                    <div className="text-[10px] opacity-70 mt-0.5">
                      {opt.desc}
                    </div>
                  </button>
                ))}
              </div>

              <Button
                onClick={() => setStep("goals")}
                size="lg"
                className="w-full"
              >
                Get Started →
              </Button>
              <p className="text-xs text-fp-text-3 mt-3">
                100% private · Data stored locally · No account needed
              </p>
            </motion.div>
          )}

          {/* GOALS */}
          {step === "goals" && (
            <motion.div
              key="goals"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              className="glass-card p-6"
            >
              <h2 className="text-xl font-bold text-fp-text mb-1">
                What are your financial goals?
              </h2>
              <p className="text-fp-text-3 text-sm mb-5">
                Select any that apply — you can add more later.
              </p>

              <div className="grid grid-cols-2 gap-2.5 mb-6">
                {GOAL_TEMPLATES.map((goal) => (
                  <button
                    key={goal.id}
                    onClick={() =>
                      setSelectedGoals((prev) =>
                        prev.includes(goal.id)
                          ? prev.filter((x) => x !== goal.id)
                          : [...prev, goal.id],
                      )
                    }
                    className={`p-3 rounded-xl border transition-all text-left ${
                      selectedGoals.includes(goal.id)
                        ? "border-fp-primary/50 bg-fp-primary/10"
                        : "border-fp-border bg-fp-card hover:border-fp-border/80"
                    }`}
                  >
                    <div className="text-2xl mb-1">{goal.icon}</div>
                    <div
                      className={`text-xs font-semibold ${selectedGoals.includes(goal.id) ? "text-fp-primary" : "text-fp-text"}`}
                    >
                      {goal.label}
                    </div>
                    <div className="text-[10px] text-fp-text-3 mt-0.5">
                      {goal.desc}
                    </div>
                    {goal.target > 0 && (
                      <div
                        className={`text-[10px] mt-1 font-mono ${selectedGoals.includes(goal.id) ? "text-fp-primary/70" : "text-fp-text-3"}`}
                      >
                        ₹{(goal.target / 100000).toFixed(0)}L target
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  onClick={() => setStep("welcome")}
                  className="flex-1"
                >
                  ← Back
                </Button>
                <Button onClick={() => setStep("account")} className="flex-1">
                  Next →
                </Button>
              </div>
            </motion.div>
          )}

          {/* ACCOUNT SETUP */}
          {step === "account" && (
            <motion.div
              key="account"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              className="glass-card p-6"
            >
              <h2 className="text-xl font-bold text-fp-text mb-1">
                Quick setup
              </h2>
              <p className="text-fp-text-3 text-sm mb-5">
                Optional — helps personalize your experience. You can skip this.
              </p>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-medium text-fp-text-2 mb-1">
                    Primary Bank / Account Name
                  </label>
                  <input
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    className="w-full bg-fp-card border border-fp-border rounded-xl px-3 py-2.5 text-sm text-fp-text focus:outline-none focus:border-fp-primary/60 transition-all"
                    placeholder="e.g. HDFC Salary Account"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-fp-text-2 mb-1">
                    Monthly Income (approximate)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-fp-text-3 text-sm">
                      ₹
                    </span>
                    <input
                      type="number"
                      value={monthlyIncome}
                      onChange={(e) => setMonthlyIncome(e.target.value)}
                      className="w-full bg-fp-card border border-fp-border rounded-xl pl-8 pr-3 py-2.5 text-sm text-fp-text focus:outline-none focus:border-fp-primary/60 transition-all"
                      placeholder="e.g. 80000"
                    />
                  </div>
                  <p className="text-[10px] text-fp-text-3 mt-1">
                    Used only to calculate your savings rate
                  </p>
                </div>

                {/* Import option */}
                <div className="p-4 rounded-xl border border-fp-border/50 bg-fp-card/50">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">📂</div>
                    <div>
                      <div className="text-sm font-medium text-fp-text">
                        Import bank statement later
                      </div>
                      <div className="text-xs text-fp-text-3">
                        CSV or Excel format supported. Go to Transactions →
                        Import.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  onClick={() => setStep("goals")}
                  className="flex-1"
                >
                  ← Back
                </Button>
                <Button onClick={() => setStep("done")} className="flex-1">
                  Almost done →
                </Button>
              </div>
            </motion.div>
          )}

          {/* DONE */}
          {step === "done" && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-8 text-center"
            >
              <motion.div
                animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-6xl mb-4"
              >
                🚀
              </motion.div>
              <h2 className="text-2xl font-bold text-fp-text mb-2">
                You're all set!
              </h2>
              <p className="text-fp-text-2 text-sm mb-6 leading-relaxed">
                Your financial command center is ready. Start by adding some
                transactions or importing your bank statement.
              </p>

              <div className="space-y-2 mb-6 text-left">
                <div className="flex items-center gap-2 text-xs text-fp-text-2">
                  <span className="text-fp-primary">✓</span> Dashboard with
                  real-time net worth tracking
                </div>
                <div className="flex items-center gap-2 text-xs text-fp-text-2">
                  <span className="text-fp-primary">✓</span> AI-powered spending
                  insights (configure key in Settings)
                </div>
                <div className="flex items-center gap-2 text-xs text-fp-text-2">
                  <span className="text-fp-primary">✓</span> Portfolio tracker
                  with live prices
                </div>
                {selectedGoals.length > 0 && (
                  <div className="flex items-center gap-2 text-xs text-fp-text-2">
                    <span className="text-fp-primary">✓</span>{" "}
                    {selectedGoals.length} goal
                    {selectedGoals.length > 1 ? "s" : ""} created for you
                  </div>
                )}
              </div>

              <Button
                onClick={handleComplete}
                loading={saving}
                size="lg"
                className="w-full"
              >
                Open FinPilot AI 🎯
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
