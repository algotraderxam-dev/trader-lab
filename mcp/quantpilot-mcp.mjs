#!/usr/bin/env node

const APP_URL = process.env.QUANTPILOT_APP_URL || process.env.AXIOMEDGE_APP_URL || process.env.TRADERLAB_APP_URL || "http://localhost:3001";

const tools = [
  {
    name: "analyze_strategy",
    description: "Validate strategy text with the QuantPilot engine and return readiness, compiled spec, Monte Carlo, blueprint, and report evidence.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Raw trading strategy description." },
        csv: { type: "string", description: "Optional CSV trade log with pnl/profit or r_multiple columns." },
      },
      required: ["text"],
    },
  },
  {
    name: "parse_trade_log",
    description: "Parse a CSV trade log and return normalized trades, warnings, stats, and daily PnL.",
    inputSchema: {
      type: "object",
      properties: {
        csv: { type: "string", description: "CSV content." },
      },
      required: ["csv"],
    },
  },
  {
    name: "list_projects",
    description: "List saved QuantPilot strategy projects for an email.",
    inputSchema: {
      type: "object",
      properties: {
        email: { type: "string", description: "Customer or demo email." },
      },
      required: ["email"],
    },
  },
  {
    name: "get_report",
    description: "Fetch a saved QuantPilot report by project ID.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Saved project ID." },
      },
      required: ["projectId"],
    },
  },
  {
    name: "seed_demo_projects",
    description: "Seed the local app with three engine-generated demo projects for a workspace email.",
    inputSchema: {
      type: "object",
      properties: {
        email: { type: "string", description: "Optional customer email. Defaults to demo@quantpilot.local." },
      },
    },
  },
];

const methods = {
  initialize: async () => ({
    protocolVersion: "2024-11-05",
    capabilities: { tools: {} },
    serverInfo: { name: "quantpilot-mcp", version: "0.1.0" },
  }),
  "tools/list": async () => ({ tools }),
  "tools/call": async (params) => {
    const name = params?.name;
    const args = params?.arguments || {};
    const result = await callTool(name, args);
    return {
      content: [
        {
          type: "text",
          text: typeof result === "string" ? result : JSON.stringify(result, null, 2),
        },
      ],
    };
  },
};

async function callTool(name, args) {
  if (name === "analyze_strategy") {
    return post("/api/analyze", { text: args.text, csv: args.csv });
  }
  if (name === "parse_trade_log") {
    return post("/api/trade-log", { csv: args.csv });
  }
  if (name === "list_projects") {
    return get(`/api/projects?email=${encodeURIComponent(args.email)}`);
  }
  if (name === "get_report") {
    return get(`/api/reports/${encodeURIComponent(args.projectId)}`);
  }
  if (name === "seed_demo_projects") {
    return post("/api/demo-projects/seed", { email: args.email });
  }
  throw new Error(`Unknown tool: ${name}`);
}

async function get(path) {
  const response = await fetch(`${APP_URL}${path}`);
  return parseResponse(response);
}

async function post(path, body) {
  const response = await fetch(`${APP_URL}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseResponse(response);
}

async function parseResponse(response) {
  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = text;
  }
  if (!response.ok) {
    throw new Error(typeof payload === "object" && payload?.error ? payload.error : `HTTP ${response.status}`);
  }
  return payload;
}

let buffer = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  let index;
  while ((index = buffer.indexOf("\n")) >= 0) {
    const line = buffer.slice(0, index).trim();
    buffer = buffer.slice(index + 1);
    if (line) handleLine(line);
  }
});

async function handleLine(line) {
  let message;
  try {
    message = JSON.parse(line);
  } catch {
    return;
  }

  if (!message.id || !message.method) return;

  try {
    const handler = methods[message.method];
    if (!handler) throw new Error(`Method not found: ${message.method}`);
    const result = await handler(message.params);
    write({ jsonrpc: "2.0", id: message.id, result });
  } catch (error) {
    write({
      jsonrpc: "2.0",
      id: message.id,
      error: {
        code: -32000,
        message: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
}

function write(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}
