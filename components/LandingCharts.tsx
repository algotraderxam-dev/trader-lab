const FILES = [
  ["README.md", "M"],
  ["strategy_rules.py", "PY"],
  ["trade_log.csv", "CSV"],
  ["blueprint.pine", "TV"],
];

const CODE_LINES = [
  ['"""Formalize EURUSD EMA pullback strategy and test automation readiness."""', "text-pos"],
  ["from quantpilot import rules, backtest, propfirm, blueprint", "text-accent"],
  ["", ""],
  ['strategy = rules.from_prompt("EURUSD 15m EMA50 pullback, London only")', "text-dim"],
  ["strategy.require_stop_loss(method='swing_low', max_distance=0.004)", "text-dim"],
  ["strategy.require_daily_halt(max_loss_pct=3.0)", "text-dim"],
  ["", ""],
  ["test = backtest.run(strategy, symbol='EURUSD', timeframe='15m')", "text-dim"],
  ["odds = propfirm.monte_carlo(test.trades, preset='Topstep 50K')", "text-dim"],
  ["export = blueprint.to_tradingview(strategy, webhook=True)", "text-dim"],
];

const PIPELINE = ["rules", "backtest", "monte carlo", "pine + webhook"];

const EQUITY_PATHS = [
  "M24 214 C92 178 138 190 198 143 C258 96 315 132 382 70",
  "M24 224 C93 202 146 214 205 176 C266 138 314 152 382 118",
  "M24 232 C88 220 145 246 205 216 C267 188 318 210 382 182",
  "M24 238 C93 255 147 236 205 258 C270 284 318 262 382 298",
  "M24 246 C96 266 148 284 205 306 C270 330 322 318 382 344",
];

const HISTOGRAM = [18, 28, 44, 76, 98, 82, 58, 34, 20];

