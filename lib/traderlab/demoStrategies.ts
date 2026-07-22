export const DEMO_EMAIL = "demo@quantpilot.local";

export const DEMO_STRATEGIES = [
  {
    name: "EURUSD London EMA Pullback",
    plan: "pro" as const,
    text: "I trade EURUSD 15m during London. I buy pullbacks into EMA50 only when EMA20 is above EMA50, RSI reclaims 50, stop goes under swing low, target is 2R, risk 0.5% per trade, max 3 trades per day, daily loss halt at 2%.",
    csv: tradeCsv("EURUSD", [120, -60, 160, -55, 140, 180, -70, 210, -65, 130, 170, -80, 240, -55, 150, 190, -95, 220, 110, -70, 180, 260, -85, 150, 205, -75, 160, 230, -65, 175, 210, -90, 280, 145, -60, 195, 250, -80, 170, 225, -70, 155, 300, -95, 190, 210, -75, 260, 140, -65, 230, 180, -85, 255, 165, -70, 205, 275, -90, 220]),
  },
  {
    name: "NQ Opening Range Breakout",
    plan: "pro" as const,
    text: "I trade NQ 5m NY open breakout. I wait for the first 15 minute range, go long on break and hold above range high with volume momentum, stop below range midpoint, target 1.8R, risk 0.4% per trade, max 2 trades per day, daily loss cap 1.5%.",
    csv: tradeCsv("NQ", [180, 220, -110, 260, -95, 310, -120, 240, 190, -105, 330, -125, 280, 210, -100, 360, -130, 240, 270, -115, 420, -140, 230, 300, -105, 340, 260, -150, 390, -120, 250, 410, -135, 290, 310, -110, 380, -145, 275, 430, -160, 300, 335, -120, 460, -150, 280, 390, -130, 320, 410, -170, 350, 440, -140, 290, 470, -155, 315, 500]),
  },
  {
    name: "XAUUSD VWAP Mean Reversion",
    plan: "research" as const,
    text: "I trade XAUUSD 15m mean reversion. I fade moves one ATR away from VWAP during London/New York overlap when RSI is overbought or oversold. Stop is 1.2 ATR, target is 1.5R, risk 0.35% per trade, max 4 trades per day, daily halt 2%.",
    csv: tradeCsv("XAUUSD", [-90, 145, 130, -80, 155, -85, 170, 120, -95, 160, 185, -100, 140, 175, -90, 150, 190, -105, 165, 135, -80, 180, 155, -95, 200, 145, -110, 170, 190, -85, 160, 210, -100, 185, 150, -90, 220, 175, -115, 160, 195, -95, 205, 155, -85, 230, 180, -120, 170, 215, -100, 190, 160, -90, 240, 185, -110, 175, 225, -95]),
  },
];

function tradeCsv(symbol: string, pnl: number[]) {
  const lines = ["symbol,entry_time,exit_time,pnl,r_multiple"];
  const start = new Date("2025-01-06T08:00:00.000Z");
  const multiplier = symbol === "NQ" ? 2.5 : 5;
  const scaled = pnl.map((value) => value * multiplier);
  const medianLoss = median(scaled.filter((value) => value < 0).map(Math.abs)) || 100;
  const expanded = Array.from({ length: Math.max(120, scaled.length) }, (_, index) => {
    const base = scaled[index % scaled.length];
    const cycle = Math.floor(index / pnl.length);
    const drift = cycle === 0 ? 0 : base > 0 ? (8 + (index % 5) * 3) * multiplier : (-4 - (index % 4) * 2) * multiplier;
    return base + drift;
  });
  expanded.forEach((value, index) => {
    const entry = new Date(start.getTime() + index * 86_400_000 + (index % 3) * 45 * 60 * 1000);
    const exit = new Date(entry.getTime() + 35 * 60 * 1000);
    lines.push([
      symbol,
      entry.toISOString(),
      exit.toISOString(),
      value,
      Number((value / medianLoss).toFixed(3)),
    ].join(","));
  });
  return lines.join("\n");
}

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}
