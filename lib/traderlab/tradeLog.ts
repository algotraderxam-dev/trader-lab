import type { Trade } from "./metrics";
import { MAX_TRADE_ROWS } from "./limits";

type ParseResult = {
  trades: Trade[];
  warnings: string[];
  columns: string[];
};

const PNL_KEYS = ["pnl", "profit", "net profit", "net_profit", "profit/loss", "pl", "p&l"];
const R_KEYS = ["r_multiple", "r multiple", "r", "rr", "r-multiple"];
const ENTRY_TIME_KEYS = ["entry_time", "entry time", "entry date", "entry_date", "open time", "time"];
const EXIT_TIME_KEYS = ["exit_time", "exit time", "exit date", "exit_date", "close time", "date"];

export function parseTradeCsv(csv: string): ParseResult {
  const rows = parseCsvRows(csv);
  if (rows.length < 2) {
    throw new Error("CSV needs a header row and at least one trade row.");
  }

  if (rows.length - 1 > MAX_TRADE_ROWS) {
    throw new Error(`Trade log capped at ${MAX_TRADE_ROWS} rows.`);
  }

  const headers = rows[0].map((header) => normalize(header));
  const columns = rows[0].map((header) => header.trim());
  const pnlIndex = findIndex(headers, PNL_KEYS);
  const rIndex = findIndex(headers, R_KEYS);
  const entryIndex = findIndex(headers, ENTRY_TIME_KEYS);
  const exitIndex = findIndex(headers, EXIT_TIME_KEYS);
  const warnings: string[] = [];

  if (pnlIndex === -1 && rIndex === -1) {
    throw new Error("CSV must include a PnL/profit column or an R multiple column.");
  }

  if (pnlIndex === -1) warnings.push("No PnL column found; assuming $100 risk per R.");
  if (rIndex === -1) warnings.push("No R multiple column found; deriving R from PnL using median loss size.");
  if (entryIndex === -1 || exitIndex === -1) warnings.push("No complete entry/exit timestamp columns found; synthetic dates were assigned.");

  const raw = rows.slice(1).map((row, rowIndex) => ({
    row,
    pnl: pnlIndex >= 0 ? money(row[pnlIndex]) : null,
    r: rIndex >= 0 ? number(row[rIndex]) : null,
    entryTime: entryIndex >= 0 ? date(row[entryIndex]) : null,
    exitTime: exitIndex >= 0 ? date(row[exitIndex]) : null,
    rowIndex,
  })).filter((row) => row.pnl !== null || row.r !== null);

  if (raw.length < 2) {
    throw new Error("Could not parse at least 2 valid trades from the CSV.");
  }

  const medianLoss = median(
    raw
      .map((row) => row.pnl)
      .filter((value): value is number => typeof value === "number" && value < 0)
      .map(Math.abs),
  ) || 100;

  const start = new Date("2025-01-06T09:30:00.000Z");
  const trades = raw.map((row, index): Trade => {
    const entry = row.entryTime || new Date(start.getTime() + index * 86_400_000);
    const exit = row.exitTime || new Date(entry.getTime() + 45 * 60 * 1000);
    const pnl = row.pnl ?? (row.r || 0) * medianLoss;
    const rMultiple = row.r ?? pnl / medianLoss;
    return {
      entryTime: entry.toISOString(),
      exitTime: exit.toISOString(),
      pnl: Number(pnl.toFixed(2)),
      rMultiple: Number(rMultiple.toFixed(4)),
    };
  }).sort((a, b) => a.exitTime.localeCompare(b.exitTime));

  return { trades, warnings, columns };
}

function parseCsvRows(input: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    const next = input[i + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      i++;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i++;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

function findIndex(headers: string[], keys: string[]) {
  return headers.findIndex((header) => keys.includes(header));
}

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function money(value: string | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  const negative = /^\(.*\)$/.test(trimmed);
  const parsed = Number(trimmed.replace(/[$,%\s()]/g, ""));
  if (!Number.isFinite(parsed)) return null;
  return negative ? -Math.abs(parsed) : parsed;
}

function number(value: string | undefined) {
  if (!value) return null;
  const parsed = Number(value.replace(/[rR,%\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function date(value: string | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}
