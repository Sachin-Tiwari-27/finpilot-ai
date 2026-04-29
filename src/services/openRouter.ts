import axios from "axios";
import type { Transaction, Holding, FinancialHealthScore } from "@/types";

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";
const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || "";
// Free models: deepseek/deepseek-chat, meta-llama/llama-3.1-8b-instruct:free, google/gemma-2-9b-it:free
const MODEL = import.meta.env.VITE_OPENROUTER_MODEL || "deepseek/deepseek-chat";

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

async function chat(messages: Message[], maxTokens = 1000): Promise<string> {
  if (!API_KEY || API_KEY === "sk-or-v1-your-key-here") {
    return getDemoResponse(messages[messages.length - 1].content);
  }

  try {
    const response = await axios.post(
      `${OPENROUTER_BASE}/chat/completions`,
      {
        model: MODEL,
        messages,
        max_tokens: maxTokens,
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://finpilot.ai",
          "X-Title": "FinPilot AI",
        },
        timeout: 30000,
      },
    );
    return response.data.choices[0].message.content;
  } catch (err: any) {
    console.error("OpenRouter error:", err.response?.data || err.message);
    throw new Error(
      `AI unavailable: ${err.response?.data?.error?.message || err.message}`,
    );
  }
}

const SYSTEM_PROMPT = `You are FinPilot AI, an expert personal finance and investment advisor for Indian users.
You provide concise, actionable insights in plain language. Focus on:
- Practical, specific recommendations (not generic advice)
- Indian context (INR, NSE/BSE, Indian tax laws, ELSS, PPF, etc.)
- Data-driven analysis based on user's actual numbers
- Risk-appropriate advice based on the user's profile
Format your responses cleanly. When giving numbers, use Indian number format (Lakhs, Crores).
Keep responses under 300 words unless specifically asked for detail.`;

// ─── Core Analysis Functions ─────────────────────────────────────────────

export async function analyzeSpending(
  transactions: Transaction[],
  categories: any[],
  period: string,
): Promise<string> {
  const breakdown = transactions.reduce(
    (acc, t) => {
      const cat = t.category_name || "Uncategorized";
      acc[cat] = (acc[cat] || 0) + t.amount;
      return acc;
    },
    {} as Record<string, number>,
  );

  const topCategories = Object.entries(breakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cat, amt]) => `${cat}: ₹${amt.toLocaleString("en-IN")}`);

  const totalSpend = transactions
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);

  const messages: Message[] = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Analyze my spending for ${period}:
Total spent: ₹${totalSpend.toLocaleString("en-IN")}
Top categories: ${topCategories.join(", ")}

Give me 3 specific insights:
1. What's my biggest spending concern?
2. What can I cut back?
3. One positive observation

Keep it concise and actionable.`,
    },
  ];
  return chat(messages, 400);
}

export async function analyzePortfolio(
  holdings: Holding[],
  prices: Record<string, number>,
  totalValue: number,
): Promise<string> {
  const allocation = holdings.map((h) => {
    const value = h.quantity * (prices[h.symbol] || h.buy_price);
    return `${h.symbol} (${h.asset_type}): ₹${value.toLocaleString("en-IN")} (${((value / totalValue) * 100).toFixed(1)}%)`;
  });

  const messages: Message[] = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Analyze my investment portfolio:
Total value: ₹${totalValue.toLocaleString("en-IN")}
Holdings: ${allocation.join(", ")}

Give me:
1. Biggest risk in this portfolio
2. One specific rebalancing suggestion
3. Whether I should add/reduce exposure to any sector

Be specific with percentages and amounts.`,
    },
  ];
  return chat(messages, 400);
}

export async function getEntryExitAnalysis(
  symbol: string,
  currentPrice: number,
  buyPrice?: number,
  assetType?: string,
): Promise<{
  recommendation: string;
  entryRange: string;
  target: string;
  stopLoss: string;
  rationale: string;
}> {
  const messages: Message[] = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Give me a brief entry/exit analysis for ${symbol} (${assetType || "stock"}):
Current price: ₹${currentPrice.toLocaleString("en-IN")}
${buyPrice ? `My buy price: ₹${buyPrice.toLocaleString("en-IN")}` : "Not yet invested"}

Provide:
1. Entry range (if not invested) or Add more / Hold / Sell recommendation
2. Target price (12 months)
3. Stop loss level
4. Key reason (1-2 sentences)

Return as JSON: {"recommendation": "...", "entryRange": "...", "target": "...", "stopLoss": "...", "rationale": "..."}`,
    },
  ];

  try {
    const response = await chat(messages, 300);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    return {
      recommendation: response,
      entryRange: "See analysis",
      target: "N/A",
      stopLoss: "N/A",
      rationale: response,
    };
  } catch {
    return {
      recommendation: "Analysis unavailable",
      entryRange: "N/A",
      target: "N/A",
      stopLoss: "N/A",
      rationale:
        "Could not generate analysis. Please check your OpenRouter API key.",
    };
  }
}

export async function generateMonthlyInsights(
  healthScore: FinancialHealthScore,
  topExpenseCategories: any[],
  portfolioValue: number,
): Promise<{
  insights: Array<{
    title: string;
    content: string;
    priority: string;
    category: string;
  }>;
}> {
  const messages: Message[] = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Generate 3-4 personalized financial insights based on this data:
Financial health score: ${healthScore.score}/100
Monthly income: ₹${healthScore.income.toLocaleString("en-IN")}
Monthly expenses: ₹${healthScore.expenses.toLocaleString("en-IN")}
Savings rate: ${healthScore.savingsRate.toFixed(1)}%
Portfolio value: ₹${portfolioValue.toLocaleString("en-IN")}
Top expense categories: ${topExpenseCategories.map((c) => `${c.name}: ₹${c.total.toLocaleString("en-IN")}`).join(", ")}

Return JSON array of insights:
{"insights": [{"title": "...", "content": "...", "priority": "high|medium|low", "category": "spending|investing|saving|tax"}]}

Make each insight specific and actionable with exact numbers.`,
    },
  ];

  try {
    const response = await chat(messages, 600);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    return {
      insights: [
        {
          title: "Financial Overview",
          content: response,
          priority: "medium",
          category: "general",
        },
      ],
    };
  } catch {
    return { insights: [] };
  }
}

