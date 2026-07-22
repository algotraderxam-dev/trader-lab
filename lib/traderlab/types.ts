export type Plan = "demo" | "research" | "pro";

export type StrategyProject = {
  id: string;
  email: string;
  name: string;
  text: string;
  status: string;
  score: number;
  plan: Plan;
  analysis: StrategyAnalysis;
  createdAt: string;
  updatedAt: string;
};

export type StrategyAnalysis = {
  score: number;
  readiness: "blocked" | "needs_review" | "ready";
  summary: string;
  detectedMarket: string;
  dataMode: "assumption" | "trade_log";
  dataWarnings: string[];
  compiledSpec?: {
    name: string;
    symbol: string;
    timeframe: string;
    strategyType: string;
    side: string;
    session: string;
    entryQuality: string;
    automationBlockers: string[];
    assumptions: string[];
  };
  rules: AnalysisRule[];
  riskGates: RiskGate[];
  monteCarlo: MonteCarloSummary;
  blueprint: BlueprintPackage;
  report: ReportSummary;
};

export type AnalysisRule = {
  category: "Entry" | "Exit" | "Sizing" | "Filter" | "Session";
  rule: string;
  source: "detected" | "assumed" | "missing";
};

export type RiskGate = {
  label: string;
  status: "pass" | "warn" | "fail";
  detail: string;
};

export type MonteCarloSummary = {
  preset: string;
  passProbability: number;
  ruinProbability: number;
  timeoutProbability: number;
  suggestedRiskPct: number;
  medianDays: number;
  medianDrawdownR: number;
  engine?: unknown;
};

export type BlueprintPackage = {
  alerts: string[];
  webhookPayload: string;
  pineScript: string;
  rollout: string[];
};

export type ReportSummary = {
  title: string;
  version: string;
  findings: string[];
  nextActions: string[];
  evidence?: {
    dataSource: "assumption" | "trade_log";
    trades: number;
    winRate: number;
    expectancyR: number;
    profitFactor: number;
    maxDrawdown: number;
    spanDays: number;
  };
};

export type CheckoutRecord = {
  id: string;
  email: string;
  plan: Plan;
  status: "captured" | "test_mode";
  amount: number;
  createdAt: string;
};
