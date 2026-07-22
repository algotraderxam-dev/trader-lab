"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type FirmPreset = {
  id: string;
  name: string;
  account: number;
  target: number;
  maxDrawdown: number;
  horizon: number;
};

type ApiResult = {
  monteCarlo: {
    bootstrap: McBlock;
    shuffle: McBlock;
  };
  paths: {
    paths: number[][];
    p05: number[];
    median: number[];
    p95: number[];
    actual: number[];
    nTrades: number;
  };
  challenge: {
    passRate: number;
    failRate: number;
    outcomes: Record<string, number>;
    medianDaysToPass: number | null;
    medianDaysToFail: number | null;
    p05Final: number;
    medianFinal: number;
    p95Final: number;
  };
  sizeSolution: {
    multiplier: number | null;
    passRate: number;
    targetPassRate: number;
  };
};

type McBlock = {
  method: "bootstrap" | "shuffle";
  nSimulations: number;
  nTrades: number;
  medianNetProfit: number;
  p05NetProfit: number;
  p95NetProfit: number;
  probProfitable: number;
  medianMaxDrawdown: number;
  p95MaxDrawdown: number;
  worstMaxDrawdown: number;
  medianLongestLosingStreak: number;
  p95LongestLosingStreak: number;
  riskOfRuin: number | null;
  drawdownMultiple: number;
};

const FIRMS: FirmPreset[] = [
  { id: "topstep_50k", name: "Topstep 50K Combine", account: 50_000, target: 3_000, maxDrawdown: 2_000, horizon: 60 },
  { id: "apex_50k", name: "Apex 50K Evaluation", account: 50_000, target: 3_000, maxDrawdown: 2_500, horizon: 60 },
  { id: "ftmo_100k", name: "FTMO 100K Challenge", account: 100_000, target: 10_000, maxDrawdown: 10_000, horizon: 30 },
  { id: "tpt_50k", name: "Take Profit Trader 50K", account: 50_000, target: 3_000, maxDrawdown: 2_000, horizon: 60 },
];

