import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/Logo";
import { getProject } from "@/lib/server/store";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function PublicReportPage({ params }: PageProps) {
  const { id } = await params;
  const project = await getProject(id);

  if (!project) notFound();

  const analysis = project.analysis;
  const evidence = analysis.report.evidence;
  const failedGates = analysis.riskGates.filter((gate) => gate.status === "fail");

  return (
    <main className="min-h-screen bg-bg text-ink">
      <header className="border-b border-edge bg-bg/90">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Logo />
          <Link href="/app?module=overview" className="rounded-md border border-edge-bright px-4 py-2 text-sm text-dim">
            Open workspace
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div>
            <p className="text-xs text-faint">QuantPilot validation report</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight">
              {project.name}
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-dim">
              {analysis.summary}
            </p>
          </div>

          <aside className="rounded-xl border border-edge-bright bg-panel p-5">
            <p className="text-xs text-faint">Readiness score</p>
            <div className="mt-4 flex items-end justify-between">
              <p className={project.score >= 80 ? "text-6xl text-pos" : project.score >= 60 ? "text-6xl text-warn" : "text-6xl text-danger"}>
                {project.score}
              </p>
              <p className="pb-2 text-sm text-dim">/100</p>
            </div>
            <p className="mt-4 rounded-md border border-edge bg-raised px-3 py-2 text-sm text-dim">
              {analysis.readiness.replace("_", " ")}
            </p>
          </aside>
        </div>

        <div className="mt-8 grid gap-px overflow-hidden rounded-xl border border-edge bg-edge sm:grid-cols-4">
          <ReportCell label="Market" value={analysis.detectedMarket} />
          <ReportCell label="Data" value={analysis.dataMode === "trade_log" ? "Trade log" : "Assumption"} />
          <ReportCell label="P(pass)" value={`${analysis.monteCarlo.passProbability}%`} />
          <ReportCell label="P(ruin)" value={`${analysis.monteCarlo.ruinProbability}%`} />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <Panel title="Findings">
            <ul className="space-y-3 text-sm leading-relaxed text-dim">
              {analysis.report.findings.map((finding) => (
                <li key={finding} className="rounded-md border border-edge bg-raised px-3 py-2">
                  {finding}
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Next Actions">
            <ul className="space-y-3 text-sm leading-relaxed text-dim">
              {analysis.report.nextActions.map((action) => (
                <li key={action} className="rounded-md border border-edge bg-raised px-3 py-2">
                  {action}
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <Panel title="Risk Gates">
            <div className="space-y-2">
              {analysis.riskGates.map((gate) => (
                <div key={gate.label} className="rounded-md border border-edge bg-raised px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-ink">{gate.label}</p>
                    <span className={gate.status === "pass" ? "text-pos" : gate.status === "warn" ? "text-warn" : "text-danger"}>
                      {gate.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-faint">{gate.detail}</p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Trade Evidence">
            <div className="space-y-2">
              <Metric label="Trades" value={String(evidence?.trades || 0)} />
              <Metric label="Win rate" value={`${evidence?.winRate || 0}%`} />
              <Metric label="Expectancy" value={`${evidence?.expectancyR || 0}R`} />
              <Metric label="Profit factor" value={String(evidence?.profitFactor || "-")} />
              <Metric label="Max drawdown" value={`$${Math.round(evidence?.maxDrawdown || 0).toLocaleString()}`} />
            </div>
          </Panel>

          <Panel title="Automation Package">
            <div className="space-y-2">
              <Metric label="Alerts" value={String(analysis.blueprint.alerts.length)} />
              <Metric label="Webhook" value="JSON generated" />
              <Metric label="Pine" value="v5 draft" />
              <Metric label="Failed gates" value={String(failedGates.length)} />
            </div>
          </Panel>
        </div>

        <div className="mt-8 overflow-hidden rounded-xl border border-edge bg-panel">
          <div className="border-b border-edge px-5 py-4">
            <p className="text-xs text-faint">Disclosure</p>
          </div>
          <p className="p-5 text-sm leading-relaxed text-dim">
            QuantPilot is an educational strategy validation workspace. This report does not
            provide financial advice, trade signals, broker execution, or profit guarantees.
            Firm presets must be verified against current firm rules before commercial use.
          </p>
        </div>
      </section>
    </main>
  );
}

function ReportCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-panel p-5">
      <p className="text-[11px] text-faint">{label}</p>
      <p className="mt-2 text-lg text-ink">{value}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-edge bg-panel">
      <div className="border-b border-edge px-5 py-4">
        <p className="text-xs text-faint">{title}</p>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-edge bg-raised px-3 py-2 text-sm">
      <span className="text-faint">{label}</span>
      <span className="text-ink">{value}</span>
    </div>
  );
}
