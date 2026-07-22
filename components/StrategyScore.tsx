import type { StrategyAnalysis } from "@/lib/traderlab/types";

const SCORE_ITEMS = [
  { label: "Rule clarity", score: 74, note: "Entry logic is measurable; trend and momentum still need confirmation." },
  { label: "Risk completeness", score: 42, note: "Hard stop, daily halt, and news handling are not fully defined." },
  { label: "Backtest quality", score: 68, note: "Positive path, but sample size is still below the preferred threshold." },
  { label: "Prop-firm survival", score: 61, note: "Pass odds improve sharply when risk drops below 1% per trade." },
  { label: "Automation readiness", score: 55, note: "Alerts can be drafted, but execution controls are not complete." },
  { label: "Report readiness", score: 82, note: "The strategy is ready for a clean report, but not ready for live execution." },
];

const VERSIONS = [
  { id: "v1", name: "Original idea", score: 42, status: "Vague exits" },
  { id: "v2", name: "Stop defined", score: 58, status: "Risk improved" },
  { id: "v3", name: "Daily halt added", score: 71, status: "Challenge-ready" },
  { id: "v4", name: "0.75% risk model", score: 78, status: "Best survival" },
];

export function StrategyScore({ analysis }: { analysis?: StrategyAnalysis | null }) {
  const liveItems = analysis
    ? [
        {
          label: "Rule clarity",
          score: scoreFromGates(analysis, ["Entry logic", "Entry quality", "Session filter"]),
          note: `${analysis.rules.length} compiled rules. ${analysis.compiledSpec?.assumptions.length || 0} assumptions need confirmation.`,
        },
        {
          label: "Risk completeness",
          score: scoreFromGates(analysis, ["Hard stop-loss", "Position sizing"]),
          note: `${analysis.riskGates.filter((gate) => gate.status === "fail").length} failed risk gates remain.`,
        },
        {
          label: "Data quality",
          score: analysis.dataMode === "trade_log" ? 82 : 54,
          note: analysis.dataMode === "trade_log" ? "Using uploaded trade evidence." : "Numbers are assumption-based until a trade log is attached.",
        },
        {
          label: "Prop-firm survival",
          score: Math.min(95, Math.round(analysis.monteCarlo.passProbability)),
          note: `${analysis.monteCarlo.passProbability}% pass, ${analysis.monteCarlo.ruinProbability}% ruin on ${analysis.monteCarlo.preset}.`,
        },
        {
          label: "Automation readiness",
          score: analysis.blueprint.alerts.length >= 3 && analysis.readiness !== "blocked" ? 76 : 48,
          note: `${analysis.blueprint.alerts.length} alerts, webhook JSON, and Pine draft generated.`,
        },
        {
          label: "Report readiness",
          score: analysis.score,
          note: analysis.summary,
        },
      ]
    : SCORE_ITEMS;
  const score = analysis?.score ?? Math.round(liveItems.reduce((sum, item) => sum + item.score, 0) / liveItems.length);
  const circumference = 2 * Math.PI * 42;
  const status =
    analysis?.readiness === "ready"
      ? "A readiness"
      : analysis?.readiness === "needs_review"
        ? "B readiness"
        : analysis
          ? "Blocked"
          : "B- readiness";

  return (
    <div className="mt-8 grid gap-5 lg:grid-cols-[320px_1fr]">
      <div className="rounded-xl border border-edge bg-panel p-5">
        <p className="text-xs text-faint">Strategy readiness score</p>
        <div className="mt-5 flex items-center gap-5">
          <div className="relative shrink-0">
            <svg width="112" height="112" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="var(--border)" strokeWidth="8" />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke={score >= 80 ? "var(--pos)" : score >= 60 ? "var(--amber)" : "var(--red)"}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - score / 100)}
                transform="rotate(-90 50 50)"
                className="score-ring"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-semibold">{score}</span>
              <span className="text-xs text-faint">/100</span>
            </div>
          </div>
          <div>
            <p className="text-lg font-medium text-ink">{status}</p>
            <p className="mt-2 text-sm leading-relaxed text-dim">
              {analysis
                ? analysis.summary
                : "Good enough to research. Not ready for hands-off automation until the missing risk controls are defined."}
            </p>
          </div>
        </div>
        <a
          href="/app?module=report"
          className="mt-5 block w-full rounded-md border border-edge-bright px-4 py-2.5 text-center text-sm text-dim transition hover:border-accent/50 hover:text-ink"
        >
          Generate shareable report
        </a>
      </div>

      <div className="grid gap-px overflow-hidden rounded-xl border border-edge bg-edge sm:grid-cols-2">
        {liveItems.map((item) => (
          <div key={item.label} className="bg-panel p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-ink">{item.label}</p>
              <span className={item.score >= 70 ? "text-pos" : item.score >= 55 ? "text-warn" : "text-danger"}>
                {item.score}
              </span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-raised">
              <div
                className={`h-full rounded-full ${item.score >= 70 ? "bg-pos" : item.score >= 55 ? "bg-warn" : "bg-danger"}`}
                style={{ width: `${item.score}%` }}
              />
            </div>
            <p className="mt-3 text-xs leading-relaxed text-dim">{item.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function scoreFromGates(analysis: StrategyAnalysis, labels: string[]) {
  const gates = analysis.riskGates.filter((gate) => labels.includes(gate.label));
  if (!gates.length) return 50;
  const raw = gates.reduce((sum, gate) => sum + (gate.status === "pass" ? 100 : gate.status === "warn" ? 62 : 22), 0);
  return Math.round(raw / gates.length);
}

export function StrategyVersions() {
  return (
    <div className="mt-5 overflow-hidden rounded-xl border border-edge bg-panel">
      <div className="flex items-center justify-between border-b border-edge px-4 py-2.5">
        <span className="text-xs text-faint">Strategy versions</span>
        <span className="text-xs text-accent">compare score, risk, and odds</span>
      </div>
      <div className="grid gap-px bg-edge sm:grid-cols-4">
        {VERSIONS.map((version) => (
          <div key={version.id} className="bg-panel p-4">
            <p className="text-xs text-faint">{version.id}</p>
            <h3 className="mt-1 text-sm font-medium text-ink">{version.name}</h3>
            <p className="mt-3 text-2xl text-ink">{version.score}</p>
            <p className="mt-1 text-xs text-dim">{version.status}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
