import type { Metadata } from "next";
import Link from "next/link";
import { CapsLabel, CtaBand } from "../../../components/marketing3/chrome";

export const metadata: Metadata = {
  title: "About — Vouchso",
  description:
    "Why Vouchso exists, who it is for, and where the name comes from: to vouch is to personally guarantee something is true — and nothing reaches your CRM without a person's say-so.",
  openGraph: {
    title: "About — Vouchso",
    description: "The AI proposes. A human vouches. Only then does the CRM change.",
    type: "website",
  },
  other: { "page-type": "software", "site-kind": "software" },
};

const SERIF_H2 = "font-hsserif text-[32px] leading-[1.15] font-light tracking-[-0.01em] text-hs-ink md:text-[38px]";

export default function AboutPage() {
  return (
    <>
      <section className="bg-white">
        <div className="wrap pt-14 pb-16 md:pt-20 md:pb-20">
          <div className="max-w-[820px]" data-reveal>
            <CapsLabel className="text-hs-brand">About Vouchso</CapsLabel>
            <h1 className="mt-5 font-hsserif text-[40px] leading-[1.14] font-light tracking-[-0.01em] text-hs-ink md:text-[56px]">
              The AI proposes. A human vouches. Only then does the CRM change<span className="text-hs-brand">.</span>
            </h1>
            <p className="mt-6 max-w-[660px] text-[17px] leading-relaxed text-hs-body">
              Vouchso is an AI layer for the CRM your team already has — HubSpot or Salesforce. It reads
              the email, calendar and calls where deals actually move, and drafts every update your CRM
              needs. Then it stops, and waits for a person.
            </p>
          </div>

          {/* The name */}
          <div className="hs-card-shadow mt-14 grid gap-10 rounded-3xl border border-hs-line bg-hs-paper p-8 md:grid-cols-2 md:p-12" data-reveal>
            <div>
              <h2 className={SERIF_H2}>Why “Vouchso”?</h2>
              <p className="mt-5 text-[16px] leading-relaxed text-hs-body">
                <strong className="font-semibold text-hs-ink">To vouch</strong> is to personally
                guarantee that something is true. <strong className="font-semibold text-hs-ink">Say-so</strong> is
                the word for the moment a person gives the go-ahead. Put them together and you get the
                product: an AI that drafts, and a person whose say-so makes it real.
              </p>
            </div>
            <div className="flex flex-col justify-center gap-3">
              {[
                { w: "vouch", d: "a person stands behind it" },
                { w: "say-so", d: "nothing happens without it" },
                { w: "Vouchso", d: "the CRM layer where both are true" },
              ].map((r) => (
                <div key={r.w} className="flex items-baseline gap-4 rounded-2xl border border-hs-line bg-white px-5 py-4">
                  <span className="w-[92px] shrink-0 font-hsserif text-[21px] font-light text-hs-ink">{r.w}</span>
                  <span className="text-[14.5px] text-hs-body">{r.d}</span>
                </div>
              ))}
            </div>
          </div>

          {/* What / Who / Why */}
          <div className="mt-16 grid gap-6 md:grid-cols-3" data-reveal>
            {[
              {
                t: "What it is",
                b: "A review queue for your CRM. Vouchso connects to HubSpot or Salesforce, reads Gmail, Calendar and calls, and turns what it finds into proposals — each with a confidence score and the source it came from.",
              },
              {
                t: "Who it is for",
                b: "B2B sales teams of 10–100 people whose CRM is always a week behind reality — and whose RevOps lead is tired of choosing between stale data and nagging reps to update it.",
              },
              {
                t: "Why approval-first",
                b: "Because the alternative is an AI quietly rewriting your pipeline. Teams don't distrust AI drafts; they distrust AI edits. So Vouchso never edits. It proposes — and the person stays the author of every change.",
              },
            ].map((c) => (
              <article key={c.t} className="hs-card-shadow rounded-2xl border border-hs-line bg-white p-7">
                <h2 className="font-jakarta text-[19px] font-bold text-hs-ink">{c.t}</h2>
                <div className="mt-4 border-t border-dashed border-hs-line pt-4">
                  <p className="text-[15px] leading-relaxed text-hs-body">{c.b}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-16 max-w-[760px]" data-reveal>
            <h2 className={SERIF_H2}>One rule, kept everywhere</h2>
            <p className="mt-5 text-[16.5px] leading-relaxed text-hs-body">
              Open any part of Vouchso — the queue, the cleanup, the assistant, the pricing — and the
              same rule is there: <strong className="font-semibold text-hs-ink">0 changes applied without a human approval.</strong> It
              is not a setting. It is the product.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/sign-in" className="btn btn-primary">Start free</Link>
              <Link href="/product" className="btn btn-outline">See the product</Link>
            </div>
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