export async function generateWeeklyStory(
  weekIncome: number,
  weekExpense: number,
  topTransactions: Transaction[],
  previousWeekExpense: number,
): Promise<{ story: string; mood: string; highlights: string }> {
  const change =
    previousWeekExpense > 0
      ? ((weekExpense - previousWeekExpense) / previousWeekExpense) * 100
      : 0;

  const messages: Message[] = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Write a friendly, engaging "weekly financial story" (2-3 sentences) for this week:
Income this week: ₹${weekIncome.toLocaleString("en-IN")}
Spent this week: ₹${weekExpense.toLocaleString("en-IN")}
vs last week: ${change > 0 ? "+" : ""}${change.toFixed(0)}%
Notable transactions: ${topTransactions
        .slice(0, 3)
        .map((t) => `${t.description} ₹${t.amount}`)
        .join(", ")}

Write like a friendly financial narrator (not preachy). Also provide:
- mood: "positive", "negative", or "neutral"
- highlights: one line summary

Return JSON: {"story": "...", "mood": "...", "highlights": "..."}`,
    },
  ];

  try {
    const response = await chat(messages, 300);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    return {
      story: response,
      mood: "neutral",
      highlights: "Weekly summary generated",
    };
  } catch {
    return {
      story:
        weekExpense > weekIncome
          ? `This week was a bit heavy on spending - ₹${weekExpense.toLocaleString("en-IN")} went out vs ₹${weekIncome.toLocaleString("en-IN")} that came in. But awareness is the first step to improvement!`
          : `Good week! You earned ₹${weekIncome.toLocaleString("en-IN")} and spent ₹${weekExpense.toLocaleString("en-IN")}, leaving a healthy surplus.`,
      mood: weekExpense > weekIncome ? "negative" : "positive",
      highlights: `Net: ₹${(weekIncome - weekExpense).toLocaleString("en-IN")}`,
    };
  }
}

export async function projectGoal(
  goalName: string,
  targetAmount: number,
  currentAmount: number,
  monthlyContribution: number,
  expectedReturn: number,
): Promise<string> {
  const messages: Message[] = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Help me plan for this goal:
Goal: ${goalName}
Target: ₹${targetAmount.toLocaleString("en-IN")}
Current savings: ₹${currentAmount.toLocaleString("en-IN")}
Monthly contribution: ₹${monthlyContribution.toLocaleString("en-IN")}
Expected return: ${expectedReturn}% annually

Calculate:
1. Time to achieve goal
2. If I increase contribution by 20%, how much faster?
3. Best investment vehicle for this goal (Indian context: ELSS, mutual fund, FD, PPF etc.)
4. One specific tip

Keep response under 200 words.`,
    },
  ];
  return chat(messages, 300);
}

// Demo response when no API key is configured
function getDemoResponse(prompt: string): string {
  if (prompt.includes("spending") || prompt.includes("expense")) {
    return `Based on your spending patterns, your largest expense category is a significant portion of your budget. Consider setting a monthly cap and using UPI to track real-time spending. You could potentially save ₹3,000-5,000 monthly by optimizing subscriptions and dining expenses. On the positive side, your utility bills appear well-managed! 

💡 **Configure your OpenRouter API key in Settings → API Keys for personalized AI insights.**`;
  }
  if (prompt.includes("portfolio") || prompt.includes("holding")) {
    return `Your portfolio shows concentration risk — consider diversifying across sectors. A good target allocation for Indian investors: 60% large-cap equity, 20% mid-cap, 10% debt/bonds, 10% gold/international.

💡 **Add your OpenRouter API key in Settings for AI-powered portfolio analysis.**`;
  }
  return `This is a demo response. Configure your OpenRouter API key in Settings → API Keys to get personalized AI-powered financial insights!

OpenRouter is free to use with models like DeepSeek Chat. Visit openrouter.ai to get your free API key.`;
}
