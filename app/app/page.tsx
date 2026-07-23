"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { MonteCarlo } from "@/components/MonteCarlo";
import { BacktestLab } from "@/components/BacktestLab";
import { AutomationBlueprint } from "@/components/AutomationBlueprint";
import { ShareableReport } from "@/components/ShareableReport";
import { StrategyScore, StrategyVersions } from "@/components/StrategyScore";
import {
  SAMPLE_STRATEGY,
  RULES,
  RISK_CHECKS,
  BACKTEST_PREP,
  ALERT_CONFIG,
  PINE_SCRIPT,
  ROLLOUT,
} from "@/lib/mockBlueprint";
import type { AnalysisRule, RiskGate, StrategyAnalysis } from "@/lib/traderlab/types";
import type { TradeStats } from "@/lib/traderlab/metrics";

const STEPS = ["Describe", "Rules", "Risk gates", "Test plan", "Automation"];
const MODULES = ["Overview", "Strategy", "Backtest", "Monte Carlo", "Blueprint", "Report"] as const;
type Module = (typeof MODULES)[number];
type Plan = "demo" | "research" | "pro";
type AccessState = "checking" | "active" | "locked" | "signed_out";
type SavedProject = {
  id: string;
  email?: string;
  name: string;
  updatedAt: string;
  score: number;
  text: string;
  status: string;
  analysis?: StrategyAnalysis;
};

type TradeLogState = {
  csv: string;
  trades: number;
  warnings: string[];
  stats: TradeStats;
};

const ANALYZE_LINES = [
  "Parsing strategy description…",
  "Extracting entry / exit logic…",
  "Resolving ambiguous conditions…",
  "Running 11-point risk audit…",
  "Preparing automation package…",
];

