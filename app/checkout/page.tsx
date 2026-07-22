"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";

const PLANS = {
  research: {
    name: "Research",
    price: "$79/mo",
    desc: "For validating strategies, running backtests, and exporting reports.",
    features: [
      "20 strategy validations / month",
      "Backtest lab + risk warnings",
      "Prop-firm Monte Carlo presets",
      "Readiness score + shareable report",
    ],
  },
  pro: {
    name: "Pro",
    price: "$199/mo",
    desc: "For builders who need versions, unlimited simulations, and automation exports.",
    features: [
      "Unlimited validations + versions",
      "Unlimited prop-firm simulations",
      "Webhook + Pine Script blueprint exports",
      "Priority access to new firm presets",
    ],
  },
} as const;

type PlanKey = keyof typeof PLANS;

export default function CheckoutPage() {
  const [selected, setSelected] = useState<PlanKey>("pro");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const plan = PLANS[selected];

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("plan");
    if (requested === "research" || requested === "pro") setSelected(requested);
  }, []);

  const isReady = useMemo(() => /\S+@\S+\.\S+/.test(email), [email]);

  const activate = async () => {
    if (!isReady) return;
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, plan: selected }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Checkout failed.");
      localStorage.setItem("quantpilot_plan", selected);
      localStorage.setItem("quantpilot_email", email);
      localStorage.setItem("quantpilot_started_at", new Date().toISOString());
      localStorage.setItem("traderlab_plan", selected);
      localStorage.setItem("traderlab_email", email);
      window.location.href = payload.nextUrl || "/app?module=strategy&activated=1";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed.");
      setSubmitting(false);
    }
  };

  return (
    <main className="flex-1">
      <header className="border-b border-edge bg-bg/85">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link href="/"><Logo /></Link>
          <Link href="/" className="text-sm text-dim transition hover:text-ink">Back</Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-5xl gap-8 px-6 py-16 lg:grid-cols-[1fr_380px]">
        <div>
          <p className="text-sm text-faint">Checkout</p>
          <h1 className="mt-4 max-w-2xl text-[34px] font-medium leading-tight sm:text-[42px]">
            Start QuantPilot {plan.name}.
          </h1>
          <p className="mt-4 max-w-xl text-dim">
            This MVP checkout activates the selected plan locally. Add Whop product
            IDs when your payment links are ready.
          </p>

          <div className="mt-8 grid gap-px overflow-hidden rounded-xl border border-edge bg-edge sm:grid-cols-2">
            {(Object.keys(PLANS) as PlanKey[]).map((key) => (
              <button
                key={key}
                onClick={() => setSelected(key)}
                className={`bg-panel p-5 text-left transition hover:bg-raised ${
                  selected === key ? "outline outline-1 outline-accent" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <h2 className="font-medium text-ink">{PLANS[key].name}</h2>
                  <span className="text-sm text-dim">{PLANS[key].price}</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-dim">{PLANS[key].desc}</p>
              </button>
            ))}
          </div>
        </div>

        <aside className="self-start overflow-hidden rounded-xl border border-edge bg-panel">
          <div className="border-b border-edge p-5">
            <p className="text-xs text-faint">Selected plan</p>
            <div className="mt-3 flex items-end justify-between">
              <h2 className="text-2xl font-semibold">{plan.name}</h2>
              <p className="text-xl text-ink">{plan.price}</p>
            </div>
          </div>
          <div className="p-5">
            <label className="block">
              <span className="text-xs text-faint">Email</span>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="mt-2 w-full rounded-md border border-edge-bright bg-raised px-3 py-2.5 text-sm text-ink outline-none focus:border-accent/60"
              />
            </label>
            <ul className="mt-5 space-y-2.5 text-sm text-dim">
              {plan.features.map((feature) => (
                <li key={feature} className="flex gap-2">
                  <span className="text-pos">✓</span>
                  {feature}
                </li>
              ))}
            </ul>
            <button
              onClick={activate}
              disabled={!isReady || submitting}
              className="mt-6 w-full rounded-md bg-ink py-3 font-medium text-black transition hover:opacity-85 disabled:cursor-not-allowed disabled:bg-raised disabled:text-faint"
            >
              {submitting ? "Activating..." : `Activate ${plan.name}`}
            </button>
            {error && <p className="mt-3 text-xs text-danger">{error}</p>}
            <p className="mt-3 text-xs leading-relaxed text-faint">
              MVP mode: this records a test checkout on the backend. Whop plugs into
              the same route when product IDs are configured.
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}
