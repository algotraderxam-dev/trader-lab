import Link from "next/link";
import { Logo } from "@/components/Logo";
import { LandingCharts } from "@/components/LandingCharts";
import { LandingShowcases } from "@/components/LandingShowcases";

const MODULES = [
  {
    name: "Rule Validation",
    desc: "Turn a strategy description into explicit entry, exit, sizing, session, and risk rules before any automation work begins.",
    meta: "Core",
  },
  {
    name: "Prop-Firm Odds",
    desc: "Run probability simulations against challenge constraints: profit target, daily loss, max drawdown, and timeout.",
    meta: "Simulation",
  },
  {
    name: "Backtest Lab",
    desc: "Inspect equity curve, monthly R, drawdown, profit factor, sample size, and warnings before trusting a strategy.",
    meta: "Backtest",
  },
  {
    name: "Automation Blueprint",
    desc: "Export TradingView alert logic, webhook payload, Pine Script draft, and a staged rollout plan after validation.",
    meta: "Export",
  },
  {
    name: "Versioning + Report",
    desc: "Save strategy versions, compare readiness scores, and export a shareable report for screenshots or PDF delivery.",
    meta: "Proof",
  },
];

const AGENTS = [
  {
    name: "Rule Agent",
    desc: "Reads a messy strategy description and turns it into explicit entry, exit, sizing, session, and filter rules.",
    output: "Validated rule sheet",
  },
  {
    name: "Risk Agent",
    desc: "Finds missing stops, daily loss limits, sizing conflicts, news exposure, and automation blockers.",
    output: "Readiness score",
  },
  {
    name: "Backtest Agent",
    desc: "Prepares the test protocol, flags sample-size problems, reads the equity path, and grades robustness.",
    output: "Backtest lab",
  },
  {
    name: "Prop-Firm Agent",
    desc: "Runs Monte Carlo across challenge rules and finds what risk setting gives the best survival profile.",
    output: "Pass / ruin odds",
  },
  {
    name: "Version Agent",
    desc: "Creates v1, v2, v3, and v4 variants so a trader can see what improved the strategy.",
    output: "Version comparison",
  },
  {
    name: "Blueprint Agent",
    desc: "Exports TradingView alerts, webhook JSON, Pine Script draft, and the staged rollout plan.",
    output: "Automation package",
  },
];

const WORKFLOW = [
  ["01", "Describe the idea", "Paste the strategy exactly how the trader explains it."],
  ["02", "Agents formalize it", "Rules, risk gates, assumptions, and missing controls are extracted."],
  ["03", "Backtest and stress test", "The workspace shows equity path, drawdown, robustness, and prop-firm odds."],
  ["04", "Compare versions", "Every fix becomes a new version with a cleaner score and better risk profile."],
  ["05", "Export the package", "Get the report, webhook payload, TradingView alerts, and Pine Script draft."],
];

const AUDIT_ROWS = [
  ["Entry conditions defined", "PASS", "pos"],
  ["Exit conditions defined", "PASS", "pos"],
  ["Hard stop-loss logic", "MISSING", "danger"],
  ["Max daily loss rule", "MISSING", "danger"],
  ["Position sizing model", "PASS", "pos"],
  ["Session / time filter", "PASS", "pos"],
] as const;