export function MonteCarlo() {
  const [firmId, setFirmId] = useState("topstep_50k");
  const [winRate, setWinRate] = useState(42);
  const [avgWinR, setAvgWinR] = useState(1.8);
  const [avgLossR, setAvgLossR] = useState(1);
  const [riskPct, setRiskPct] = useState(0.75);
  const [tradesPerDay, setTradesPerDay] = useState(3);
  const [result, setResult] = useState<ApiResult | null>(null);
  const [riskRows, setRiskRows] = useState<Array<{ risk: number; pass: number; ruin: number; p95dd: number }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const firm = FIRMS.find((item) => item.id === firmId) || FIRMS[0];

  const generated = useMemo(
    () => generateTrades({ account: firm.account, winRate, avgWinR, avgLossR, riskPct, tradesPerDay }),
    [firm.account, winRate, avgWinR, avgLossR, riskPct, tradesPerDay],
  );

  const run = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const payload = await callMonteCarlo({
        firm: firm.id,
        pnl: generated.pnl,
        dailyPnl: generated.dailyPnl,
        horizonDays: firm.horizon,
        nSimulations: 3000,
        challengeSimulations: 3000,
      });
      setResult(payload);

      const rows = await Promise.all(
        [0.25, 0.5, 0.75, 1, 1.5].map(async (risk) => {
          const sample = generateTrades({ account: firm.account, winRate, avgWinR, avgLossR, riskPct: risk, tradesPerDay });
          const row = await callMonteCarlo({
            firm: firm.id,
            pnl: sample.pnl,
            dailyPnl: sample.dailyPnl,
            horizonDays: firm.horizon,
            nSimulations: 800,
            challengeSimulations: 800,
            nPaths: 20,
          });
          return {
            risk,
            pass: row.challenge.passRate * 100,
            ruin: ((row.challenge.outcomes.fail_daily_loss || 0) + (row.challenge.outcomes.fail_max_drawdown || 0)) * 100,
            p95dd: row.monteCarlo.shuffle.p95MaxDrawdown,
          };
        }),
      );
      setRiskRows(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Monte Carlo failed.");
    } finally {
      setLoading(false);
    }
  }, [firm, generated, winRate, avgWinR, avgLossR, tradesPerDay]);

  useEffect(() => { run(); }, [run]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !result) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const all = [...result.paths.paths.flat(), ...result.paths.p05, ...result.paths.p95, firm.target, -firm.maxDrawdown];
    let min = Math.min(...all);
    let max = Math.max(...all);
    const pad = (max - min) * 0.08 || 1;
    min -= pad;
    max += pad;
    const days = result.paths.nTrades;
    const x = (i: number) => (i / Math.max(1, days - 1)) * w;
    const y = (v: number) => h - ((v - min) / Math.max(1, max - min)) * h;

    drawGuide(ctx, w, y(0), "rgba(154,154,163,0.35)");
    drawGuide(ctx, w, y(firm.target), "rgba(52,211,153,0.45)");
    drawGuide(ctx, w, y(-firm.maxDrawdown), "rgba(240,85,93,0.45)");

    result.paths.paths.slice(0, 90).forEach((path) => {
      drawPath(ctx, path, x, y, "rgba(123,132,255,0.12)", 1);
    });
    drawPath(ctx, result.paths.p05, x, y, "rgba(240,85,93,0.55)", 1.4);
    drawPath(ctx, result.paths.median, x, y, "rgba(243,244,246,0.75)", 1.8);
    drawPath(ctx, result.paths.p95, x, y, "rgba(52,211,153,0.55)", 1.4);
    drawPath(ctx, result.paths.actual, x, y, "rgba(123,132,255,0.95)", 2.2);
  }, [result, firm]);

  const bestRisk = riskRows.reduce(
    (best, row) => (!best || row.pass - row.ruin > best.pass - best.ruin ? row : best),
    riskRows[0],
  );
  const pass = result ? result.challenge.passRate * 100 : 0;
  const ruin = result ? ((result.challenge.outcomes.fail_daily_loss || 0) + (result.challenge.outcomes.fail_max_drawdown || 0)) * 100 : 0;
  const timeout = result ? (result.challenge.outcomes.timeout || 0) * 100 : 0;

  return (
    <section className="fade-up">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold sm:text-3xl">Monte Carlo prop-firm odds</h1>
        <p className="mt-2 text-sm leading-relaxed text-dim sm:text-base">
          Backend simulation using bootstrap, shuffle, and daily prop-firm challenge rules.
          The path chart shows sampled backend equity paths and percentile envelopes.
        </p>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[300px_1fr]">
        <div className="space-y-4 self-start rounded-xl border border-edge bg-panel p-5">
          <label className="block">
            <span className="font-mono text-[11px] text-faint">CHALLENGE</span>
            <select
              value={firmId}
              onChange={(event) => setFirmId(event.target.value)}
              className="mt-1.5 w-full rounded-md border border-edge-bright bg-raised px-3 py-2 text-sm text-ink outline-none focus:border-accent/60"
            >
              {FIRMS.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </label>
          <Slider label="WIN RATE" value={winRate} setValue={setWinRate} min={20} max={80} step={1} unit="%" />
          <Slider label="AVG WIN" value={avgWinR} setValue={setAvgWinR} min={0.5} max={5} step={0.1} unit="R" />
          <Slider label="AVG LOSS" value={avgLossR} setValue={setAvgLossR} min={0.5} max={2} step={0.1} unit="R" />
          <Slider label="RISK / TRADE" value={riskPct} setValue={setRiskPct} min={0.25} max={3} step={0.25} unit="%" />
          <Slider label="TRADES / DAY" value={tradesPerDay} setValue={setTradesPerDay} min={1} max={10} step={1} unit="" />
          <div className="border-t border-edge pt-4 font-mono text-[11px] leading-relaxed text-faint">
            ENGINE · {generated.pnl.length} synthetic trades · backend seed fixed · target ${firm.target.toLocaleString()} · max DD ${firm.maxDrawdown.toLocaleString()}
          </div>
          {bestRisk && (
            <div className="rounded-lg border border-accent/25 bg-accent/5 p-3">
              <p className="text-xs text-accent">Backend size sweep</p>
              <p className="mt-1 text-sm text-dim">
                Best tested risk: <span className="text-ink">{bestRisk.risk}%</span>,{" "}
                <span className="text-pos">{bestRisk.pass.toFixed(1)}%</span> pass,{" "}
                <span className="text-danger">{bestRisk.ruin.toFixed(1)}%</span> ruin.
              </p>
            </div>
          )}
          <button
            onClick={run}
            disabled={loading}
            className="w-full rounded-md bg-ink py-2 text-sm font-medium text-black transition hover:opacity-85 disabled:bg-raised disabled:text-faint"
          >
            {loading ? "Running backend..." : "Run backend simulation"}
          </button>
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>

        <div className="space-y-5">
          {result && (
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-edge bg-edge sm:grid-cols-5">
              <StatCell label="P(PASS)" value={`${pass.toFixed(1)}%`} tone="text-pos" sub="Daily challenge sim" />
              <StatCell label="P(RUIN)" value={`${ruin.toFixed(1)}%`} tone="text-danger" sub="Loss rule breach" />
              <StatCell label="P(TIMEOUT)" value={`${timeout.toFixed(1)}%`} tone="text-dim" sub="Ran out of days" />
              <StatCell label="P95 DD" value={money(result.monteCarlo.shuffle.p95MaxDrawdown)} tone="text-warn" sub="Shuffle method" />
              <StatCell label="BOOT PROFIT" value={`${(result.monteCarlo.bootstrap.probProfitable * 100).toFixed(1)}%`} tone="text-accent" sub="Bootstrap method" />
            </div>
          )}

          <div className="overflow-hidden rounded-xl border border-edge bg-panel">
            <div className="flex items-center justify-between border-b border-edge px-4 py-2.5">
              <span className="font-mono text-xs text-faint">BACKEND MONTE CARLO PATHS · bootstrap envelope</span>
              <span className="hidden gap-4 font-mono text-[11px] text-faint sm:flex">
                <i className="not-italic text-danger">p05</i>
                <i className="not-italic text-ink">median</i>
                <i className="not-italic text-pos">p95</i>
              </span>
            </div>
            <canvas ref={canvasRef} className="block h-72 w-full" />
          </div>

          {result && (
            <div className="grid gap-px overflow-hidden rounded-xl border border-edge bg-edge md:grid-cols-2">
              <PanelStat title="Bootstrap" rows={[
                ["Net range", `${money(result.monteCarlo.bootstrap.p05NetProfit)} to ${money(result.monteCarlo.bootstrap.p95NetProfit)}`],
                ["Median net", money(result.monteCarlo.bootstrap.medianNetProfit)],
                ["Risk of ruin", result.monteCarlo.bootstrap.riskOfRuin === null ? "—" : `${(result.monteCarlo.bootstrap.riskOfRuin * 100).toFixed(1)}%`],
                ["P95 losing streak", result.monteCarlo.bootstrap.p95LongestLosingStreak.toFixed(0)],
              ]} />
              <PanelStat title="Prop-firm challenge" rows={[
                ["Median days to pass", result.challenge.medianDaysToPass ? result.challenge.medianDaysToPass.toFixed(0) : "—"],
                ["Median final", money(result.challenge.medianFinal)],
                ["5th pct final", money(result.challenge.p05Final)],
                ["Size solution", result.sizeSolution.multiplier === null ? "No tested size reaches 80%" : `${(result.sizeSolution.multiplier * 100).toFixed(0)}% size`],
              ]} />
            </div>
          )}

          {riskRows.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-edge bg-panel">
              <div className="border-b border-edge px-4 py-2.5">
                <span className="text-xs text-faint">Backend what-if risk sweep</span>
              </div>
              <div className="grid gap-px bg-edge sm:grid-cols-5">
                {riskRows.map((row) => (
                  <div key={row.risk} className="bg-panel p-4">
                    <p className="text-[11px] text-faint">{row.risk}% risk</p>
                    <p className="mt-2 text-lg text-pos">{row.pass.toFixed(0)}% pass</p>
                    <p className="mt-1 text-xs text-danger">{row.ruin.toFixed(0)}% ruin</p>
                    <p className="mt-1 text-[11px] text-faint">P95 DD {money(row.p95dd)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs leading-relaxed text-faint">
            Synthetic controls are for demo. Uploaded trade logs use their actual PnL distribution through the backend.
            Firm presets remain unverified until checked against current firm documentation.
          </p>
        </div>
      </div>
    </section>
  );
}

async function callMonteCarlo(body: Record<string, unknown>): Promise<ApiResult> {
  const response = await fetch("/api/monte-carlo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Monte Carlo failed.");
  return payload;
}

function generateTrades({
  account,
  winRate,
  avgWinR,
  avgLossR,
  riskPct,
  tradesPerDay,
}: {
  account: number;
  winRate: number;
  avgWinR: number;
  avgLossR: number;
  riskPct: number;
  tradesPerDay: number;
}) {
  const pnl: number[] = [];
  const dailyPnl: number[] = [];
  const riskDollars = account * (riskPct / 100);
  let daily = 0;
  let lossCluster = 0;

  for (let i = 0; i < 180; i++) {
    const wave = Math.sin(i * 1.91) * 0.5 + Math.sin(i * 0.37) * 0.5;
    const threshold = winRate / 100 - (lossCluster ? 0.07 : 0);
    const win = fractional(i * 9301 + 49297) < threshold;
    const jitter = 0.78 + Math.abs(wave) * 0.42;
    const value = win ? riskDollars * avgWinR * jitter : -riskDollars * avgLossR * jitter;
    pnl.push(Number(value.toFixed(2)));
    daily += value;
    lossCluster = win ? 0 : Math.min(3, lossCluster + 1);
    if ((i + 1) % tradesPerDay === 0) {
      dailyPnl.push(Number(daily.toFixed(2)));
      daily = 0;
    }
  }
  if (daily !== 0) dailyPnl.push(Number(daily.toFixed(2)));
  return { pnl, dailyPnl };
}

function fractional(value: number) {
  const x = Math.sin(value) * 10000;
  return x - Math.floor(x);
}

function drawGuide(ctx: CanvasRenderingContext2D, width: number, y: number, color: string) {
  ctx.strokeStyle = color;
  ctx.setLineDash([4, 4]);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(width, y);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawPath(
  ctx: CanvasRenderingContext2D,
  path: number[],
  x: (i: number) => number,
  y: (value: number) => number,
  color: string,
  width: number,
) {
  if (!path.length) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x(0), y(path[0]));
  for (let i = 1; i < path.length; i++) ctx.lineTo(x(i), y(path[i]));
  ctx.stroke();
}

function money(value: number) {
  const sign = value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function Slider({
  label, value, setValue, min, max, step, unit,
}: {
  label: string; value: number; setValue: (v: number) => void;
  min: number; max: number; step: number; unit: string;
}) {
  return (
    <label className="block">
      <span className="flex items-center justify-between">
        <span className="font-mono text-[11px] text-faint">{label}</span>
        <span className="font-mono text-sm text-ink">{value}{unit}</span>
      </span>
      <input
        type="range"
        min={min} max={max} step={step} value={value}
        onChange={(event) => setValue(Number(event.target.value))}
        className="mt-1.5 w-full accent-[var(--accent)]"
      />
    </label>
  );
}

function StatCell({ label, value, tone, sub }: { label: string; value: string; tone: string; sub: string }) {
  return (
    <div className="bg-panel p-4">
      <p className="font-mono text-[11px] text-faint">{label}</p>
      <p className={`mt-1 font-mono text-xl ${tone}`}>{value}</p>
      <p className="mt-1 text-[11px] text-faint">{sub}</p>
    </div>
  );
}

function PanelStat({ title, rows }: { title: string; rows: Array<[string, string]> }) {
  return (
    <div className="bg-panel p-5">
      <p className="text-xs text-faint">{title}</p>
      <div className="mt-4 space-y-2.5">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 text-sm">
            <span className="text-dim">{label}</span>
            <span className="text-right font-mono text-ink">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
