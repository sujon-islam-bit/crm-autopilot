import type { Metadata } from "next";
import Link from "next/link";
import { Fragment } from "react";
import PricingClient from "./PricingClient";
import Faq from "../../../components/marketing3/Faq";
import { CtaBand } from "../../../components/marketing3/chrome";

export const metadata: Metadata = {
  title: "Pricing — Vouchso",
  description:
    "One flat price per workspace: Starter $39 (up to 5 users), Team $99 (up to 15), Scale $199 (up to 50), Enterprise custom. No per-seat charges — ever.",
  openGraph: {
    title: "Pricing — Vouchso",
    description: "Flat per workspace, seat caps instead of per-seat math. Starter $39 · Team $99 · Scale $199 · Enterprise custom.",
    type: "website",
  },
  other: { "page-type": "pricing", "site-kind": "software" },
};

/*
  Comparison table — HubSpot pricing anatomy: group header rows in large
  serif type, descriptive text cells (never bare checkmarks alone), hairline
  dividers, and a sticky tier header with pill CTAs. Values follow the
  locked plan §4 tier definitions; "—" only where a tier genuinely lacks it.
*/

type Row = { label: string; cells: [string, string, string, string] };
type Group = { name: string; rows: Row[] };

const GROUPS: Group[] = [
  {
    name: "Approvals",
    rows: [
      { label: "Review Queue — approve, edit, reject", cells: ["Included", "Included", "Included", "Included"] },
      { label: "Proposal categories", cells: ["Deal updates, contacts, enrichment", "All five, incl. follow-ups & field fixes", "All five", "All five"] },
      { label: "Confidence score + source evidence", cells: ["On every proposal", "On every proposal", "On every proposal", "On every proposal"] },
      { label: "Bulk approve / reject", cells: ["Included", "Included", "Included", "Included"] },
    ],
  },
  {
    name: "Data",
    rows: [
      { label: "Health score", cells: ["Included, trending", "Included, trending", "Included, trending", "Included, trending"] },
      { label: "Duplicates & missing fields", cells: ["Detected, fixes proposed", "Detected, fixes proposed", "Detected, fixes proposed", "Detected, fixes proposed"] },
      { label: "Guardrails", cells: ["—", "Stage rules, required next steps", "Advanced guardrails", "Advanced guardrails"] },
      { label: "Pipeline Compare", cells: ["—", "Weekly movement, per rep", "Weekly movement, per rep", "Weekly movement, per rep"] },
    ],
  },
  {
    name: "History",
    rows: [
      { label: "Audit trail", cells: ["Every batch, who approved it", "Every batch, who approved it", "Every batch, who approved it", "Every batch, who approved it"] },
      { label: "Rollback window", cells: ["7 days", "7 days", "7 days", "7 days"] },
    ],
  },
  {
    name: "Assistant",
    rows: [
      { label: "AI Assistant requests", cells: ["30 / day", "Higher daily limit", "Highest daily limit", "Custom"] },
      { label: "Briefs, digests & follow-up drafts", cells: ["Included", "Included", "Included", "Included"] },
    ],
  },
  {
    name: "Team",
    rows: [
      { label: "Users included", cells: ["Up to 5", "Up to 15", "Up to 50", "Custom"] },
      { label: "Roles", cells: ["Owner, Admin, Manager, Rep, Viewer", "All five roles", "All five roles", "All five roles"] },
      { label: "Per-page permissions", cells: ["Included", "Included", "Included", "Included"] },
    ],
  },
  {
    name: "Connections",
    rows: [
      { label: "CRMs", cells: ["HubSpot or Salesforce", "Both CRMs", "Both CRMs", "Both CRMs"] },
      { label: "Reads / writes control", cells: ["Per app, writes off by default", "Per app, writes off by default", "Per app, writes off by default", "Per app, writes off by default"] },
      { label: "Sources", cells: ["Gmail, Calendar, Outlook, Zoom", "Gmail, Calendar, Outlook, Zoom", "Gmail, Calendar, Outlook, Zoom", "Gmail, Calendar, Outlook, Zoom"] },
    ],
  },
];

