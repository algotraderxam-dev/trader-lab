const PATHS = [
  "M0 156 C80 130 118 138 190 104 C264 70 322 96 420 42",
  "M0 168 C76 148 132 166 196 130 C268 92 332 120 420 86",
  "M0 176 C82 176 136 198 202 170 C274 140 344 156 420 136",
  "M0 182 C78 204 134 188 202 214 C274 242 340 224 420 260",
  "M0 190 C84 220 132 240 202 270 C276 302 346 288 420 326",
  "M0 164 C78 118 134 130 202 88 C278 38 338 78 420 24",
  "M0 172 C76 158 132 146 202 152 C278 158 334 174 420 158",
  "M0 184 C78 188 134 224 202 226 C272 230 340 256 420 276",
];

const VERSION_BARS = [
  ["v1 raw idea", "52", "Missing stop + daily halt", "text-danger"],
  ["v2 rules fixed", "71", "Entry/exit formalized", "text-warn"],
  ["v3 risk fixed", "84", "Sizing and loss caps added", "text-accent"],
  ["v4 blueprint", "94", "Ready for paper validation", "text-pos"],
];

export function LandingShowcases() {
  return (
    <section id="features" className="border-t border-edge">
      <div className="mx-auto max-w-6xl space-y-20 px-6 py-16">
        <FeatureHeader />
        <BlueprintShowcase />
        <StressShowcase />
        <PropFirmShowcase />
        <McpShowcase />
        <ReportShowcase />
      </div>
    </section>
  );
}

function FeatureHeader() {
  return (
    <div className="max-w-3xl">
      <p className="text-xs text-faint">Product vision</p>
      <h2 className="mt-4 text-3xl font-semibold leading-tight sm:text-5xl">
        Show the trader exactly what the agents produce.
      </h2>
      <p className="mt-5 text-base leading-7 text-dim">
        QuantPilot should feel like a research terminal: strategy logic on one side,
        visual validation on the other, and exportable automation artifacts at the end.
      </p>
    </div>
  );
}

function McpShowcase() {
  return (
    <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
      <div>
        <p className="text-xs text-faint">Agent-native MCP</p>
        <h2 className="mt-4 max-w-xl text-3xl font-semibold leading-tight sm:text-5xl">
          Use QuantPilot inside Claude Code, Codex, and Cursor.
        </h2>
        <p className="mt-5 max-w-xl text-base leading-7 text-dim">
          Connect over MCP and the trader&apos;s coding agent can validate strategy text,
          parse trade logs, pull saved reports, and generate Pine/webhook blueprints
          without opening the dashboard.
        </p>
        <p className="mt-5 max-w-xl text-base leading-7 text-dim">
          Rather work from scripts? The same backend routes power the MCP bridge, so
          QuantPilot behaves like a research engine your agent can call from a project.
        </p>
        <div className="mt-8 flex flex-wrap gap-5 text-sm text-dim">
          <AgentBadge name="Claude Code" kind="claude" />
          <AgentBadge name="Codex" kind="codex" />
          <AgentBadge name="Cursor" kind="cursor" />
        </div>
      </div>
      <div className="terminal-shadow live-border overflow-hidden rounded-xl border border-edge-bright bg-panel">
        <div className="relative overflow-hidden border-b border-edge px-5 py-4">
          <p className="font-mono text-sm text-faint">QuantPilot MCP</p>
          <span className="trace-x pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
        </div>
        <div className="space-y-5 p-5 font-mono text-sm leading-7 text-dim">
          <p className="text-ink">&gt; validate my NQ breakout strategy and generate the automation blueprint</p>
          <McpLine label="quantpilot.analyze_strategy" value="score 90/100 · breakout · trade-log mode" />
          <McpLine label="quantpilot.parse_trade_log" value="120 trades · PF 4.30 · expectancy 1.42R" />
          <McpLine label="quantpilot.get_report" value="readiness, odds, evidence, blockers" />
          <div className="rounded-lg border border-pos/20 bg-pos/5 p-4 text-pos">
            <p>+ blueprint.pine generated</p>
            <p>+ webhook_payload.json generated</p>
            <p>+ report evidence attached</p>
          </div>
          <p className="text-xs leading-relaxed text-faint">
            MCP handles discovery and routing. Heavy simulation still runs through the
            QuantPilot backend engine.
          </p>
        </div>
      </div>
    </div>
  );
}

function McpLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rise rounded-lg border border-edge bg-bg p-3">
      <p className="text-accent">{label}</p>
      <p className="mt-1 text-faint">{value}</p>
    </div>
  );
}

function AgentBadge({ name, kind }: { name: string; kind: "claude" | "codex" | "cursor" }) {
  return (
    <span className="inline-flex items-center gap-2.5 rounded-lg border border-edge bg-panel px-3 py-2">
      <span className="flex h-7 w-7 items-center justify-center rounded-md border border-edge-bright bg-bg">
        {kind === "claude" && <ClaudeMark />}
        {kind === "codex" && <CodexMark />}
        {kind === "cursor" && <CursorMark />}
      </span>
      <span className="font-medium text-ink">{name}</span>
    </span>
  );
}

function ClaudeMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      {Array.from({ length: 8 }).map((_, i) => (
        <line
          key={i}
          x1="12"
          y1="3.3"
          x2="12"
          y2="7"
          stroke="#d97745"
          strokeWidth="2"
          strokeLinecap="round"
          transform={`rotate(${i * 45} 12 12)`}
        />
      ))}
      <circle cx="12" cy="12" r="3.6" fill="#d97745" />
    </svg>
  );
}

function CodexMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path d="M12 3.5c2.4 0 4.2 1.2 5.1 3.1c2.1.3 3.7 2 3.7 4.2c0 1.8-1 3.2-2.4 3.9c-.2 2.4-2.1 4.3-4.6 4.3c-1 0-2-.3-2.8-.9c-.8.7-1.8 1.1-3 1.1c-2.5 0-4.6-2-4.6-4.6c0-.8.2-1.5.6-2.2c-.7-.8-1.1-1.8-1.1-3c0-2.4 1.9-4.4 4.3-4.5A5.2 5.2 0 0 1 12 3.5Z" fill="none" stroke="#f3f4f6" strokeWidth="1.6" />
      <path d="M8.2 7.2l7.5 4.3v5.2M15.8 7.4l-7.6 4.3v5" fill="none" stroke="#f3f4f6" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function CursorMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path d="M12 2.8l8 4.6v9.2l-8 4.6l-8-4.6V7.4l8-4.6Z" fill="#f3f4f6" />
      <path d="M12 2.8v9.2l8 4.6V7.4L12 2.8Z" fill="#c8cbd2" />
      <path d="M12 12L4 7.4v9.2l8 4.6V12Z" fill="#8f95a3" />
    </svg>
  );
}

