"use client";

import Link from "next/link";
import { useState } from "react";
import { Check } from "../../../components/marketing3/chrome";

/*
  Pricing hero block — HubSpot pricing anatomy: centred serif title, sub,
  segmented Monthly/Annually control ("BEST VALUE" chip), then the four tiers
  as ONE connected card with hairline column dividers. Team is highlighted
  (accent top border + MOST POPULAR chip + solid CTA) per the brief's
  middle-highlight rule.
  Yearly prices = 2 months free, billed annually: 39→32.50, 99→82.50,
  199→165.83 effective per month (the locked plan's yearly mechanic).
*/

type Tier = {
  name: string;
  blurb: string;
  monthly: number | null;
  yearly: number | null;
  seats: string;
  cta: string;
  popular?: boolean;
  features: string[];
};

const TIERS: Tier[] = [
  {
    name: "Starter",
    blurb: "For a founder-led sales team getting its CRM under control.",
    monthly: 39, yearly: 32.5,
    seats: "Up to 5 users · 1 CRM",
    cta: "Start free",
    features: [
      "Review Queue — approve, edit or reject every change",
      "Data Cleanup — health score + duplicate detection",
      "AI Assistant — 30 requests a day",
      "History — 7-day rollback",
      "HubSpot or Salesforce",
    ],
  },
  {
    name: "Team",
    blurb: "For a growing team that lives in its pipeline.",
    monthly: 99, yearly: 82.5,
    seats: "Up to 15 users · both CRMs",
    cta: "Start free",
    popular: true,
    features: [
      "Everything in Starter, plus:",
      "Pipeline Compare — weekly movement, per rep",
      "Field fixes and follow-up proposals",
      "Guardrails — stage rules, required next steps",
      "AI Assistant — higher daily limit",
    ],
  },
  {
    name: "Scale",
    blurb: "For RevOps-led teams with a pipeline to protect.",
    monthly: 199, yearly: 165.83,
    seats: "Up to 50 users · both CRMs",
    cta: "Start free",
    features: [
      "Everything in Team, plus:",
      "Both CRMs from one queue",
      "Priority processing for proposals",
      "Advanced guardrails and seat roles",
      "AI Assistant — highest daily limit",
    ],
  },
  {
    name: "Enterprise",
    blurb: "For large organizations with custom requirements.",
    monthly: null, yearly: null,
    seats: "Custom seats · custom terms",
    cta: "Talk to us",
    features: [
      "Everything in Scale, plus:",
      "Custom seat counts and terms",
      "Dedicated onboarding",
      "Security review support",
    ],
  },
];

export default function PricingClient() {
  const [yearly, setYearly] = useState(false);

  return (
    <div className="wrap pt-14 pb-20 md:pt-[72px]">
      <div className="mx-auto max-w-[900px] text-center" data-reveal>
        <h1 className="font-hsserif text-[40px] leading-[1.15] font-light tracking-[-0.01em] text-hs-ink md:text-[56px]">
          One flat price per team. No per-seat math, no surprises.
        </h1>
        <p className="mx-auto mt-5 max-w-[620px] text-[17px] leading-relaxed text-hs-body">
          Every plan includes the Review Queue, the health score and 7-day rollback. You pay for the
          team, not for every login.
        </p>
      </div>

      {/* Segmented billing control */}
      <div className="mt-10 flex justify-center" data-reveal>
        <div className="relative inline-flex rounded-full border border-hs-line bg-hs-mist p-1" role="group" aria-label="Billing period">
          {(["Monthly", "Annually"] as const).map((label) => {
            const isYear = label === "Annually";
            const active = yearly === isYear;
            return (
              <button
                key={label}
                type="button"
                aria-pressed={active}
                onClick={() => setYearly(isYear)}
                className={`relative rounded-full px-6 py-2.5 font-jakarta text-[15px] font-bold transition ${
                  active ? "bg-white text-hs-ink shadow-[0_2px_10px_rgba(31,31,31,0.12)]" : "text-hs-mute hover:text-hs-ink"
                }`}
              >
                {label}
                {isYear && (
                  <span className="absolute -top-3 -right-4 rounded-full bg-hs-brand px-2 py-0.5 font-jakarta text-[9.5px] font-extrabold tracking-wide text-white uppercase">
                    Best value
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      <p className="mt-4 text-center text-[13.5px] text-hs-mute" data-reveal>
        {yearly ? "Billed annually — two months free, shown as the effective monthly price." : "Billed monthly. Switch to annual billing and get two months free."}
      </p>

      {/* Tier card — one connected card, hairline column dividers */}
      <div
        className="hs-card-shadow mt-10 grid overflow-hidden rounded-3xl border border-hs-line bg-white md:grid-cols-2 xl:grid-cols-4"
        data-reveal
      >
        {TIERS.map((t, i) => {
          const price = t.monthly === null ? null : yearly ? t.yearly! : t.monthly;
          return (
            <div
              key={t.name}
              className={`relative flex flex-col p-7 md:p-8 ${i > 0 ? "border-t border-hs-line md:border-t-0 md:border-l" : ""} ${
                i === 2 ? "md:border-t md:border-l xl:border-t-0" : ""
              } ${t.popular ? "border-t-4 border-t-hs-brand bg-hs-tint/50" : ""}`}
            >
              {t.popular && (
                <span className="absolute top-4 right-5 rounded-full bg-hs-brand px-2.5 py-1 font-jakarta text-[10px] font-extrabold tracking-wider text-white uppercase">
                  Most popular
                </span>
              )}
              <h2 className="font-jakarta text-[22px] font-bold text-hs-ink">{t.name}</h2>
              <p className="mt-2 min-h-[66px] text-[14.5px] leading-relaxed text-hs-body">{t.blurb}</p>
              <p className="mt-2 font-jakarta text-[12px] font-bold tracking-wider text-hs-mute uppercase">Starts at</p>
              {price !== null ? (
                <>
                  <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
                    <span className="font-jakarta text-[40px] leading-none font-extrabold tracking-tight text-hs-ink">
                      ${price.toFixed(2).replace(/\.00$/, "")}
                    </span>
                    <span className="text-[14px] font-medium text-hs-mute">USD/mo</span>
                  </p>
                  <p className="mt-2 text-[13.5px] font-medium text-hs-body">{t.seats}</p>
                </>
              ) : (
                <>
                  <p className="mt-1.5 font-jakarta text-[40px] leading-none font-extrabold tracking-tight text-hs-ink">Custom</p>
                  <p className="mt-2 text-[13.5px] font-medium text-hs-body">{t.seats}</p>
                </>
              )}
              <Link
                href="/sign-in"
                className={`btn mt-6 w-full ${t.popular ? "btn-primary" : "btn-outline"}`}
              >
                {t.cta}
              </Link>
              <p className="mt-6 font-jakarta text-[13px] font-bold tracking-wider text-hs-ink uppercase">
                {t.name} includes:
              </p>
              <ul className="mt-3.5 space-y-2.5">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[14px] leading-relaxed text-hs-body">
                    <Check /> {f}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-[13px] text-hs-mute" data-reveal>
        * Prices in USD, flat per workspace. No per-seat charges — ever. Seat caps are the only limit.
        Annual billing = 12 months for the price of 10.
      </p>
    </div>
  );
}
