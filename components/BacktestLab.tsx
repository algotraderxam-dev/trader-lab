const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"];
const RETURNS = [1.2, -0.7, 2.4, 1.1, -1.5, 3.2, 0.8, 2.1];

export function BacktestLab() {
  const points = [0, 1.2, 0.5, 2.9, 4.0, 2.5, 5.7, 6.5, 8.6];
  const min = -1;
  const max = 9;
  const W = 900;
  const H = 260;
  const PAD = 18;
  const x = (i: number) => PAD + (i / (points.length - 1)) * (W - PAD * 2);
  const y = (v: number) => H - PAD - ((v - min) / (max - min)) * (H - PAD * 2);
  const line = points.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const area = `${x(0)},${y(0)} ${line} ${x(points.length - 1)},${H - PAD}`;

  return (
    <section className="fade-up">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold sm:text-3xl">Backtest lab</h1>
        <p className="mt-2 text-sm leading-relaxed text-dim sm:text-base">
          Run the validated rules against historical data, inspect the equity path,
          and check whether the edge survives realistic costs, drawdown, and sample size.
        </p>
      </div>

      <div className="mt-6 grid gap-px overflow-hidden rounded-xl border border-edge bg-edge sm:grid-cols-4">
        <Cell label="NET RESULT" value="+8.6R" tone="text-pos" sub="183 historical trades" />
        <Cell label="PROFIT FACTOR" value="1.62" tone="text-ink" sub="After spread + commission" />
        <Cell label="MAX DRAWDOWN" value="-4.8R" tone="text-warn" sub="Peak-to-trough" />
        <Cell label="ROBUSTNESS" value="B-" tone="text-accent" sub="Needs larger sample" />
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-edge bg-panel">
        <div className="flex items-center justify-between border-b border-edge px-4 py-2.5">
          <span className="text-xs text-faint">Equity curve, validated rule set</span>
          <span className="text-xs text-pos">positive, but drawdown clustered</span>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-72 w-full" preserveAspectRatio="none">
          <line x1={PAD} x2={W - PAD} y1={y(0)} y2={y(0)} stroke="var(--border-bright)" strokeDasharray="5 6" />
          <polygon points={area} fill="var(--pos)" opacity="0.06" />
          <polyline points={line} fill="none" stroke="var(--pos)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="draw-line" />
          {points.map((v, i) => (
            <circle key={i} cx={x(i)} cy={y(v)} r="4" fill="var(--bg-panel)" stroke="var(--pos)" strokeWidth="1.8" />
          ))}
        </svg>
      </div>

      <div className="mt-5 grid gap-px overflow-hidden rounded-xl border border-edge bg-edge md:grid-cols-2">
        <div className="bg-panel p-5">
          <p className="text-xs text-faint">Monthly R distribution</p>
          <div className="mt-5 flex h-36 items-end gap-2">
            {RETURNS.map((r, i) => (
              <div key={MONTHS[i]} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className={`w-full rounded-t-sm ${r >= 0 ? "bg-pos/70" : "bg-danger/70"}`}
                  style={{ height: `${Math.max(12, Math.abs(r) * 28)}px` }}
                />
                <span className="text-[11px] text-faint">{MONTHS[i]}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-panel p-5">
          <p className="text-xs text-faint">Backtest warnings</p>
          <ul className="mt-4 space-y-3 text-sm text-dim">
            <li>Sample size below 200 trades. Treat the grade as provisional.</li>
            <li>Losses cluster during low-volatility sessions.</li>
            <li>Retest with slippage and wider spread before automation.</li>
          </ul>
        </div>
      </div>
    </section>
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