function BlueprintShowcase() {
  return (
    <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:items-center">
      <FeatureCopy
        eyebrow="Automation blueprint"
        title="Production-ready Pine and webhook drafts after validation."
        desc="The agent converts a messy strategy into platform logic, checks the required risk controls, then exports TradingView alerts, Pine Script, webhook JSON, and rollout steps."
        items={["Pine strategy draft", "Webhook payload", "Alert conditions", "Paper-trading rollout"]}
      />
      <div className="terminal-shadow live-border overflow-hidden rounded-xl border border-edge-bright bg-panel">
        <div className="border-b border-edge px-5 py-4">
          <p className="text-sm font-medium text-ink">Pine strategy draft</p>
        </div>
        <div className="space-y-4 p-5">
          <div className="rounded-lg border border-edge bg-raised p-4 text-sm leading-relaxed text-dim">
            Build a TradingView strategy for EURUSD EMA50 pullbacks. Require session
            filter, swing-low stop, 2R target, and webhook payload.
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <ToolCard title="Rule skill" desc="Playbook attached" />
            <ToolCard title="Risk lint" desc="2 blockers fixed" />
          </div>
          <div className="overflow-hidden rounded-lg border border-pos/20 bg-pos/5">
            <div className="border-b border-pos/20 px-4 py-2 font-mono text-xs text-pos">
              eurusd_blueprint.pine +42
            </div>
            <pre className="p-4 font-mono text-xs leading-6 text-pos">
{`//@version=5
strategy("QuantPilot EURUSD blueprint", overlay=true)

ema50 = ta.ema(close, 50)
sessionOk = time(timeframe.period, "0700-1100")
longSetup = close > ema50 and low <= ema50
stop = ta.lowest(low, 5)
target = close + ((close - stop) * 2)

if longSetup and sessionOk
    strategy.entry("TL long", strategy.long)
    strategy.exit("2R exit", "TL long", stop=stop, limit=target)`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

function StressShowcase() {
  return (
    <div className="space-y-8">
      <FeatureCopy
        eyebrow="Risk and Monte Carlo"
        title="Stress-test the strategy before the challenge."
        desc="Thousands of resampled paths turn one trade log into a distribution of outcomes. Traders can see drawdown, risk of ruin, value at risk, and the sizing zone they can actually survive."
        items={["Path simulation", "Tail-risk metrics", "What-if risk slider", "Prop-firm presets"]}
      />
      <div className="terminal-shadow overflow-hidden rounded-xl border border-edge-bright bg-panel">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-edge px-5 py-4">
          <div className="flex gap-7 text-sm text-dim">
            <span>Prop Firm</span>
            <span>Verdict</span>
            <span>Regimes</span>
            <span className="border-b border-ink pb-3 text-ink">Risk & Monte Carlo</span>
          </div>
          <button className="rounded-md bg-ink px-4 py-1.5 text-sm font-medium text-black">Run</button>
        </div>
        <div className="grid gap-px bg-edge md:grid-cols-6">
          <MetricBlock label="Risk score" value="40" sub="0 low - 100 extreme" tone="text-ink" />
          <MetricBlock label="P(ruin)" value="20.0%" sub="Floor $95.1K" tone="text-danger" />
          <MetricBlock label="P(profit)" value="82.5%" sub="Terminal > start" tone="text-pos" />
          <MetricBlock label="Median return" value="7.2%" sub="Bootstrap median" tone="text-pos" />
          <MetricBlock label="MC Sharpe" value="0.05" sub="Sortino 0.13" tone="text-ink" />
          <MetricBlock label="Max drawdown" value="$7.2K" sub="$3.8K - $13.3K" tone="text-warn" />
        </div>
        <div className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-medium">Monte Carlo equity paths</h3>
            <p className="font-mono text-sm text-dim">Day 109 / 109&nbsp;&nbsp; Median <span className="text-ink">$107.1K</span></p>
          </div>
          <EquityPathChart />
        </div>
      </div>
    </div>
  );
}

function PropFirmShowcase() {
  return (
    <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
      <div className="terminal-shadow overflow-hidden rounded-xl border border-edge-bright bg-panel">
        <div className="flex items-center justify-between border-b border-edge px-5 py-4">
          <div className="flex gap-7 text-sm text-dim">
            <span className="border-b border-ink pb-3 text-ink">Prop Firm</span>
            <span>Verdict</span>
            <span>Risk & Monte Carlo</span>
          </div>
          <span className="rounded-md border border-edge-bright px-3 py-1 text-sm text-dim">Topstep 50K</span>
        </div>
        <div className="grid gap-px bg-edge lg:grid-cols-[0.95fr_1.05fr]">
          <div className="bg-panel p-7">
            <Donut />
          </div>
          <div className="grid grid-cols-2 gap-px bg-edge">
            <MetricBlock label="Net EV mean" value="$579" sub="after rules" tone="text-pos" />
            <MetricBlock label="Payout probability" value="66.8%" sub="funded phase" tone="text-ink" />
            <MetricBlock label="Mean payout" value="$2,703" sub="gross" tone="text-ink" />
            <MetricBlock label="Days to payout" value="10.4" sub="median days" tone="text-ink" />
          </div>
        </div>
        <div className="p-6">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="text-dim">Challenge equity paths</span>
            <span className="text-faint">All paths (1000)</span>
          </div>
          <MiniChallengeChart />
        </div>
      </div>
      <FeatureCopy
        eyebrow="Prop-firm challenge presets"
        title="Translate strategy stats into pass, fail, timeout, and payout odds."
        desc="Instead of telling traders their setup is good, QuantPilot shows whether the strategy survives firm rules: daily loss, max drawdown, profit target, timeout, and payout constraints."
        items={["50K and 100K presets", "Pass/fail donut", "Payout EV", "Challenge equity paths"]}
      />
    </div>
  );
}

function ReportShowcase() {
  return (
    <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
      <FeatureCopy
        eyebrow="Strategy versioning"
        title="Every fix becomes proof the strategy improved."
        desc="A trader can save v1 through v4, compare readiness, export the report, and show the exact automation package that was generated."
        items={["Readiness history", "Version comparison", "Shareable report", "JSON export"]}
      />
      <div className="terminal-shadow overflow-hidden rounded-xl border border-edge-bright bg-panel">
        <div className="border-b border-edge px-5 py-4">
          <p className="text-sm font-medium">EURUSD validation report</p>
        </div>
        <div className="grid gap-px bg-edge md:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-3 bg-panel p-5">
            {VERSION_BARS.map(([label, score, desc, tone], i) => (
              <div key={label} className="rise rounded-lg border border-edge bg-bg p-3" style={{ animationDelay: `${i * 90}ms` }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-ink">{label}</span>
                  <span className={`font-mono text-sm ${tone}`}>{score}/100</span>
                </div>
                <div className="mt-3 h-1.5 rounded-full bg-raised">
                  <div className="hist-bar h-full rounded-full bg-accent/80" style={{ ["--bar-width" as string]: `${score}%` }} />
                </div>
                <p className="mt-2 text-xs text-faint">{desc}</p>
              </div>
            ))}
          </div>
          <div className="bg-panel p-5">
            <div className="rounded-lg border border-edge bg-bg p-4">
              <p className="text-xs text-faint">Shareable report</p>
              <h3 className="mt-3 text-2xl font-semibold">94/100 readiness</h3>
              <div className="mt-5 space-y-3 text-sm text-dim">
                <ReportRow label="Risk gates" value="6 / 6 pass" tone="text-pos" />
                <ReportRow label="Monte Carlo" value="64.8% pass" tone="text-accent" />
                <ReportRow label="Pine draft" value="generated" tone="text-pos" />
                <ReportRow label="Webhook JSON" value="generated" tone="text-ink" />
              </div>
              <div className="mt-6 rounded-lg border border-pos/20 bg-pos/5 p-3 font-mono text-xs leading-6 text-pos">
                + report.json exported<br />
                + blueprint.pine copied<br />
                + webhook_payload.json copied
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCopy({
  eyebrow,
  title,
  desc,
  items,
}: {
  eyebrow: string;
  title: string;
  desc: string;
  items: string[];
}) {
  return (
    <div>
      <p className="text-xs text-faint">{eyebrow}</p>
      <h2 className="mt-4 max-w-xl text-3xl font-semibold leading-tight sm:text-5xl">{title}</h2>
      <p className="mt-5 max-w-xl text-base leading-7 text-dim">{desc}</p>
      <div className="mt-8 space-y-5">
        {items.map((item, i) => (
          <div key={item} className="rise flex gap-4" style={{ animationDelay: `${i * 80}ms` }}>
            <span className="mt-1 h-8 w-8 rounded-md border border-edge-bright bg-panel text-center font-mono text-xs leading-8 text-accent">
              {i + 1}
            </span>
            <div>
              <p className="font-medium text-ink">{item}</p>
              <p className="mt-1 text-sm leading-relaxed text-dim">Generated by a focused agent step, then exposed as a concrete artifact.</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ToolCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-lg border border-edge bg-bg p-3">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs text-faint">{desc}</p>
    </div>
  );
}

function MetricBlock({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: string }) {
  return (
    <div className="bg-panel p-5">
      <p className="text-[11px] uppercase text-faint">{label}</p>
      <p className={`mt-3 font-mono text-2xl font-semibold ${tone}`}>{value}</p>
      <p className="mt-1 text-xs text-faint">{sub}</p>
    </div>
  );
}

function EquityPathChart() {
  return (
    <svg viewBox="0 0 920 330" className="h-[330px] w-full rounded-lg border border-edge bg-bg">
      {[0, 1, 2, 3, 4].map((row) => (
        <line key={row} x1="36" x2="884" y1={42 + row * 62} y2={42 + row * 62} stroke="rgba(255,255,255,0.07)" />
      ))}
      {[0, 1, 2, 3, 4, 5].map((col) => (
        <line key={col} y1="28" y2="304" x1={70 + col * 155} x2={70 + col * 155} stroke="rgba(255,255,255,0.04)" />
      ))}
      {Array.from({ length: 44 }).map((_, i) => {
        const base = 210 + (i % 8) * 9;
        const rise = (i % 6) * 18;
        const color = i % 7 === 0 ? "rgba(90,162,240,0.75)" : i % 5 === 0 ? "rgba(232,179,75,0.72)" : i % 3 === 0 ? "rgba(240,85,93,0.58)" : "rgba(52,211,153,0.58)";
        return (
          <path
            key={i}
            d={`M36 ${base} C170 ${base - 28 + rise} 250 ${base - 16} 382 ${base - 60 + rise} C512 ${base - 98 + rise} 642 ${base - 42} 884 ${base - 120 + rise}`}
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            className="draw-line"
            style={{ ["--line-len" as string]: 1120, animationDelay: `${i * 18}ms` }}
          />
        );
      })}
      <text x="44" y="24" className="fill-faint font-mono text-[11px]">$140K</text>
      <text x="44" y="312" className="fill-faint font-mono text-[11px]">$95K</text>
    </svg>
  );
}

function Donut() {
  return (
    <div className="flex items-center justify-center gap-8">
      <svg viewBox="0 0 220 220" className="h-56 w-56">
        <circle cx="110" cy="110" r="72" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="34" />
        <circle
          cx="110"
          cy="110"
          r="72"
          fill="none"
          stroke="rgba(52,211,153,0.88)"
          strokeWidth="34"
          strokeDasharray="124 452"
          strokeLinecap="butt"
          transform="rotate(-90 110 110)"
          className="score-ring"
        />
        <circle
          cx="110"
          cy="110"
          r="72"
          fill="none"
          stroke="rgba(240,85,93,0.9)"
          strokeWidth="34"
          strokeDasharray="328 452"
          strokeDashoffset="-124"
          transform="rotate(-90 110 110)"
        />
        <text x="110" y="105" textAnchor="middle" className="fill-ink font-mono text-xl">10,000</text>
        <text x="110" y="128" textAnchor="middle" className="fill-faint text-xs">sims</text>
      </svg>
      <div className="space-y-5">
        <div>
          <p className="text-2xl font-semibold text-pos">Pass: 27.35%</p>
          <p className="text-sm text-faint">avg 11.5 days</p>
        </div>
        <div>
          <p className="text-2xl font-semibold text-danger">Fail: 72.65%</p>
          <p className="text-sm text-faint">avg 7.2 days</p>
        </div>
      </div>
    </div>
  );
}

function MiniChallengeChart() {
  return (
    <svg viewBox="0 0 860 210" className="h-[210px] w-full rounded-lg border border-edge bg-bg">
      <line x1="28" x2="832" y1="72" y2="72" stroke="rgba(52,211,153,0.8)" strokeDasharray="6 6" />
      <text x="790" y="65" className="fill-pos text-xs">Target</text>
      {Array.from({ length: 52 }).map((_, i) => {
        const x2 = 90 + (i % 12) * 62;
        const y2 = 160 - ((i * 17) % 92);
        const stroke = i % 4 === 0 ? "rgba(240,85,93,0.5)" : "rgba(52,211,153,0.45)";
        return (
          <path
            key={i}
            d={`M28 174 L${x2 * 0.55} ${130 + (i % 8) * 5} L${x2} ${y2}`}
            fill="none"
            stroke={stroke}
            strokeWidth="1.3"
            className="draw-line"
            style={{ ["--line-len" as string]: 400, animationDelay: `${i * 16}ms` }}
          />
        );
      })}
    </svg>
  );
}

function ReportRow({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="flex items-center justify-between border-b border-edge pb-2">
      <span>{label}</span>
      <span className={tone}>{value}</span>
    </div>
  );
}