const PRICING_FAQ = [
  { q: "What happens when we hit the seat cap?", a: "You can keep working — Vouchso tells the Owner you're at the cap and offers the next plan. Nobody gets locked out of approvals mid-week, and nobody is charged per extra seat." },
  { q: "Can we grow past 50 users?", a: "Yes — that's what Enterprise is for: custom seat counts and terms for large organizations. Talk to us and we'll set it up." },
  { q: "Can we change plans later?", a: "Any time. Upgrades apply straight away; downgrades take effect at the next billing cycle. The price is always the flat workspace price — there is no per-seat recalculation." },
  { q: "What happens to our data if we cancel?", a: "Your CRM data was never ours — it lives in HubSpot or Salesforce, and every change Vouchso made is in your History with its rollback window. Cancel and the connections simply stop; nothing in your CRM is held hostage." },
  { q: "Is there a free way to start?", a: "Yes — Start free: no card required to create your workspace and connect your first CRM. Paid plans begin when you choose one." },
];

const TIER_HEAD = [
  { name: "Starter", price: "$39/mo" },
  { name: "Team", price: "$99/mo" },
  { name: "Scale", price: "$199/mo" },
  { name: "Enterprise", price: "Custom" },
];

export default function PricingPage() {
  return (
    <>
      <section className="bg-white">
        <PricingClient />
      </section>

      {/* ============ COMPARISON TABLE ============ */}
      <section className="bg-white">
        <div className="wrap pb-20 md:pb-[100px]">
          <h2 className="font-jakarta text-[26px] font-bold text-hs-ink md:text-[30px]" data-reveal>
            Compare all features
          </h2>
          <div className="mt-8 overflow-x-auto" data-reveal>
            <table className="w-full min-w-[860px] border-collapse text-left">
              <thead>
                <tr className="sticky top-[104px] z-10 bg-white shadow-[0_1px_0_var(--color-hs-line)]">
                  <th className="w-[30%] py-4 pr-4 align-bottom">
                    <span className="font-jakarta text-[13px] font-bold tracking-wider text-hs-mute uppercase">Features</span>
                  </th>
                  {TIER_HEAD.map((t) => (
                    <th key={t.name} className="w-[17.5%] px-4 py-4 align-bottom">
                      <span className="block font-jakarta text-[16px] font-bold text-hs-ink">{t.name}</span>
                      <span className="mt-0.5 block text-[13px] font-medium text-hs-mute">{t.price}</span>
                      <Link href="/sign-in" className="btn btn-sm mt-3 !rounded-full btn-outline">
                        {t.name === "Enterprise" ? "Talk to us" : "Start free"}
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {GROUPS.map((g) => (
                  <Fragment key={g.name}>
                    <tr>
                      <td colSpan={5} className="pt-10 pb-3">
                        <span className="font-hsserif text-[26px] font-light text-hs-ink">{g.name}</span>
                      </td>
                    </tr>
                    {g.rows.map((r) => (
                      <tr key={r.label} className="border-t border-hs-line">
                        <td className="py-4 pr-4 font-jakarta text-[14.5px] font-semibold text-hs-ink">{r.label}</td>
                        {r.cells.map((c, i) => (
                          <td key={i} className={`px-4 py-4 text-[13.5px] leading-relaxed ${c === "—" ? "text-hs-mute" : "text-hs-body"}`}>
                            {c}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-6 text-[13px] text-hs-mute">
            Every plan: reads on, writes off by default — and 0 changes applied without a human approval.
          </p>
        </div>
      </section>

      {/* ============ INTEGRATIONS CARD (pricing variant) ============ */}
      <section className="bg-white">
        <div className="wrap pb-20 md:pb-[100px]">
          <div className="hs-card-shadow flex flex-wrap items-center justify-between gap-6 rounded-3xl border border-hs-line bg-white p-8 md:p-10" data-reveal>
            <div>
              <h2 className="font-jakarta text-[24px] font-bold text-hs-ink">Works with your CRM from day one</h2>
              <p className="mt-2 max-w-[520px] text-[15px] leading-relaxed text-hs-body">
                HubSpot and Salesforce, plus Gmail, Google Calendar, Outlook, Slack, Zoom and SignuDoc —
                included on every plan.
              </p>
            </div>
            <Link href="/product#connections" className="btn btn-outline">See connections</Link>
          </div>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section className="bg-hs-paper">
        <div className="wrap py-20 md:py-[100px]">
          <h2 className="text-center font-jakarta text-[26px] font-bold text-hs-ink md:text-[30px]" data-reveal>
            Pricing questions
          </h2>
          <div className="mx-auto mt-10 max-w-[920px]" data-reveal>
            <Faq items={PRICING_FAQ} />
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