export function LandingCharts() {
  return (
    <div className="premium-shell live-border drift-up overflow-hidden rounded-xl border border-edge-bright bg-panel">
      <div className="grid min-h-[590px] bg-edge lg:grid-cols-[230px_1fr_1fr]">
        <aside className="hidden border-r border-edge bg-[#090a0c] lg:block">
          <div className="relative overflow-hidden border-b border-edge px-4 py-3.5">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-faint">QuantPilot project</p>
            <span className="trace-x pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
          </div>
          <div className="space-y-1 p-3">
            {FILES.map(([name, icon], i) => (
              <div
                key={name}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-[13px] ${
                  i === 1 ? "bg-panel text-ink" : "text-dim"
                }`}
                style={{ animationDelay: `${i * 70}ms` }}
              >
                <span className="w-8 rounded border border-edge-bright/80 py-0.5 text-center font-mono text-[10px] text-faint">
                  {icon}
                </span>
                <span>{name}</span>
              </div>
            ))}
          </div>
        </aside>

        <section className="border-r border-edge bg-bg">
          <div className="relative flex h-12 items-center justify-between overflow-hidden border-b border-edge bg-[#0c0d10]">
            <div className="flex h-full items-center">
              <div className="flex h-full items-center border-t-2 border-accent bg-panel px-4 text-[13px] text-ink">
                strategy_rules.py
              </div>
            </div>
            <button className="mr-3 rounded-md bg-ink px-3 py-1.5 text-[13px] font-medium text-black">
              Run
            </button>
            <span className="scan-line pointer-events-none absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>
          <div className="p-4 font-mono text-[12px] leading-6">
            {CODE_LINES.map(([line, color], i) => (
              <div
                key={`${line}-${i}`}
                className="rise grid grid-cols-[34px_1fr]"
                style={{ animationDelay: `${90 + i * 35}ms` }}
              >
                <span className="select-none text-right text-faint">{i + 1}</span>
                <span
                  className={`type-line overflow-hidden whitespace-nowrap pl-4 ${color || "text-dim"}`}
                  style={{
                    ["--chars" as string]: Math.max(line.length, 1),
                    ["--type-delay" as string]: `${220 + i * 120}ms`,
                  }}
                >
                  {line || " "}
                </span>
              </div>
            ))}
          </div>
          <div className="mx-4 mt-2 grid gap-px overflow-hidden rounded-lg border border-edge bg-edge sm:grid-cols-3">
            <Metric label="Readiness" value="78/100" tone="text-warn" delay="460ms" />
            <Metric label="Backtest" value="+8.6R" tone="text-pos" delay="520ms" />
            <Metric label="P(pass)" value="64.8%" tone="text-accent" delay="580ms" />
          </div>
          <div className="mx-4 mt-4 grid gap-px overflow-hidden rounded-lg border border-edge bg-edge sm:grid-cols-4">
            {PIPELINE.map((item, i) => (
              <div
                key={item}
                className="rise bg-panel px-3 py-3"
                style={{ animationDelay: `${650 + i * 90}ms` }}
              >
                <div className="mb-2 h-1 overflow-hidden rounded-full bg-raised">
                  <div
                    className="h-full rounded-full bg-accent/70"
                    style={{ width: `${42 + i * 17}%` }}
                  />
                </div>
                <p className="text-[11px] text-faint">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-panel">
          <div className="relative flex h-12 items-center justify-between overflow-hidden border-b border-edge px-4">
            <h3 className="text-sm font-medium text-ink">EURUSD prop-firm odds</h3>
            <span className="flex items-center gap-2 text-xs text-faint">
              <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-pos" />
              rendering
            </span>
            <span className="trace-x pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
          </div>
          <div className="space-y-4 p-4">
            <div className="rise rounded-lg border border-edge bg-bg p-4" style={{ animationDelay: "160ms" }}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-lg font-medium text-ink">5,000 challenge simulations</h4>
                  <p className="mt-1 text-xs text-faint">100K 2-step preset | 60 trading days | 0.5% risk</p>
                </div>
                <div className="text-right font-mono">
                  <p className="text-2xl text-accent">64.8%</p>
                  <p className="text-[11px] text-faint">P(pass)</p>
                </div>
              </div>
              <MonteCarloVisual />
            </div>

            <div className="grid gap-px overflow-hidden rounded-lg border border-edge bg-edge sm:grid-cols-3">
              <Metric label="p95 DD" value="-5.1R" tone="text-warn" delay="620ms" />
              <Metric label="ruin risk" value="12.4%" tone="text-danger" delay="690ms" />
              <Metric label="best risk" value="0.5%" tone="text-pos" delay="760ms" />
            </div>

            <div className="rise rounded-lg border border-edge bg-raised p-3 text-sm leading-relaxed text-dim" style={{ animationDelay: "840ms" }}>
              Want me to turn this into a TradingView alert package with webhook JSON,
              Pine Script draft, and a paper-trading rollout?
            </div>
          </div>
          <div className="m-4 mt-0 rounded-lg border border-edge bg-bg px-4 py-3 text-sm text-faint">
            Ask QuantPilot to edit, run, or explain...
          </div>
        </section>
      </div>
    </div>
  );
}

function MonteCarloVisual() {
  return (
    <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_130px]">
      <svg viewBox="0 0 410 360" className="h-[280px] w-full overflow-visible">
        <defs>
          <linearGradient id="passBand" x1="0" x2="1">
            <stop offset="0%" stopColor="rgba(123,132,255,0.04)" />
            <stop offset="100%" stopColor="rgba(123,132,255,0.28)" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3, 4].map((row) => (
          <line
            key={`row-${row}`}
            x1="24"
            y1={58 + row * 58}
            x2="382"
            y2={58 + row * 58}
            stroke="rgba(255,255,255,0.09)"
          />
        ))}
        {[0, 1, 2, 3, 4, 5].map((col) => (
          <line
            key={`col-${col}`}
            x1={24 + col * 71}
            y1="44"
            x2={24 + col * 71}
            y2="334"
            stroke="rgba(255,255,255,0.06)"
          />
        ))}
        <path d="M24 84 L382 84 L382 44 L24 44 Z" fill="url(#passBand)" />
        <path d="M24 288 L382 288 L382 334 L24 334 Z" fill="rgba(240,85,93,0.08)" />
        <text x="28" y="36" className="fill-faint font-mono text-[11px]">target</text>
        <text x="28" y="352" className="fill-faint font-mono text-[11px]">drawdown floor</text>
        {EQUITY_PATHS.map((path, i) => (
          <path
            key={path}
            d={path}
            fill="none"
            stroke={i < 2 ? "rgba(52,211,153,0.88)" : i === 2 ? "rgba(123,132,255,0.85)" : "rgba(240,85,93,0.78)"}
            strokeWidth="2"
            strokeLinecap="round"
            className="draw-line"
            style={{
              ["--line-len" as string]: 620,
              animationDelay: `${320 + i * 150}ms`,
            }}
          />
        ))}
        {Array.from({ length: 36 }).map((_, i) => {
          const x = 42 + (i % 12) * 27;
          const y = 104 + Math.floor(i / 12) * 72 + ((i * 19) % 34);
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="2.6"
              fill="rgba(255,255,255,0.68)"
              className="spark-dot"
              style={{ animationDelay: `${520 + i * 24}ms` }}
            />
          );
        })}
      </svg>
      <div className="flex flex-col justify-end gap-1">
        {HISTOGRAM.map((height, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-2 flex-1 rounded-full bg-raised">
              <div
                className="hist-bar h-full rounded-full bg-accent/70"
                style={{
                  ["--bar-width" as string]: `${height}%`,
                  animationDelay: `${420 + i * 45}ms`,
                }}
              />
            </div>
            <span className="w-5 text-right font-mono text-[10px] text-faint">{i + 1}</span>
          </div>
        ))}
        <p className="mt-3 text-[11px] leading-relaxed text-faint">
          Outcome distribution from shuffled trade returns.
        </p>
      </div>
    </div>
  );
}

function Metric({ label, value, tone, delay }: { label: string; value: string; tone: string; delay: string }) {
  return (
    <div className="rise bg-panel p-3" style={{ animationDelay: delay }}>
      <p className="text-[11px] text-faint">{label}</p>
      <p className={`mt-1 text-sm ${tone}`}>{value}</p>
    </div>
  );
}
