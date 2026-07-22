"use client";

import { useEffect, useMemo, useState } from "react";

type ProjectSummary = {
  id: string;
  name: string;
  score: number;
  status: string;
  updatedAt: string;
};

type ReportPayload = {
  projectId: string;
  name: string;
  email: string;
  score: number;
  status: string;
  generatedAt: string;
  analysis: {
    readiness: "blocked" | "needs_review" | "ready";
    detectedMarket: string;
    dataMode: "assumption" | "trade_log";
    summary: string;
    monteCarlo: {
      passProbability: number;
      ruinProbability: number;
      timeoutProbability: number;
      suggestedRiskPct: number;
    };
    report: {
      title: string;
      version: string;
      findings: string[];
      nextActions: string[];
    };
    blueprint: {
      pineScript: string;
      webhookPayload: string;
    };
  };
};

export function ShareableReport() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [report, setReport] = useState<ReportPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const email = localStorage.getItem("quantpilot_email") || localStorage.getItem("axiomedge_email") || localStorage.getItem("traderlab_email") || localStorage.getItem("stratlab_email") || "demo@quantpilot.local";
    fetch(`/api/projects?email=${encodeURIComponent(email)}`)
      .then((response) => response.json())
      .then((payload) => {
        const list = Array.isArray(payload.projects) ? payload.projects : [];
        setProjects(list);
        setSelectedId(list[0]?.id || "");
        setLoading(false);
      })
      .catch(() => {
        setError("Could not load saved projects.");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    fetch(`/api/reports/${selectedId}`)
      .then((response) => response.json())
      .then((payload) => {
        if (payload.error) throw new Error(payload.error);
        setReport(payload.report);
        setError("");
      })
      .catch((err) => {
        setReport(null);
        setError(err instanceof Error ? err.message : "Could not load report.");
      })
      .finally(() => setLoading(false));
  }, [selectedId]);

  const reportText = useMemo(() => {
    if (!report) return "";
    return [
      `QuantPilot Report: ${report.name}`,
      `Generated: ${new Date(report.generatedAt).toLocaleString()}`,
      `Score: ${report.score}/100`,
      `Status: ${report.status}`,
      `Market: ${report.analysis.detectedMarket}`,
      `Data mode: ${report.analysis.dataMode}`,
      "",
      "Findings:",
      ...report.analysis.report.findings.map((item) => `- ${item}`),
      "",
      "Next actions:",
      ...report.analysis.report.nextActions.map((item) => `- ${item}`),
      "",
      "Webhook payload:",
      report.analysis.blueprint.webhookPayload,
      "",
      "Pine Script:",
      report.analysis.blueprint.pineScript,
    ].join("\n");
  }, [report]);

  const copy = async (kind: "json" | "text") => {
    if (!report) return;
    await navigator.clipboard.writeText(kind === "json" ? JSON.stringify(report, null, 2) : reportText);
    setCopied(kind);
    setTimeout(() => setCopied(""), 1600);
  };

  const download = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${report.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-quantpilot-report.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="fade-up">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold sm:text-3xl">Shareable report</h1>
        <p className="mt-2 text-sm leading-relaxed text-dim sm:text-base">
          Pulls the saved backend report for a project and exports the exact JSON/text
          evidence behind the readiness score, Monte Carlo odds, webhook, and Pine draft.
        </p>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-edge bg-panel">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-edge px-6 py-5">
          <div>
            <p className="text-xs text-faint">QuantPilot report</p>
            <h2 className="mt-2 text-2xl font-semibold">{report?.name || "No project selected"}</h2>
            <p className="mt-2 text-sm text-dim">
              {report ? `Generated from ${dataModeLabel(report.analysis.dataMode)} data.` : "Save a project first to generate a backend report."}
            </p>
          </div>
          <select
            value={selectedId}
            onChange={(event) => setSelectedId(event.target.value)}
            className="rounded-md border border-edge-bright bg-raised px-3 py-2 text-sm text-ink outline-none"
          >
            {projects.length === 0 ? (
              <option value="">No saved projects</option>
            ) : projects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
        </div>

        {loading && <p className="p-6 text-sm text-dim">Loading report...</p>}
        {error && <p className="p-6 text-sm text-danger">{error}</p>}

        {report && !loading && (
          <>
            <div className="grid gap-px bg-edge sm:grid-cols-4">
              <Cell label="READINESS" value={`${report.score}/100`} tone={report.score >= 80 ? "text-pos" : report.score >= 60 ? "text-warn" : "text-danger"} />
              <Cell label="DATA" value={report.analysis.dataMode === "trade_log" ? "Trade log" : "Assumption"} tone="text-accent" />
              <Cell label="P(PASS)" value={`${report.analysis.monteCarlo.passProbability}%`} tone="text-pos" />
              <Cell label="RISK" value={`${report.analysis.monteCarlo.suggestedRiskPct}%`} tone="text-ink" />
            </div>
            <div className="grid gap-px bg-edge md:grid-cols-[1fr_0.9fr]">
              <div className="bg-panel p-6">
                <p className="text-xs text-faint">Findings</p>
                <ul className="mt-4 space-y-3 text-sm text-dim">
                  {report.analysis.report.findings.map((finding) => (
                    <li key={finding}>{finding}</li>
                  ))}
                </ul>
                <p className="mt-6 text-xs text-faint">Next actions</p>
                <ul className="mt-3 space-y-2 text-sm text-dim">
                  {report.analysis.report.nextActions.map((action) => (
                    <li key={action}>{action}</li>
                  ))}
                </ul>
              </div>
              <div className="bg-panel p-6">
                <p className="text-xs text-faint">Export options</p>
                <div className="mt-4 grid gap-2">
                  <button onClick={download} className="rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-black">
                    Download JSON report
                  </button>
                  <button onClick={() => copy("text")} className="rounded-md border border-edge-bright px-4 py-2.5 text-sm text-dim">
                    {copied === "text" ? "Copied text" : "Copy text report"}
                  </button>
                  <button onClick={() => copy("json")} className="rounded-md border border-edge-bright px-4 py-2.5 text-sm text-dim">
                    {copied === "json" ? "Copied JSON" : "Copy JSON"}
                  </button>
                </div>
                <div className="mt-5 rounded-lg border border-edge bg-bg p-3">
                  <p className="font-mono text-[11px] text-faint">report_id</p>
                  <p className="mt-1 break-all font-mono text-xs text-dim">{report.projectId}</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function Cell({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="bg-panel p-5">
      <p className="text-[11px] text-faint">{label}</p>
      <p className={`mt-2 text-2xl ${tone}`}>{value}</p>
    </div>
  );
}

function dataModeLabel(value: ReportPayload["analysis"]["dataMode"] | undefined) {
  return (value || "assumption").replace("_", " ");
}