export default function App() {
  const [module, setModule] = useState<Module>("Overview");
  const [step, setStep] = useState(0);
  const [text, setText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeLine, setAnalyzeLine] = useState(0);
  const [maxStep, setMaxStep] = useState(0);
  const [plan, setPlan] = useState<Plan>("demo");
  const [email, setEmail] = useState("");
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [activeAnalysis, setActiveAnalysis] = useState<StrategyAnalysis | null>(null);
  const [tradeLog, setTradeLog] = useState<TradeLogState | null>(null);
  const [uploadingTradeLog, setUploadingTradeLog] = useState(false);
  const [tradeLogError, setTradeLogError] = useState("");
  const [notice, setNotice] = useState("");
  const [serverState, setServerState] = useState<"syncing" | "online" | "local">("syncing");
  const [accessState, setAccessState] = useState<AccessState>("checking");
  const [accessSource, setAccessSource] = useState("checking");

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("module");
    if (requested === "overview") setModule("Overview");
    if (requested === "strategy") setModule("Strategy");
    if (requested === "backtest") setModule("Backtest");
    if (requested === "odds" || requested === "montecarlo") setModule("Monte Carlo");
    if (requested === "blueprint") setModule("Blueprint");
    if (requested === "report") setModule("Report");

    const savedPlan = localStorage.getItem("quantpilot_plan");
    if (savedPlan === "research" || savedPlan === "pro") setPlan(savedPlan);

    fetch("/api/auth/session")
      .then((response) => response.json())
      .then((payload) => {
        if (!payload.user?.email) {
          setAccessState("signed_out");
          setAccessSource(payload.configured ? "signed_out" : "auth_not_configured");
          return null;
        }
        setEmail(payload.user.email);
        return fetch("/api/access");
      })
      .then((response) => {
        if (!response) return null;
        if (response.status === 401) {
          setAccessState("signed_out");
          return null;
        }
        return response.json();
      })
      .then((payload) => {
        if (!payload) return;
        if (payload.access?.plan === "research" || payload.access?.plan === "pro" || payload.access?.plan === "demo") {
          setPlan(payload.access.plan);
        }
        setAccessSource(payload.access?.source || "none");
        setAccessState(payload.access?.active ? "active" : "locked");
        if (payload.access?.active) {
          fetch("/api/projects")
            .then((response) => {
              if (!response.ok) throw new Error("Could not load projects.");
              return response.json();
            })
            .then((projectsPayload) => {
              if (Array.isArray(projectsPayload.projects)) {
                setProjects(projectsPayload.projects);
                setSelectedProjectId((current) => current || projectsPayload.projects[0]?.id || "");
              }
              setServerState("online");
            })
            .catch(() => setServerState("local"));
        }
      })
      .catch(() => {
        setAccessState("signed_out");
        setAccessSource("local");
      });
  }, []);

  useEffect(() => {
    if (!analyzing) return;
    if (analyzeLine >= ANALYZE_LINES.length) {
      setAnalyzing(false);
      setStep(1);
      setMaxStep(1);
      return;
    }
    const t = setTimeout(() => setAnalyzeLine((l) => l + 1), 550);
    return () => clearTimeout(t);
  }, [analyzing, analyzeLine]);

  const run = async () => {
    if (!text.trim()) return;
    setAnalyzeLine(0);
    setAnalyzing(true);
    setActiveAnalysis(null);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, csv: tradeLog?.csv }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Validation failed");
      setActiveAnalysis(payload.analysis);
      setNotice(`Server score ${payload.analysis.score}/100`);
      setTimeout(() => setNotice(""), 2200);
    } catch {
      setServerState("local");
      setNotice("Using local demo mode");
      setTimeout(() => setNotice(""), 2200);
    }
  };

  const saveProject = async () => {
    const body = text.trim() || SAMPLE_STRATEGY;
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: body, csv: tradeLog?.csv }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Project save failed");
      const nextProjects = [payload.project, ...projects.filter((project) => project.id !== payload.project.id)].slice(
        0,
        plan === "demo" ? 2 : plan === "research" ? 20 : 100,
      );
      setProjects(nextProjects);
      setSelectedProjectId(payload.project.id);
      setActiveAnalysis(payload.project.analysis);
      setServerState("online");
      setNotice("Project saved to backend");
    } catch {
      const fallback: SavedProject = {
        id: crypto.randomUUID(),
        name: body.includes("EURUSD") ? "EURUSD EMA50 Pullback" : `Strategy ${projects.length + 1}`,
        updatedAt: new Date().toISOString(),
        score: 60 + Math.min(18, Math.floor(body.length / 40)),
        text: body,
        status: body.length > 120 ? "Ready for validation" : "Needs detail",
      };
      const nextProjects = [fallback, ...projects].slice(0, plan === "demo" ? 2 : plan === "research" ? 20 : 100);
      setProjects(nextProjects);
      setSelectedProjectId(fallback.id);
      setServerState("local");
      setNotice("Project saved locally");
    }
    setTimeout(() => setNotice(""), 1800);
  };

  const seedDemoProjects = async () => {
    try {
      const response = await fetch("/api/demo-projects/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not seed demo projects");
      const refreshed = await fetch("/api/projects").then((res) => res.json());
      const nextProjects = Array.isArray(refreshed.projects) ? refreshed.projects : [];
      setProjects(nextProjects);
      setSelectedProjectId(nextProjects[0]?.id || "");
      setServerState("online");
      setNotice(`Loaded ${payload.seeded || nextProjects.length} demo projects`);
    } catch {
      setNotice("Could not load demo projects");
    }
    setTimeout(() => setNotice(""), 2200);
  };

  const loadProject = (project: SavedProject) => {
    setText(project.text);
    setActiveAnalysis(project.analysis || null);
    setSelectedProjectId(project.id);
    setModule("Strategy");
    setStep(0);
    setNotice(`Loaded ${project.name}`);
    setTimeout(() => setNotice(""), 1800);
  };

  const uploadTradeLog = async (file: File) => {
    setUploadingTradeLog(true);
    setTradeLogError("");
    try {
      const csv = await file.text();
      const response = await fetch("/api/trade-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not parse trade log.");
      setTradeLog({
        csv,
        trades: payload.trades.length,
        warnings: payload.warnings || [],
        stats: payload.stats,
      });
      setNotice(`Loaded ${payload.trades.length} trades`);
      setTimeout(() => setNotice(""), 2200);
    } catch (error) {
      setTradeLog(null);
      setTradeLogError(error instanceof Error ? error.message : "Could not parse trade log.");
    } finally {
      setUploadingTradeLog(false);
    }
  };

  const clearTradeLog = () => {
    setTradeLog(null);
    setTradeLogError("");
  };

  const next = () => {
    const s = Math.min(step + 1, 4);
    setStep(s);
    setMaxStep((m) => Math.max(m, s));
  };

  const selectedProject = projects.find((project) => project.id === selectedProjectId) || projects[0] || null;

  const openProject = (project: SavedProject) => {
    setSelectedProjectId(project.id);
    setText(project.text);
    setActiveAnalysis(project.analysis || null);
    setModule("Overview");
    setNotice(`Opened ${project.name}`);
    setTimeout(() => setNotice(""), 1800);
  };

  return (
    <main className="flex-1">
      <header className="sticky top-0 z-40 border-b border-edge bg-bg/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5">
          <div className="flex items-center gap-8">
            <Link href="/"><Logo /></Link>
            <nav className="flex items-center gap-1">
              {MODULES.map((m) => (
                <button
                  key={m}
                  onClick={() => setModule(m)}
                  className={`rounded-md px-3 py-1.5 text-sm transition ${
                    module === m ? "bg-raised text-ink" : "text-dim hover:text-ink"
                  }`}
                >
                  {m}
                </button>
              ))}
            </nav>
          </div>
          <div className="hidden items-center gap-3 sm:flex">
            {notice && <span className="text-xs text-accent">{notice}</span>}
            <span className={`rounded-full border px-2.5 py-1 text-xs ${
              accessState === "active"
                ? "border-pos/40 text-pos"
                : accessState === "checking"
                  ? "border-warn/40 text-warn"
                  : "border-edge-bright text-faint"
            }`}>
              {accessState === "active" ? "Access active" : accessState === "checking" ? "Checking" : accessState === "signed_out" ? "Sign in" : "Access needed"}
            </span>
            <span className="rounded-full border border-edge-bright px-2.5 py-1 text-xs text-dim">
              {plan === "demo" ? "Demo" : plan === "research" ? "Research" : "Pro"}
            </span>
            <Link href={accessState === "signed_out" ? "/login" : "/checkout?plan=pro"} className="rounded-md bg-ink px-3 py-1.5 text-xs font-medium text-black">
              {accessState === "signed_out" ? "Sign in" : "Upgrade"}
            </Link>
          </div>
        </div>
      </header>

      {/* stepper */}
      {module === "Strategy" && (
      <div className="border-b border-edge bg-raised/40">
        <div className="mx-auto flex max-w-5xl items-center gap-1 overflow-x-auto px-5 py-3">
          {STEPS.map((label, i) => {
            const active = i === step;
            const done = i < step;
            const reachable = i <= maxStep;
            return (
              <div key={label} className="flex shrink-0 items-center">
                {i > 0 && <div className={`mx-2 h-px w-6 sm:w-10 ${done || active ? "bg-accent/50" : "bg-edge"}`} />}
                <button
                  onClick={() => reachable && setStep(i)}
                  disabled={!reachable}
                  className={`flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-xs transition ${
                    active
                      ? "border-accent/60 bg-accent/10 text-accent"
                      : done
                        ? "border-edge-bright text-dim hover:text-ink"
                        : "border-edge text-faint"
                  } ${reachable ? "cursor-pointer" : "cursor-default"}`}
                >
                  <span>{done ? "✓" : i + 1}</span>
                  <span className="hidden sm:inline">{label}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
      )}

      <div className="mx-auto max-w-5xl px-5 py-10">
        <WorkspaceStatus
          plan={plan}
          email={email}
          projects={projects}
          serverState={serverState}
          activeAnalysis={activeAnalysis}
          onSave={saveProject}
          onLoad={loadProject}
          onSeed={seedDemoProjects}
          accessState={accessState}
          accessSource={accessSource}
        />
        {(accessState === "locked" || accessState === "signed_out") && (
          <AccessRequired email={email} />
        )}
        {accessState !== "locked" && accessState !== "signed_out" && (
        <>
        {module === "Overview" && (
          <WorkspaceOverview
            projects={projects}
            selectedProject={selectedProject}
            activeAnalysis={activeAnalysis || selectedProject?.analysis || null}
            onOpenProject={openProject}
            onSeed={seedDemoProjects}
            onStartStrategy={() => setModule("Strategy")}
            onShowReport={() => setModule("Report")}
          />
        )}
        {module === "Backtest" && <BacktestLab />}
        {module === "Monte Carlo" && <MonteCarlo />}
        {module === "Blueprint" && <AutomationBlueprint />}
        {module === "Report" && <ShareableReport />}
        {module === "Strategy" && step === 0 && (
          <StepDescribe
            text={text}
            setText={setText}
            analyzing={analyzing}
            analyzeLine={analyzeLine}
            onRun={run}
            onSave={saveProject}
            tradeLog={tradeLog}
            uploadingTradeLog={uploadingTradeLog}
            tradeLogError={tradeLogError}
            onUploadTradeLog={uploadTradeLog}
            onClearTradeLog={clearTradeLog}
            activeAnalysis={activeAnalysis}
          />
        )}
        {module === "Strategy" && step === 1 && <StepRules analysis={activeAnalysis} onNext={next} />}
        {module === "Strategy" && step === 2 && <StepRisk analysis={activeAnalysis} onNext={next} />}
        {module === "Strategy" && step === 3 && <StepBacktest analysis={activeAnalysis} onNext={next} />}
        {module === "Strategy" && step === 4 && <StepBlueprint analysis={activeAnalysis} />}
        </>
        )}
      </div>

      <footer className="mx-auto max-w-5xl px-5 pb-10">
        <p className="border-t border-edge pt-6 text-xs leading-relaxed text-faint">
          Educational tool only — not financial advice. QuantPilot structures your own
          ideas; it does not predict markets, recommend trades, or execute anything.
        </p>
      </footer>
    </main>
  );
}

function WorkspaceOverview({
  projects,
  selectedProject,
  activeAnalysis,
  onOpenProject,
  onSeed,
  onStartStrategy,
  onShowReport,
}: {
  projects: SavedProject[];
  selectedProject: SavedProject | null;
  activeAnalysis: StrategyAnalysis | null;
  onOpenProject: (project: SavedProject) => void;
  onSeed: () => void;
  onStartStrategy: () => void;
  onShowReport: () => void;
}) {
  const score = activeAnalysis?.score ?? selectedProject?.score ?? 0;
  const readiness = activeAnalysis?.readiness ?? "blocked";
  const gates = activeAnalysis?.riskGates ?? [];
  const failedGates = gates.filter((gate) => gate.status === "fail");
  const warnings = activeAnalysis?.dataWarnings ?? [];
  const latest = projects.slice(0, 5);

  return (
    <section className="fade-up space-y-6">
      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="premium-shell overflow-hidden rounded-xl border border-edge-bright bg-panel">
          <div className="relative border-b border-edge px-6 py-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs text-faint">Workspace overview</p>
                <h1 className="mt-3 text-3xl font-semibold leading-tight">
                  {selectedProject ? selectedProject.name : "Build the first validation package."}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-dim">
                  {activeAnalysis?.summary ||
                    "Load demo projects or describe a strategy. QuantPilot will produce rules, risk gates, odds, Pine, webhook JSON, and a report."}
                </p>
              </div>
              <ReadinessBadge score={score} readiness={readiness} />
            </div>
            <span className="trace-x pointer-events-none absolute inset-y-0 left-0 w-28 bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
          </div>

          <div className="grid gap-px bg-edge md:grid-cols-4">
            <DashCell label="Readiness" value={score ? `${score}/100` : "-"} tone={score >= 80 ? "text-pos" : score >= 60 ? "text-warn" : "text-danger"} />
            <DashCell label="P(pass)" value={activeAnalysis ? `${activeAnalysis.monteCarlo.passProbability}%` : "-"} tone="text-pos" />
            <DashCell label="P(ruin)" value={activeAnalysis ? `${activeAnalysis.monteCarlo.ruinProbability}%` : "-"} tone={activeAnalysis?.monteCarlo.ruinProbability ? "text-danger" : "text-dim"} />
            <DashCell label="Data" value={activeAnalysis?.dataMode === "trade_log" ? "Trade log" : activeAnalysis ? "Assumption" : "-"} tone={activeAnalysis?.dataMode === "trade_log" ? "text-accent" : "text-warn"} />
          </div>

          <div className="grid gap-px bg-edge lg:grid-cols-[1fr_0.9fr]">
            <div className="bg-panel p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs text-faint">Agent actions</p>
                <span className="text-xs text-accent">engine-backed</span>
              </div>
              <div className="mt-4 space-y-3">
                <AgentAction done label="Rule Agent" detail={activeAnalysis ? `${activeAnalysis.rules.length} rules compiled` : "waiting for strategy text"} />
                <AgentAction done={Boolean(activeAnalysis)} label="Risk Agent" detail={activeAnalysis ? `${failedGates.length} failed gates, ${gates.length} total checks` : "run validation to inspect blockers"} />
                <AgentAction done={Boolean(activeAnalysis)} label="Prop-Firm Agent" detail={activeAnalysis ? `${activeAnalysis.monteCarlo.preset}: ${activeAnalysis.monteCarlo.passProbability}% pass` : "waiting for trade distribution"} />
                <AgentAction done={Boolean(activeAnalysis?.blueprint)} label="Blueprint Agent" detail={activeAnalysis ? `${activeAnalysis.blueprint.alerts.length} alerts + Pine/webhook package` : "exports after validation"} />
              </div>
            </div>
            <div className="bg-panel p-5">
              <p className="text-xs text-faint">Next decision</p>
              <div className="mt-4 rounded-lg border border-edge bg-raised p-4">
                <p className="text-sm font-medium text-ink">
                  {failedGates.length
                    ? "Fix blockers before selling this as automation-ready."
                    : activeAnalysis
                      ? "Package is ready for report export and paper-validation handoff."
                      : "Start with a validation run or load the demo workspace."}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-dim">
                  {warnings[0] || "Keep the promise tight: QuantPilot validates and packages strategy logic. It does not trade for users or promise profits."}
                </p>
              </div>
              <div className="mt-4 grid gap-2">
                <button onClick={onStartStrategy} className="rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-black">
                  Run strategy agent
                </button>
                <button onClick={onShowReport} className="rounded-md border border-edge-bright px-4 py-2.5 text-sm text-dim transition hover:text-ink">
                  Open report builder
                </button>
                {selectedProject && (
                  <Link href={`/report/${selectedProject.id}`} className="rounded-md border border-accent/35 px-4 py-2.5 text-center text-sm text-accent transition hover:bg-accent/10">
                    Public report link
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-edge bg-panel">
          <div className="flex items-center justify-between border-b border-edge px-5 py-4">
            <div>
              <p className="text-xs text-faint">Projects</p>
              <h2 className="mt-1 text-lg font-medium">Saved strategies</h2>
            </div>
            <button onClick={onSeed} className="rounded-md border border-accent/35 px-3 py-1.5 text-xs text-accent transition hover:bg-accent/10">
              Load demos
            </button>
          </div>
          <div className="max-h-[520px] space-y-2 overflow-auto p-3">
            {latest.length ? latest.map((project) => (
              <button
                key={project.id}
                onClick={() => onOpenProject(project)}
                className={`w-full rounded-lg border p-4 text-left transition ${
                  selectedProject?.id === project.id
                    ? "border-accent/50 bg-accent/10"
                    : "border-edge bg-raised hover:border-edge-bright"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-medium text-ink">{project.name}</p>
                  <span className={project.score >= 80 ? "text-pos" : project.score >= 60 ? "text-warn" : "text-danger"}>
                    {project.score}
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-dim">{project.status}</p>
                <p className="mt-3 text-[11px] text-faint">{new Date(project.updatedAt).toLocaleString()}</p>
              </button>
            )) : (
              <div className="rounded-lg border border-dashed border-accent/35 bg-accent/5 p-5">
                <p className="text-sm font-medium text-ink">Start with proof, not a blank screen.</p>
                <p className="mt-2 text-sm leading-relaxed text-dim">
                  Load three trade-log-backed demo strategies, then open their readiness,
                  Monte Carlo odds, Pine draft, webhook JSON, and public report.
                </p>
                <button
                  onClick={onSeed}
                  className="mt-4 w-full rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-black transition hover:opacity-85"
                >
                  Load demo workspace
                </button>
                <button
                  onClick={onStartStrategy}
                  className="mt-2 w-full rounded-md border border-edge-bright px-4 py-2.5 text-sm text-dim transition hover:text-ink"
                >
                  Validate my first strategy
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedProject && activeAnalysis && (
        <ProjectDetail project={selectedProject} analysis={activeAnalysis} />
      )}
    </section>
  );
}

function ProjectDetail({ project, analysis }: { project: SavedProject; analysis: StrategyAnalysis }) {
  return (
    <div className="overflow-hidden rounded-xl border border-edge bg-panel">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-edge px-6 py-5">
        <div>
          <p className="text-xs text-faint">Project detail</p>
          <h2 className="mt-2 text-2xl font-semibold">{project.name}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/report/${project.id}`} className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-black">
            Share report
          </Link>
          <Link href="/app?module=blueprint" className="rounded-md border border-edge-bright px-4 py-2 text-sm text-dim">
            Blueprint
          </Link>
        </div>
      </div>
      <div className="grid gap-px bg-edge lg:grid-cols-3">
        <ProjectPanel title="Rules">
          {analysis.rules.slice(0, 6).map((rule) => (
            <div key={rule.rule} className="rounded-md border border-edge bg-raised px-3 py-2">
              <p className="text-xs text-faint">{rule.category} · {rule.source}</p>
              <p className="mt-1 text-sm text-dim">{rule.rule}</p>
            </div>
          ))}
        </ProjectPanel>
        <ProjectPanel title="Risk Gates">
          {analysis.riskGates.map((gate) => (
            <div key={gate.label} className="flex items-start justify-between gap-3 rounded-md border border-edge bg-raised px-3 py-2">
              <div>
                <p className="text-sm text-ink">{gate.label}</p>
                <p className="mt-1 text-xs text-faint">{gate.detail}</p>
              </div>
              <span className={gate.status === "pass" ? "text-pos" : gate.status === "warn" ? "text-warn" : "text-danger"}>
                {gate.status}
              </span>
            </div>
          ))}
        </ProjectPanel>
        <ProjectPanel title="Evidence">
          <DashMini label="Market" value={analysis.detectedMarket} />
          <DashMini label="Trades" value={String(analysis.report.evidence?.trades || 0)} />
          <DashMini label="Win rate" value={`${analysis.report.evidence?.winRate || 0}%`} />
          <DashMini label="Profit factor" value={String(analysis.report.evidence?.profitFactor || "-")} />
          <DashMini label="Suggested risk" value={`${analysis.monteCarlo.suggestedRiskPct}%`} />
        </ProjectPanel>
      </div>
    </div>
  );
}

function ProjectPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 bg-panel p-5">
      <p className="text-xs text-faint">{title}</p>
      {children}
    </div>
  );
}

function ReadinessBadge({ score, readiness }: { score: number; readiness: StrategyAnalysis["readiness"] }) {
  return (
    <div className="rounded-lg border border-edge-bright bg-bg px-4 py-3 text-right">
      <p className={score >= 80 ? "text-3xl text-pos" : score >= 60 ? "text-3xl text-warn" : "text-3xl text-danger"}>
        {score || "-"}
      </p>
      <p className="mt-1 text-xs text-faint">{readiness.replace("_", " ")}</p>
    </div>
  );
}

function DashCell({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="bg-panel p-5">
      <p className="text-[11px] text-faint">{label}</p>
      <p className={`mt-2 text-2xl ${tone}`}>{value}</p>
    </div>
  );
}

function DashMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-edge bg-raised px-3 py-2 text-sm">
      <span className="text-faint">{label}</span>
      <span className="text-ink">{value}</span>
    </div>
  );
}

function AgentAction({ done, label, detail }: { done: boolean; label: string; detail: string }) {
  return (
    <div className="flex gap-3 rounded-lg border border-edge bg-raised p-3">
      <span className={`mt-1 h-2 w-2 rounded-full ${done ? "bg-pos" : "bg-faint pulse-dot"}`} />
      <div>
        <p className="text-sm text-ink">{label}</p>
        <p className="mt-1 text-xs text-dim">{detail}</p>
      </div>
    </div>
  );
}

function WorkspaceStatus({
  plan,
  email,
  projects,
  serverState,
  accessState,
  accessSource,
  activeAnalysis,
  onSave,
  onLoad,
  onSeed,
}: {
  plan: Plan;
  email: string;
  projects: SavedProject[];
  serverState: "syncing" | "online" | "local";
  accessState: AccessState;
  accessSource: string;
  activeAnalysis: StrategyAnalysis | null;
  onSave: () => void;
  onLoad: (project: SavedProject) => void;
  onSeed: () => void;
}) {
  const limit = plan === "demo" ? "2 saved projects" : plan === "research" ? "20 validations / month" : "Unlimited workspace";
  const canUseWorkspace = accessState === "active";

  return (
    <section className="mb-8 grid gap-px overflow-hidden rounded-xl border border-edge bg-edge lg:grid-cols-[1fr_1.4fr_0.9fr]">
      <div className="bg-panel p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-faint">Account</p>
            <p className="mt-1 text-sm text-ink">{email === "demo@quantpilot.local" || email === "demo@axiomedge.local" || email === "demo@traderlab.local" ? "Demo user" : email}</p>
          </div>
          <span className="rounded-full border border-edge-bright px-2.5 py-1 text-xs text-dim">
            {plan === "demo" ? "Demo" : plan === "research" ? "$79 Research" : "$199 Pro"}
          </span>
        </div>
        <p className="mt-3 text-xs text-faint">{limit}</p>
        <div className="mt-3 rounded-md border border-edge bg-raised px-3 py-2">
          <p className="text-[11px] text-faint">Access</p>
          <p className="mt-1 text-xs text-dim">
            {accessState === "active"
              ? `Active via ${accessSource}`
              : accessState === "checking"
                  ? "Checking backend access"
                  : accessState === "signed_out"
                    ? "Signed session required"
                    : "Activation required"}
          </p>
        </div>
        <button
          onClick={onSave}
          disabled={!canUseWorkspace}
          className="mt-4 w-full rounded-md border border-edge-bright px-4 py-2 text-sm text-dim transition hover:border-accent/50 hover:text-ink disabled:cursor-not-allowed disabled:border-edge disabled:text-faint"
        >
          Save current strategy
        </button>
        <button
          onClick={onSeed}
          disabled={!canUseWorkspace}
          className="mt-2 w-full rounded-md border border-accent/35 px-4 py-2 text-sm text-accent transition hover:bg-accent/10 disabled:cursor-not-allowed disabled:border-edge disabled:text-faint"
        >
          Load demo workspace
        </button>
      </div>
      <div className="bg-panel p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-faint">Saved projects</p>
          <span className="text-xs text-dim">{projects.length} active</span>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {projects.length === 0 ? (
            <p className="text-sm text-dim">No saved projects yet. Load the sample strategy or paste your own, then save it.</p>
          ) : (
            projects.slice(0, 4).map((project) => (
              <button
                key={project.id}
                onClick={() => onLoad(project)}
                className="rounded-lg border border-edge bg-raised p-3 text-left transition hover:border-accent/50"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm text-ink">{project.name}</p>
                  <span className="text-xs text-warn">{project.score}</span>
                </div>
                <p className="mt-1 text-xs text-faint">{project.status}</p>
              </button>
            ))
          )}
        </div>
      </div>
      <div className="bg-panel p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-faint">Backend</p>
          <span
            className={`rounded-full border px-2.5 py-1 text-xs ${
              serverState === "online"
                ? "border-pos/40 text-pos"
                : serverState === "syncing"
                  ? "border-warn/40 text-warn"
                  : "border-edge-bright text-faint"
            }`}
          >
            {serverState === "online" ? "online" : serverState === "syncing" ? "syncing" : "local fallback"}
          </span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <MiniStat label="Score" value={activeAnalysis ? `${activeAnalysis.score}/100` : "—"} />
          <MiniStat label="Readiness" value={activeAnalysis?.readiness.replace("_", " ") || "not run"} />
          <MiniStat label="P(pass)" value={activeAnalysis ? `${activeAnalysis.monteCarlo.passProbability}%` : "—"} />
          <MiniStat label="Data" value={activeAnalysis?.dataMode === "trade_log" ? "trade log" : activeAnalysis ? "assumption" : "—"} />
        </div>
      </div>
    </section>
  );
}

function AccessRequired({ email }: { email: string }) {
  const signedOut = !email;

  return (
    <section className="fade-up overflow-hidden rounded-xl border border-warn/30 bg-panel">
      <div className="grid gap-px bg-edge lg:grid-cols-[1fr_0.9fr]">
        <div className="bg-panel p-6">
          <p className="text-xs text-warn">{signedOut ? "Sign in required" : "Access required"}</p>
          <h1 className="mt-3 text-2xl font-semibold">
            {signedOut ? "Sign in to open this workspace." : "Activate QuantPilot to open this workspace."}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-dim">
            {signedOut ? (
              "Saved strategies, reports, and automation blueprints are now protected by a signed Supabase session."
            ) : (
              <>
                This email is not linked to an active checkout yet: <span className="text-ink">{email}</span>.
                Use Research for validation and reports, or Pro for unlimited validations plus Pine/webhook exports.
              </>
            )}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            {signedOut ? (
              <Link href="/login" className="rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-black transition hover:opacity-85">
                Send magic link
              </Link>
            ) : (
              <>
                <Link href="/checkout?plan=research" className="rounded-md border border-edge-bright px-4 py-2.5 text-sm text-dim transition hover:text-ink">
                  Research $79
                </Link>
                <Link href="/checkout?plan=pro" className="rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-black transition hover:opacity-85">
                  Pro $199
                </Link>
              </>
            )}
          </div>
        </div>
        <div className="bg-panel p-6">
          <p className="text-xs text-faint">What unlocks</p>
          <div className="mt-4 space-y-2 text-sm text-dim">
            <AccessLine label="Strategy validation" />
            <AccessLine label="Trade-log parsing" />
            <AccessLine label="Monte Carlo + prop-firm odds" />
            <AccessLine label="Shareable reports" />
            <AccessLine label="Pine and webhook blueprint" />
          </div>
        </div>
      </div>
    </section>
  );
}

function AccessLine({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-edge bg-raised px-3 py-2">
      <span className="h-1.5 w-1.5 rounded-full bg-accent" />
      <span>{label}</span>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-edge bg-raised p-3">
      <p className="text-[11px] text-faint">{label}</p>
      <p className="mt-1 truncate text-sm text-ink">{value}</p>
    </div>
  );
}

/* ── Step 0: describe ─────────────────────────────────── */

function StepDescribe({
  text,
  setText,
  analyzing,
  analyzeLine,
  onRun,
  onSave,
  tradeLog,
  uploadingTradeLog,
  tradeLogError,
  onUploadTradeLog,
  onClearTradeLog,
  activeAnalysis,
}: {
  text: string;
  setText: (v: string) => void;
  analyzing: boolean;
  analyzeLine: number;
  onRun: () => void;
  onSave: () => void;
  tradeLog: TradeLogState | null;
  uploadingTradeLog: boolean;
  tradeLogError: string;
  onUploadTradeLog: (file: File) => void;
  onClearTradeLog: () => void;
  activeAnalysis: StrategyAnalysis | null;
}) {
  return (
    <section className="fade-up mx-auto max-w-5xl">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold sm:text-3xl">
          Describe the strategy you want to validate.
        </h1>
        <p className="mt-2 text-dim">
          Messy is fine. QuantPilot exposes what is vague, tests the risk,
          and shows whether the logic is ready for automation.
        </p>
      </div>

      <div className="relative mt-6 max-w-2xl overflow-hidden rounded-xl border border-edge bg-panel focus-within:border-accent/50">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={analyzing}
          rows={7}
          placeholder="e.g. I trade EURUSD on the 15m. I go long when price pulls back to the 50 EMA in an uptrend and RSI shows momentum coming back…"
          className="w-full resize-none bg-transparent p-4 font-mono text-sm text-ink outline-none placeholder:text-faint"
        />
        <div className="flex items-center justify-between border-t border-edge px-4 py-2.5">
          <button
            onClick={() => setText(SAMPLE_STRATEGY)}
            disabled={analyzing}
            className="font-mono text-xs text-faint transition hover:text-accent"
          >
            load sample strategy
          </button>
          <span className="font-mono text-xs text-faint">{text.length} chars</span>
        </div>
        {analyzing && (
          <div className="absolute inset-x-0 top-0 h-0.5 overflow-hidden">
            <div className="scan-line h-full w-1/3 bg-accent" />
          </div>
        )}
      </div>

      <div className="mt-5 max-w-2xl overflow-hidden rounded-xl border border-edge bg-panel">
        <div className="flex items-center justify-between border-b border-edge px-4 py-3">
          <div>
            <p className="text-sm text-ink">Trade log</p>
            <p className="mt-1 text-xs text-faint">CSV or TradingView export with PnL/profit or R multiple.</p>
          </div>
          {tradeLog && (
            <button
              onClick={onClearTradeLog}
              className="rounded-md border border-edge-bright px-2.5 py-1 text-xs text-dim transition hover:text-ink"
            >
              Clear
            </button>
          )}
        </div>
        <div className="p-4">
          <label className="block cursor-pointer rounded-lg border border-dashed border-edge-bright bg-raised px-4 py-4 text-sm text-dim transition hover:border-accent/50 hover:text-ink">
            <input
              type="file"
              accept=".csv,text/csv"
              disabled={uploadingTradeLog}
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onUploadTradeLog(file);
                event.currentTarget.value = "";
              }}
            />
            {uploadingTradeLog ? "Parsing trade log..." : "Upload trade log CSV"}
          </label>

          {tradeLogError && <p className="mt-3 text-xs text-danger">{tradeLogError}</p>}

          {tradeLog && (
            <div className="mt-4 grid gap-px overflow-hidden rounded-lg border border-edge bg-edge sm:grid-cols-4">
              <MiniStat label="Trades" value={String(tradeLog.trades)} />
              <MiniStat label="Net PnL" value={`$${Math.round(tradeLog.stats.netProfit).toLocaleString()}`} />
              <MiniStat label="Win rate" value={`${Math.round(tradeLog.stats.winRate * 100)}%`} />
              <MiniStat label="Profit factor" value={Number.isFinite(tradeLog.stats.profitFactor) ? tradeLog.stats.profitFactor.toFixed(2) : "inf"} />
            </div>
          )}

          {tradeLog?.warnings.length ? (
            <div className="mt-3 space-y-1">
              {tradeLog.warnings.map((warning) => (
                <p key={warning} className="text-xs text-warn">{warning}</p>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {analyzing ? (
        <div className="mt-6 space-y-2 rounded-xl border border-edge bg-raised p-4 font-mono text-sm">
          {ANALYZE_LINES.slice(0, analyzeLine + 1).map((l, i) => (
            <div key={l} className="fade-up flex items-center gap-2.5">
              {i < analyzeLine ? (
                <span className="text-accent">✓</span>
              ) : (
                <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-accent" />
              )}
              <span className={i < analyzeLine ? "text-dim" : "text-ink"}>{l}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6 flex max-w-2xl flex-wrap items-center gap-4">
          <button
            onClick={onRun}
            disabled={!text.trim()}
            className="w-full rounded-md bg-ink py-3.5 font-medium text-black transition hover:opacity-85 disabled:cursor-not-allowed disabled:border disabled:border-edge-bright disabled:bg-raised disabled:text-faint disabled:opacity-100 sm:w-auto sm:px-8"
          >
            Run validation →
          </button>
          <button
            onClick={onSave}
            className="w-full rounded-md border border-edge-bright px-6 py-3.5 font-medium text-dim transition hover:border-accent/50 hover:text-ink sm:w-auto"
          >
            Save project
          </button>
          <span className="text-xs text-faint">checks rules, odds, and automation risk</span>
        </div>
      )}
      <StrategyScore analysis={activeAnalysis} />
      <StrategyVersions />
    </section>
  );
}

/* ── Step 1: rule sheet ───────────────────────────────── */

function normalizeMockRules(): AnalysisRule[] {
  return RULES.map((rule) => ({
    category: rule.category,
    rule: rule.note ? `${rule.rule} (${rule.note})` : rule.rule,
    source: rule.source === "explicit" ? "detected" : "assumed",
  }));
}

function normalizeMockRiskGates(): RiskGate[] {
  return RISK_CHECKS.map((check) => ({
    label: check.label,
    status: check.status,
    detail: check.detail,
  }));
}

function StepRules({ analysis, onNext }: { analysis: StrategyAnalysis | null; onNext: () => void }) {
  const rules = analysis?.rules || normalizeMockRules();
  const assumed = rules.filter((r) => r.source !== "detected").length;
  return (
    <section className="fade-up">
      <StepHeading
        title="Validated rule sheet"
        sub={`${rules.length} rules extracted — ${assumed} need confirmation. Assumptions are where automation fails.`}
      />
      <div className="mt-6 overflow-hidden rounded-xl border border-edge">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-edge bg-raised font-mono text-xs text-faint">
              <th className="px-4 py-2.5 text-left font-normal">TYPE</th>
              <th className="px-4 py-2.5 text-left font-normal">RULE</th>
              <th className="hidden px-4 py-2.5 text-left font-normal sm:table-cell">SOURCE</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.rule} className="border-b border-edge/60 bg-panel last:border-0">
                <td className="px-4 py-3 align-top">
                  <span
                    className={`rounded px-1.5 py-0.5 font-mono text-xs ${
                      r.category === "Entry"
                        ? "bg-accent/10 text-accent"
                        : r.category === "Exit"
                          ? "bg-danger/10 text-danger"
                          : r.category === "Sizing"
                            ? "bg-info/10 text-info"
                            : "bg-warn/10 text-warn"
                    }`}
                  >
                    {r.category}
                  </span>
                </td>
                <td className="px-4 py-3 align-top">
                  <p className="text-ink">{r.rule}</p>
                </td>
                <td className="hidden px-4 py-3 align-top font-mono text-xs sm:table-cell">
                  <span className={r.source === "detected" ? "text-dim" : "text-warn"}>
                    {r.source.toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <NextBar onNext={onNext} label="Run risk audit →" />
    </section>
  );
}

/* ── Step 2: risk audit ───────────────────────────────── */

function StepRisk({ analysis, onNext }: { analysis: StrategyAnalysis | null; onNext: () => void }) {
  const gates = analysis?.riskGates || normalizeMockRiskGates();
  const passes = gates.filter((c) => c.status === "pass").length;
  const total = gates.length;
  const pct = passes / total;
  const circumference = 2 * Math.PI * 42;
  const blocked = gates.filter((gate) => gate.status === "fail").length;

  return (
    <section className="fade-up">
      <StepHeading
        title="Risk gates"
        sub="Scored against the rules a strategy must define before automation. Failed gates are structural risk, not cosmetic issues."
      />
      <div className="mt-6 grid gap-5 lg:grid-cols-[280px_1fr]">
        {/* score card */}
        <div className="flex flex-col items-center rounded-xl border border-edge bg-panel p-6">
          <div className="relative">
            <svg width="120" height="120" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="var(--border)" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="42" fill="none"
                stroke={pct >= 0.7 ? "var(--pos)" : pct >= 0.45 ? "var(--amber)" : "var(--red)"}
                strokeWidth="8" strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - pct)}
                transform="rotate(-90 50 50)"
                className="score-ring"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-semibold">{passes}</span>
              <span className="font-mono text-xs text-faint">/ {total}</span>
            </div>
          </div>
          <p className="mt-3 rounded-full border border-warn/40 bg-warn/10 px-3 py-1 font-mono text-xs text-warn">
            {blocked ? "BLOCKED FOR AUTOMATION" : "READY FOR PAPER VALIDATION"}
          </p>
          <p className="mt-4 text-center text-sm text-dim">
            {blocked
              ? `${blocked} critical gaps. Fixable — the automation step turns each gap into an explicit rule.`
              : "The core gates pass. Keep this in paper validation before any production rollout."}
          </p>
          <button className="mt-5 w-full rounded-lg border border-edge-bright py-2 font-mono text-xs text-dim transition hover:border-accent/50 hover:text-accent">
            export validation card
          </button>
        </div>

        {/* checklist */}
        <div className="space-y-2">
          {gates.map((c) => (
            <div key={c.label} className="rounded-lg border border-edge bg-panel px-4 py-3">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-ink">{c.label}</span>
                <span
                  className={`shrink-0 rounded px-2 py-0.5 font-mono text-xs ${
                    c.status === "pass"
                      ? "bg-pos/10 text-pos"
                      : c.status === "warn"
                        ? "bg-warn/10 text-warn"
                        : "bg-danger/10 text-danger"
                  }`}
                >
                  {c.status === "pass" ? "PASS" : c.status === "warn" ? "PINNED" : "MISSING"}
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-dim">{c.detail}</p>
            </div>
          ))}
        </div>
      </div>
      <NextBar onNext={onNext} label="Build test plan →" />
    </section>
  );
}

/* ── Step 3: backtest prep ────────────────────────────── */

function StepBacktest({ analysis, onNext }: { analysis: StrategyAnalysis | null; onNext: () => void }) {
  const evidence = analysis?.report.evidence;
  const passProbability = analysis?.monteCarlo.passProbability;
  const ruinProbability = analysis?.monteCarlo.ruinProbability;
  return (
    <section className="fade-up">
      <StepHeading
        title="Test plan"
        sub="Exactly how to test this without lying to yourself. QuantPilot prepares the test structure, then your platform runs the historical data."
      />
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        {analysis && (
          <div className="lg:col-span-2 grid gap-px overflow-hidden rounded-xl border border-edge bg-edge sm:grid-cols-4">
            <MiniStat label="Data mode" value={analysis.dataMode === "trade_log" ? "trade log" : "assumption"} />
            <MiniStat label="Trades" value={evidence ? String(evidence.trades) : "generated"} />
            <MiniStat label="P(pass)" value={passProbability === undefined ? "-" : `${passProbability}%`} />
            <MiniStat label="P(ruin)" value={ruinProbability === undefined ? "-" : `${ruinProbability}%`} />
          </div>
        )}
        <Panel title="test_parameters">
          <dl className="space-y-2.5">
            {BACKTEST_PREP.params.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-6 text-sm">
                <dt className="shrink-0 font-mono text-xs text-faint">{k}</dt>
                <dd className="text-right text-dim">{v}</dd>
              </div>
            ))}
          </dl>
        </Panel>
        <Panel title="pass_fail_metrics">
          <dl className="space-y-2.5">
            {BACKTEST_PREP.metrics.map(([k, v]) => (
              <div key={k} className="text-sm">
                <dt className="font-mono text-xs text-accent">{k}</dt>
                <dd className="mt-0.5 text-dim">{v}</dd>
              </div>
            ))}
          </dl>
        </Panel>
        <div className="lg:col-span-2">
          <Panel title="traps_that_make_backtests_lie">
            <ul className="space-y-2">
              {BACKTEST_PREP.traps.map((t) => (
                <li key={t} className="flex gap-2.5 text-sm text-dim">
                  <span className="text-warn">⚠</span>
                  {t}
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
      <NextBar onNext={onNext} label="Prepare automation →" />
    </section>
  );
}

/* ── Step 4: blueprint ────────────────────────────────── */

function StepBlueprint({ analysis }: { analysis: StrategyAnalysis | null }) {
  const [copied, setCopied] = useState<string | null>(null);
  const alerts = analysis?.blueprint.alerts || ALERT_CONFIG.conditions;
  const webhook = analysis?.blueprint.webhookPayload || ALERT_CONFIG.webhook;
  const pine = analysis?.blueprint.pineScript || PINE_SCRIPT;
  const rollout = analysis?.blueprint.rollout || ROLLOUT.map((item) => `${item.phase}: ${item.title}. ${item.desc}`);
  const copy = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopied(id);
    setTimeout(() => setCopied(null), 1800);
  };

  return (
    <section className="fade-up">
      <StepHeading
        title="Automation package"
        sub="Alerts, webhook payload, Pine Script v5 draft, and staged rollout. Alerts first — code never touches real money on day one."
      />

      <div className="mt-6 space-y-5">
        <Panel title="tradingview_alerts">
          <ul className="space-y-2 font-mono text-sm text-dim">
            {alerts.map((c) => (
              <li key={c} className="rounded-md border border-edge/60 bg-raised px-3 py-2">{c}</li>
            ))}
          </ul>
        </Panel>

        <Panel
          title="webhook_payload.json"
          action={
            <CopyBtn
              copied={copied === "wh"}
              onClick={() => copy("wh", webhook)}
            />
          }
        >
          <pre className="overflow-x-auto font-mono text-sm leading-relaxed text-dim">{webhook}</pre>
        </Panel>

        <Panel
          title="ema50_pullback_london_v1.pine"
          action={
            <CopyBtn
              copied={copied === "pine"}
              onClick={() => copy("pine", pine)}
            />
          }
        >
          <pre className="max-h-105 overflow-auto font-mono text-[13px] leading-relaxed text-dim">{pine}</pre>
        </Panel>

        <Panel title="staged_rollout">
          <ol className="grid gap-4 sm:grid-cols-3">
            {rollout.map((item, i) => (
              <li key={item} className="rounded-lg border border-edge/60 bg-raised p-4">
                <span className="font-mono text-xs text-accent">Stage {i + 1}</span>
                <p className="mt-1.5 text-xs leading-relaxed text-dim">{item}</p>
              </li>
            ))}
          </ol>
        </Panel>

        {/* upgrade */}
        <div className="rounded-xl border border-accent/30 bg-panel p-6 text-center">
          <h3 className="text-lg font-semibold">Ready to export this system?</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-dim">
            Research is $79/mo for validation, backtests, Monte Carlo, and reports.
            Pro is $199/mo when you need unlimited versions plus webhook and Pine Script exports.
          </p>
          <button className="mt-5 rounded-md bg-ink px-8 py-3 font-medium text-black transition hover:opacity-85">
            Upgrade to Pro — $199/mo
          </button>
          <p className="mt-2 font-mono text-xs text-faint">Research tier starts at $79/mo</p>
        </div>
      </div>
    </section>
  );
}

/* ── shared bits ──────────────────────────────────────── */

function StepHeading({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-dim sm:text-base">{sub}</p>
    </div>
  );
}

function Panel({
  title, action, children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-edge bg-panel">
      <div className="flex items-center justify-between border-b border-edge px-4 py-2.5">
        <span className="font-mono text-xs text-faint">{title}</span>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function CopyBtn({ copied, onClick }: { copied: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md border px-2.5 py-1 font-mono text-xs transition ${
        copied
          ? "border-accent/50 text-accent"
          : "border-edge-bright text-dim hover:text-ink"
      }`}
    >
      {copied ? "✓ copied" : "copy"}
    </button>
  );
}

function NextBar({ onNext, label }: { onNext: () => void; label: string }) {
  return (
    <div className="mt-8 flex justify-end">
      <button
        onClick={onNext}
        className="rounded-md bg-ink px-6 py-3 font-medium text-black transition hover:opacity-85"
      >
        {label}
      </button>
    </div>
  );
}
