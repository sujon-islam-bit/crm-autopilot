import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/session";

/**
 * Landing page — Day.ai-style direction approved by Sujon 2026-11-26:
 * one huge bold headline, lots of white space, soft floating cards,
 * a black pill main button, almost no text. The floating cards show
 * the product's real loop: email arrives → AI proposes → human approves.
 */
export default function LandingPage() {
  return (
    <Suspense fallback={null}>
      <LandingInner />
    </Suspense>
  );
}

async function LandingInner() {
  await connection();
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-10">
        <nav className="flex items-center gap-6 py-5 sm:gap-11 sm:py-7">
          <p className="text-[21px] font-extrabold tracking-tight sm:text-[27px]">
            CRM <span className="font-normal">Autopilot</span>
          </p>
          <Link href="#how" className="hidden text-[16px] font-medium hover:text-brand sm:block">
            Product
          </Link>
          <Link href="#pricing" className="hidden text-[16px] font-medium hover:text-brand sm:block">
            Pricing
          </Link>
          <Link
            href="/sign-in"
            className="ml-auto rounded-xl bg-brand px-4 py-2.5 text-[14.5px] font-semibold text-white transition hover:bg-brand-dark sm:px-6 sm:py-3 sm:text-[16px]"
          >
            Talk to Sales →
          </Link>
        </nav>

        <section className="pb-6 pt-10 text-center sm:pt-20">
          <h1 className="text-[35px] font-extrabold leading-[1.1] tracking-[-1.1px] text-neutral-800 sm:text-[74px] sm:leading-[1.04] sm:tracking-[-2.2px]">
            Your CRM updates itself
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed text-neutral-500 sm:mt-7 sm:text-xl">
            CRM Autopilot reads your team&apos;s email and calendar, then updates HubSpot for you.
            You just approve.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2 sm:mt-9 sm:gap-3">
            <span className="rounded-full border-[1.5px] border-neutral-200 bg-white px-3.5 py-1.5 text-[12.5px] text-neutral-600 sm:px-[18px] sm:py-[9px] sm:text-[15px]">
              For <b className="font-bold text-neutral-800">B2B sales teams</b>
            </span>
            <span className="rounded-full border-[1.5px] border-neutral-200 bg-white px-3.5 py-1.5 text-[12.5px] text-neutral-600 sm:px-[18px] sm:py-[9px] sm:text-[15px]">
              Works on <b className="font-bold text-neutral-800">your HubSpot</b>
            </span>
            <span className="rounded-full border-[1.5px] border-neutral-200 bg-white px-3.5 py-1.5 text-[12.5px] text-neutral-600 sm:px-[18px] sm:py-[9px] sm:text-[15px]">
              <b className="font-bold text-neutral-800">No</b> data entry
            </span>
          </div>
          <div className="mt-7 flex flex-col items-center gap-2.5 sm:mt-10 sm:flex-row sm:justify-center sm:gap-4">
            <Link
              href="/sign-in"
              className="w-full max-w-[340px] rounded-xl bg-neutral-900 px-8 py-[15px] text-center text-base font-semibold text-white transition hover:bg-neutral-700 sm:w-auto sm:rounded-[14px] sm:text-[17.5px]"
            >
              Get access →
            </Link>
            <span className="text-[13.5px] text-neutral-400 sm:text-[15px]">
              Free while in early access
            </span>
          </div>
        </section>

        <section
          className="relative mx-auto mt-9 max-w-[1060px] rounded-[20px] px-3 py-4 sm:mt-[74px] sm:h-[520px] sm:rounded-[28px] sm:p-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 90% at 50% 40%, #eef4fa 0%, #f7fafc 55%, #ffffff 100%)",
          }}
        >
          <div className="flex flex-col gap-3 sm:block">
            <FloatingCard className="sm:absolute sm:left-14 sm:top-16 sm:w-[400px] sm:-rotate-2">
              <CardSource dot="#ea4335" letter="M" label="GMAIL · NEW EMAIL" />
              <p className="text-[14.5px] leading-relaxed text-neutral-700 sm:text-[15.5px]">
                <b className="font-bold text-neutral-900">Sarah Chen</b> replied: “Send the
                proposal — we&apos;d like to sign this month.”
              </p>
            </FloatingCard>

            <FloatingCard className="sm:absolute sm:right-16 sm:top-11 sm:w-[430px] sm:rotate-[1.6deg]">
              <CardSource dot="#3e7cb1" letter="✓" label="PROPOSED UPDATE · NEEDS YOUR APPROVAL" />
              <p className="text-[14.5px] leading-relaxed text-neutral-700 sm:text-[15.5px]">
                Move deal{" "}
                <span className="rounded-md bg-neutral-100 px-2 py-0.5 font-semibold text-neutral-900">
                  CloudFlow — $24,000
                </span>{" "}
                to <b className="font-bold text-neutral-900">Proposal stage</b> and set close date
                to <b className="font-bold text-neutral-900">Nov 30</b>.
              </p>
              <div className="mt-3 flex gap-2.5">
                <span className="rounded-lg bg-neutral-900 px-5 py-2.5 text-[13.5px] font-semibold text-white sm:text-sm">
                  Approve
                </span>
                <span className="rounded-lg border-[1.5px] border-neutral-200 bg-white px-5 py-2.5 text-[13.5px] font-semibold text-neutral-600 sm:text-sm">
                  Reject
                </span>
              </div>
            </FloatingCard>

            <FloatingCard className="sm:absolute sm:bottom-[120px] sm:left-[120px] sm:w-[380px] sm:rotate-[1.2deg]">
              <CardSource dot="#7a5af8" letter="▦" label="CALENDAR · MEETING ENDED" />
              <p className="text-[14.5px] leading-relaxed text-neutral-700 sm:text-[15.5px]">
                <b className="font-bold text-neutral-900">CloudFlow contract call</b> ended. Notes
                added and next step created automatically.
              </p>
            </FloatingCard>

            <FloatingCard className="sm:absolute sm:bottom-[52px] sm:right-[110px] sm:w-[420px] sm:-rotate-[1.4deg]">
              <CardSource dot="#f79009" letter="✎" label="FOLLOW-UP DRAFT · READY TO SEND" />
              <p className="text-[14.5px] leading-relaxed text-neutral-700 sm:text-[15.5px]">
                “Hi David, hope you had a relaxing time in Cancún. Sarah mentioned the contract…”
              </p>
              <div className="mt-3 flex gap-2.5">
                <span className="rounded-lg bg-neutral-900 px-5 py-2.5 text-[13.5px] font-semibold text-white sm:text-sm">
                  Approve &amp; send
                </span>
                <span className="rounded-lg border-[1.5px] border-neutral-200 bg-white px-5 py-2.5 text-[13.5px] font-semibold text-neutral-600 sm:text-sm">
                  Edit
                </span>
              </div>
            </FloatingCard>

            <div className="absolute left-1/2 top-[236px] hidden h-16 w-16 -translate-x-1/2 items-center justify-center rounded-full border border-neutral-100 bg-white text-[26px] font-extrabold text-brand shadow-[0_14px_34px_rgba(30,40,60,0.12)] sm:flex">
              A
            </div>
          </div>
        </section>

        <section id="how" className="mx-auto max-w-4xl py-16 text-center sm:py-24">
          <h2 className="text-3xl font-extrabold tracking-tight text-neutral-800 sm:text-4xl">
            How it works
          </h2>
          <div className="mt-10 grid gap-4 text-left sm:grid-cols-3">
            {[
              {
                n: "1",
                t: "Connect",
                d: "Link HubSpot, Gmail and Calendar in one click each. Nothing to install, nothing to migrate.",
              },
              {
                n: "2",
                t: "The AI reads and proposes",
                d: "Every email and meeting is read. The AI works out what should change in your CRM — and shows its reason.",
              },
              {
                n: "3",
                t: "You approve",
                d: "One tap applies the change. Nothing is ever sent or changed without a human saying yes. Undo is one click.",
              },
            ].map((s) => (
              <div
                key={s.n}
                className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-[0_10px_30px_rgba(30,40,60,0.05)]"
              >
                <p className="text-sm font-bold text-brand">STEP {s.n}</p>
                <p className="mt-2 text-lg font-bold text-neutral-900">{s.t}</p>
                <p className="mt-1.5 text-[15px] leading-relaxed text-neutral-500">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-4xl pb-20 text-center sm:pb-28">
          <h2 className="text-3xl font-extrabold tracking-tight text-neutral-800 sm:text-4xl">
            One flat price. No surprises.
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-[16px] text-neutral-500">
            No credits that burn. No onboarding fee. No forced upgrade to a bigger CRM plan.
          </p>
          <div className="mt-10 grid gap-4 text-left sm:grid-cols-2">
            <div className="rounded-2xl border border-neutral-200 bg-white p-7 shadow-[0_10px_30px_rgba(30,40,60,0.05)]">
              <p className="text-lg font-bold">Starter</p>
              <p className="mt-2 text-4xl font-extrabold tracking-tight">
                $19 <span className="text-base font-medium text-neutral-400">/ rep / month</span>
              </p>
              <ul className="mt-5 space-y-2 text-[15px] text-neutral-600">
                <li>✓ HubSpot auto-updates with approval</li>
                <li>✓ Gmail + Calendar capture</li>
                <li>✓ Morning brief + pipeline health flags</li>
                <li>✓ Full audit log + one-click undo</li>
              </ul>
            </div>
            <div className="rounded-2xl border-2 border-brand bg-white p-7 shadow-[0_16px_40px_rgba(62,124,177,0.12)]">
              <p className="text-lg font-bold">
                Growth <span className="ml-1 rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-bold text-brand">POPULAR</span>
              </p>
              <p className="mt-2 text-4xl font-extrabold tracking-tight">
                $29 <span className="text-base font-medium text-neutral-400">/ rep / month</span>
              </p>
              <ul className="mt-5 space-y-2 text-[15px] text-neutral-600">
                <li>✓ Everything in Starter</li>
                <li>✓ Salesforce + Outlook (coming next)</li>
                <li>✓ Call notes from Zoom + Meet</li>
                <li>✓ SignuDoc e-signatures built in</li>
              </ul>
            </div>
          </div>
          <p className="mt-10 text-[13.5px] text-neutral-400">
            CRM Autopilot — your CRM updates itself. You just approve.
          </p>
        </section>
      </div>
    </div>
  );
}

function FloatingCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-neutral-100 bg-white p-4 shadow-[0_24px_50px_rgba(30,40,60,0.10),0_3px_10px_rgba(30,40,60,0.05)] sm:p-5 ${className}`}
    >
      {children}
    </div>
  );
}

function CardSource({ dot, letter, label }: { dot: string; letter: string; label: string }) {
  return (
    <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold tracking-wide text-neutral-400 sm:text-[13px]">
      <span
        className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-md text-[12.5px] font-bold text-white"
        style={{ background: dot }}
      >
        {letter}
      </span>
      {label}
    </div>
  );
}
