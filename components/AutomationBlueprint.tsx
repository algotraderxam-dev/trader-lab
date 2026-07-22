"use client";

import { useEffect, useMemo, useState } from "react";

type ProjectSummary = {
  id: string;
  name: string;
  score: number;
  status: string;
};

type BlueprintReport = {
  projectId: string;
  name: string;
  analysis: {
    dataMode?: "assumption" | "trade_log";
    dataWarnings?: string[];
    readiness: {
      score: number;
      status: string;
    };
    blueprint: {
      alerts: string[];
      webhookPayload: string;
      pineScript: string;
      rollout: string[];
    };
  };
};

type ReportResponse = BlueprintReport | { report: BlueprintReport };

const FALLBACK_EMAIL = "demo@quantpilot.local";

export function AutomationBlueprint() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [report, setReport] = useState<BlueprintReport | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const email =
      window.localStorage.getItem("quantpilot_email") ||
      window.localStorage.getItem("axiomedge_email") ||
      window.localStorage.getItem("traderlab_email") ||
      window.localStorage.getItem("stratlab_email") ||
      FALLBACK_EMAIL;

    fetch(`/api/projects?email=${encodeURIComponent(email)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Could not load saved projects.");
        return res.json();
      })
      .then((data: { projects?: ProjectSummary[] }) => {
        const saved = data.projects ?? [];
        setProjects(saved);
        setSelectedId(saved[0]?.id ?? "");
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoadingProjects(false));
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setReport(null);
      return;
    }

    setLoadingReport(true);
    setError("");
    fetch(`/api/reports/${selectedId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Could not load the automation blueprint.");
        return res.json();
      })
      .then((data: ReportResponse) => setReport("report" in data ? data.report : data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoadingReport(false));
  }, [selectedId]);

  const blueprint = report?.analysis?.blueprint;
  const dataMode = report?.analysis.dataMode ?? "assumption";
  const alerts = blueprint?.alerts ?? [];
  const rollout = blueprint?.rollout ?? [];
  const webhookPayload = blueprint?.webhookPayload ?? "";
  const pineScript = blueprint?.pineScript ?? "";

  const parsedWebhook = useMemo(() => {
    if (!webhookPayload) return "No webhook generated yet.";
    try {
      return JSON.stringify(JSON.parse(webhookPayload), null, 2);
    } catch {
      return webhookPayload;
    }
  }, [webhookPayload]);

  const copy = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopied(id);
    setTimeout(() => setCopied(null), 1600);
  };

  if (loadingProjects) {
    return (
      <section className="fade-up">
        <ShellHeader />
        <div className="mt-6 rounded-xl border border-edge bg-panel p-8 text-sm text-dim">
          Loading saved strategy projects...
        </div>
      </section>
    );
  }

  if (!projects.length) {
    return (
      <section className="fade-up">
        <ShellHeader />
        <div className="mt-6 rounded-xl border border-edge bg-panel p-8">
          <p className="text-sm font-medium text-ink">No saved strategy yet.</p>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-dim">
            Open the Strategy module, describe the strategy, optionally upload a trade
            log, then save the project. QuantPilot will generate the Pine draft,
            webhook payload, alert conditions, and rollout plan from that backend
            analysis.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="fade-up">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <ShellHeader />
        <label className="w-full max-w-xs text-xs text-faint">
          Project
          <select
            value={selectedId}
            onChange={(event) => setSelectedId(event.target.value)}
            className="mt-2 w-full rounded-md border border-edge bg-panel px-3 py-2 text-sm text-ink outline-none transition focus:border-accent/60"
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? (
        <div className="mt-5 rounded-lg border border-danger/25 bg-danger/5 p-4 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <div className="mt-6 grid gap-px overflow-hidden rounded-xl border border-edge bg-edge sm:grid-cols-5">
        <Cell label="ALERTS" value={`${alerts.length}`} tone="text-accent" sub="Generated from rules" />
        <Cell label="WEBHOOK" value="JSON" tone="text-ink" sub="Bot-ready payload" />
        <Cell label="PINE SCRIPT" value="v5" tone="text-pos" sub="TradingView draft" />
        <Cell label="EXECUTION" value="Off" tone="text-warn" sub="User-controlled" />
        <Cell
          label="DATA"
          value={dataMode === "trade_log" ? "Log" : "Assume"}
          tone={dataMode === "trade_log" ? "text-pos" : "text-warn"}
          sub={dataMode === "trade_log" ? "Uploaded trades" : "No trade CSV"}
        />
      </div>

      {loadingReport ? (
        <div className="mt-5 rounded-xl border border-edge bg-panel p-8 text-sm text-dim">
          Building automation package from backend report...
        </div>
      ) : null}

      {report && blueprint ? (
        <div className="mt-5 space-y-5">
          <Panel title="Generated TradingView alert conditions">
            <ul className="space-y-2 text-sm text-dim">
              {alerts.map((condition, i) => (
                <li
                  key={`${condition}-${i}`}
                  className="rise rounded-md border border-edge/60 bg-raised px-3 py-2"
                  style={{ animationDelay: `${i * 55}ms` }}
                >
                  {condition}
                </li>
              ))}
            </ul>
          </Panel>

          <Panel
            title="webhook_payload.json"
            action={<Copy copied={copied === "webhook"} onClick={() => copy("webhook", parsedWebhook)} />}
          >
            <pre className="overflow-x-auto font-mono text-sm leading-relaxed text-dim">{parsedWebhook}</pre>
          </Panel>

          <Panel
            title="pine_strategy_draft.pine"
            action={<Copy copied={copied === "pine"} onClick={() => copy("pine", pineScript)} />}
          >
            <pre className="max-h-96 overflow-auto font-mono text-[13px] leading-relaxed text-dim">
              {pineScript}
            </pre>
          </Panel>

          {report.analysis.dataWarnings?.length ? (
            <Panel title="Data warnings">
              <ul className="space-y-2 text-sm text-warn">
                {report.analysis.dataWarnings.map((warning) => (
                  <li key={warning} className="rounded-md border border-warn/20 bg-warn/5 px-3 py-2">
                    {warning}
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}

          <Panel title="Backend rollout plan">
            <ol className="grid gap-4 sm:grid-cols-3">
              {rollout.map((item, i) => (
                <li
                  key={`${item}-${i}`}
                  className="rise rounded-lg border border-edge/60 bg-raised p-4"
                  style={{ animationDelay: `${i * 70}ms` }}
                >
                  <span className="text-xs text-accent">Stage {i + 1}</span>
                  <p className="mt-2 text-sm leading-relaxed text-dim">{item}</p>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      ) : null}
    </section>
  );
}

function ShellHeader() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold sm:text-3xl">Automation blueprint</h1>
      <p className="mt-2 text-sm leading-relaxed text-dim sm:text-base">
        Backend-generated TradingView alerts, webhook JSON, Pine Script draft,
        and rollout steps from the saved strategy analysis.
      </p>
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
    <div className="terminal-shadow overflow-hidden rounded-xl border border-edge bg-panel">
      <div className="relative flex items-center justify-between overflow-hidden border-b border-edge px-4 py-2.5">
        <span className="text-xs text-faint">{title}</span>
        {action}
        <span className="trace-x pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Copy({ copied, onClick }: { copied: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md border px-2.5 py-1 text-xs transition ${
        copied ? "border-accent/50 text-accent" : "border-edge-bright text-dim hover:text-ink"
      }`}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function Cell({ label, value, tone, sub }: { label: string; value: string; tone: string; sub: string }) {
  return (
    <div className="bg-panel p-4">
      <p className="text-[11px] text-faint">{label}</p>
      <p className={`mt-1 text-xl ${tone}`}>{value}</p>
      <p className="mt-1 text-[11px] text-faint">{sub}</p>
    </div>
  );
}