export default function Landing() {
  return (
    <main className="flex-1">
      {/* nav */}
      <header className="sticky top-0 z-40 border-b border-edge bg-bg/88 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Logo />
          <nav className="flex items-center gap-7 text-[14px] text-dim">
            <a href="#features" className="hidden transition hover:text-ink sm:block">Features</a>
            <a href="#agents" className="hidden transition hover:text-ink sm:block">Agents</a>
            <a href="#pricing" className="hidden transition hover:text-ink sm:block">Pricing</a>
            <Link
              href="/checkout?plan=pro"
              className="rounded-md bg-ink px-4 py-1.5 text-sm font-medium text-black transition hover:opacity-85"
            >
              Get access
            </Link>
          </nav>
        </div>
      </header>

      {/* hero */}
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-16">
        <div>
          <div className="max-w-3xl">
            <p className="fade-up mb-5 text-[13px] text-faint">
              QuantPilot for systematic traders
            </p>
            <h1 className="fade-up max-w-2xl text-[34px] font-medium leading-[1.1] sm:text-[46px]" style={{ animationDelay: "80ms" }}>
              Test the strategy before you automate the mistake.
            </h1>
            <p className="fade-up mt-6 max-w-2xl text-[16px] leading-7 text-dim" style={{ animationDelay: "150ms" }}>
              QuantPilot is an AI agent workspace that turns a trader&apos;s raw strategy
              into explicit rules, a backtest plan, prop-firm Monte Carlo odds,
              versioned improvements, and an automation blueprint with webhook JSON and
              Pine Script draft. The agents do the research work before any build goes live.
            </p>
            <div className="fade-up mt-9 flex flex-wrap items-center gap-5" style={{ animationDelay: "220ms" }}>
              <Link
                href="/checkout?plan=pro"
                className="rounded-md bg-ink px-6 py-2.5 text-sm font-medium text-black transition hover:opacity-85"
              >
                Start Pro
              </Link>
              <Link href="#features" className="text-xs text-faint transition hover:text-ink">
                See product features
              </Link>
            </div>
            <p className="fade-up mt-4 max-w-lg text-xs leading-relaxed text-faint" style={{ animationDelay: "290ms" }}>
              QuantPilot does not place trades, connect to brokers, or promise profits.
              It prepares the research and automation package so traders can make a more
              disciplined decision.
            </p>
          </div>
          <div className="mt-14">
            <LandingCharts />
          </div>
        </div>

        {/* audit preview strip */}
        <div className="live-border mt-16 grid gap-px overflow-hidden rounded-xl border border-edge bg-edge lg:grid-cols-[1fr_1fr_1fr]">
          <div className="rise bg-panel p-6">
            <p className="text-xs text-faint">Validation audit</p>
            <p className="mt-3 text-sm text-dim">
              &ldquo;Buy the dip when momentum looks good&rdquo;
            </p>
            <div className="mt-4 space-y-2.5">
              {AUDIT_ROWS.map(([label, status, tone], i) => (
                <div
                  key={label}
                  className="rise flex items-center justify-between text-[13px]"
                  style={{ animationDelay: `${i * 55}ms` }}
                >
                  <span className="text-dim">{label}</span>
                  <span className={tone === "pos" ? "text-pos" : "text-danger"}>{status}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rise flex flex-col justify-between bg-panel p-6" style={{ animationDelay: "120ms" }}>
            <p className="text-xs text-faint">Monte Carlo, 100K challenge</p>
            <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-5">
              <Stat label="P(PASS)" value="41.2%" tone="text-pos" delay="180ms" />
              <Stat label="P(RUIN)" value="18.7%" tone="text-danger" delay="240ms" />
              <Stat label="MEDIAN DAYS" value="23" tone="text-ink" delay="300ms" />
              <Stat label="MAX DRAWDOWN" value="$6.4K" tone="text-warn" delay="360ms" />
            </div>
            <p className="mt-5 border-t border-edge pt-4 text-xs leading-relaxed text-faint">
              Simulated from win rate, R-distribution and risk per trade. Built to show
              fragility before a trader pays for a challenge.
            </p>
          </div>
          <div className="rise flex flex-col justify-between bg-panel p-6" style={{ animationDelay: "240ms" }}>
            <p className="text-xs text-faint">Automation blueprint</p>
            <div className="mt-4 space-y-3 text-sm text-dim">
              <div className="flex justify-between"><span>Readiness score</span><span className="text-warn">78/100</span></div>
              <div className="flex justify-between"><span>TradingView alerts</span><span className="text-accent">ready</span></div>
              <div className="flex justify-between"><span>Webhook payload</span><span className="text-ink">JSON</span></div>
              <div className="flex justify-between"><span>Pine Script draft</span><span className="text-pos">v5</span></div>
            </div>
            <p className="mt-5 border-t border-edge pt-4 text-xs leading-relaxed text-faint">
              Blueprint means exportable logic and setup instructions, not live trading
              or hidden execution.
            </p>
          </div>
        </div>
      </section>

      <LandingShowcases />

      {/* agent workflow */}
      <section id="agents" className="border-t border-edge">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-xs text-faint">Agent workflow</p>
              <h2 className="mt-4 max-w-md text-3xl font-semibold leading-tight">
                Six agents do the heavy research work behind every strategy.
              </h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-dim">
              The product is not another blank AI chat. Each agent has a specific job
                and a concrete output, from the first messy idea to the final automation
                blueprint.
              </p>
            </div>
            <div className="grid gap-px overflow-hidden rounded-xl border border-edge bg-edge md:grid-cols-2">
              {AGENTS.map((agent, i) => (
                <div key={agent.name} className="rise bg-panel p-5" style={{ animationDelay: `${i * 65}ms` }}>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="flex items-center gap-2 text-sm font-medium text-ink">
                      <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-accent" />
                      {agent.name}
                    </h3>
                    <span className="rounded-full border border-edge-bright px-2 py-0.5 text-[11px] text-faint">
                      {agent.output}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-dim">{agent.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* workspace vision */}
      <section id="workflow" className="border-t border-edge">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p className="text-xs text-faint">From idea to blueprint</p>
          <div className="mt-6 divide-y divide-edge border-y border-edge">
            {WORKFLOW.map(([step, title, desc]) => (
              <div key={step} className="grid gap-2 py-6 sm:grid-cols-[100px_260px_1fr]">
                <span className="text-sm text-accent">{step}</span>
                <h3 className="font-medium text-ink">{title}</h3>
                <p className="max-w-xl text-sm leading-relaxed text-dim">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* modules */}
      <section id="modules" className="border-t border-edge">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p className="text-xs text-faint">Modules</p>
          <div className="mt-6 divide-y divide-edge border-y border-edge">
            {MODULES.map((m) => (
              <div key={m.name} className="grid gap-2 py-7 sm:grid-cols-[220px_1fr_auto] sm:gap-8">
                <h3 className="font-medium text-ink">{m.name}</h3>
                <p className="max-w-xl text-[15px] leading-relaxed text-dim">{m.desc}</p>
                <span className="text-xs text-faint sm:text-right">{m.meta}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* pricing */}
      <section id="pricing" className="border-t border-edge">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p className="text-xs text-faint">Pricing</p>
          <div className="mt-6 grid gap-px overflow-hidden rounded-xl border border-edge bg-edge md:grid-cols-2">
            <div className="bg-panel p-7">
              <h3 className="font-medium">Research</h3>
              <p className="mt-4 text-3xl font-semibold">
                $79<span className="text-base font-normal text-dim">/mo</span>
              </p>
              <ul className="mt-5 space-y-2.5 text-sm text-dim">
                <li>20 strategy validations / month</li>
                <li>Backtest lab + risk warnings</li>
                <li>Prop-firm Monte Carlo presets</li>
                <li>Strategy readiness score</li>
                <li>Shareable report export</li>
              </ul>
              <Link
                href="/checkout?plan=research"
                className="mt-7 block rounded-md border border-edge-bright py-2.5 text-center font-medium text-dim transition hover:border-accent/50 hover:text-ink"
              >
                Start Research
              </Link>
            </div>
            <div className="bg-panel p-7">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Pro</h3>
                <span className="rounded-full border border-edge-bright px-2.5 py-0.5 text-xs text-dim">
                  Best for builders
                </span>
              </div>
              <p className="mt-4 text-3xl font-semibold">
                $199<span className="text-base font-normal text-dim">/mo</span>
              </p>
              <ul className="mt-5 space-y-2.5 text-sm text-dim">
                <li>Unlimited validations & strategy versions</li>
                <li>Backtest lab + robustness warnings</li>
                <li>Unlimited prop-firm simulations</li>
                <li>Strategy versioning + shareable report</li>
                <li>Webhook + Pine Script blueprint exports</li>
                <li>Priority access to new firm presets</li>
              </ul>
              <Link
                href="/checkout?plan=pro"
                className="mt-7 block rounded-md bg-ink py-2.5 text-center font-medium text-black transition hover:opacity-85"
              >
                Start Pro
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-edge">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-8 text-xs text-faint sm:flex-row sm:items-center sm:justify-between">
          <Logo size={18} />
          <p className="max-w-xl leading-relaxed">
            Educational software only. Nothing here is financial, investment, or trading
            advice. Trading involves substantial risk of loss. QuantPilot never executes
            trades or connects to your broker.
          </p>
        </div>
      </footer>
    </main>
  );
}

function Stat({ label, value, tone, delay }: { label: string; value: string; tone: string; delay: string }) {
  return (
    <div className="rise" style={{ animationDelay: delay }}>
      <p className="text-[11px] text-faint">{label}</p>
      <p className={`mt-1 text-2xl ${tone}`}>{value}</p>
    </div>
  );
}
