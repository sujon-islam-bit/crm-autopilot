"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function Wordmark3d() {
  return (
    <span className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-d3-pink">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M4 5.5 12 19 20 5.5"
            stroke="#fff"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M9.2 11.4 11.4 14 15 8.6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="font-fraunces text-[21px] font-semibold tracking-tight text-d3-ivory">
        Vouchso
      </span>
    </span>
  );
}

const LINKS = [
  { href: "/product", label: "Product" },
  { href: "/pricing", label: "Pricing" },
  { href: "/security", label: "Security" },
  { href: "/about", label: "About" },
];

export function MarketingNav3d() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`nav3d sticky top-0 z-50 transition-shadow ${
        scrolled ? "border-b border-d3-line" : "border-b border-transparent"
      }`}
    >
      <div className="wrap flex h-[72px] items-center gap-8">
        <Link href="/" aria-label="Vouchso home">
          <Wordmark3d />
        </Link>
        <nav className="ml-2 hidden items-center gap-8 md:flex" aria-label="Primary">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="mkt-navlink text-[14.5px] font-medium text-d3-ivory2 hover:text-d3-ivory"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <span className="ml-auto hidden items-center gap-6 md:flex">
          <Link href="/sign-in" className="text-[14.5px] font-medium text-d3-ivory2 hover:text-d3-ivory">
            Sign in
          </Link>
          <Link href="/sign-in" className="btn3d btn3d-primary btn3d-sm">
            Start free
          </Link>
        </span>
        <button
          type="button"
          className="ml-auto flex h-11 w-11 items-center justify-center rounded-xl border border-d3-line bg-d3-panel md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            {open ? (
              <path d="M5 5l14 14M19 5L5 19" stroke="#F4EFE8" strokeWidth="2" strokeLinecap="round" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" stroke="#F4EFE8" strokeWidth="2" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>
      {open && (
        <nav className="border-t border-d3-line bg-d3-bg px-6 py-4 md:hidden" aria-label="Mobile">
          <ul className="flex flex-col">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="flex min-h-[48px] items-center text-[16px] font-medium text-d3-ivory"
                >
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/sign-in"
                onClick={() => setOpen(false)}
                className="flex min-h-[48px] items-center text-[16px] font-medium text-d3-ivory"
              >
                Sign in
              </Link>
            </li>
            <li className="pt-3 pb-2">
              <Link href="/sign-in" onClick={() => setOpen(false)} className="btn3d btn3d-primary w-full">
                Start free
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}

export function MarketingFooter3d() {
  const cols: { head: string; items: { href: string; label: string }[] }[] = [
    {
      head: "Product",
      items: [
        { href: "/product#approvals", label: "Approvals" },
        { href: "/product#pipeline", label: "Pipeline Compare" },
        { href: "/product#cleanup", label: "Data Cleanup" },
        { href: "/product#history", label: "History & Rollback" },
        { href: "/product#assistant", label: "AI Assistant" },
        { href: "/pricing", label: "Pricing" },
      ],
    },
    {
      head: "Company",
      items: [
        { href: "/about", label: "About" },
        { href: "/security", label: "Security" },
      ],
    },
    {
      head: "Resources",
      items: [
        { href: "/help", label: "Help & support" },
        { href: "/sign-in", label: "Sign in" },
        { href: "/sign-in", label: "Start free" },
      ],
    },
  ];
  return (
    <footer className="relative border-t border-d3-line bg-d3-bg">
      <div className="wrap grid gap-10 pt-16 pb-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Wordmark3d />
          <p className="mt-4 max-w-[300px] text-[14px] leading-relaxed text-d3-ivory2">
            The AI layer on HubSpot and Salesforce. It drafts every CRM update — a person approves
            each one before it applies.
          </p>
          <p className="mt-5 font-jbmono text-[11.5px] tracking-wide text-d3-mute">
            DEFAULT PERMISSIONS: READS ON · WRITES OFF
          </p>
        </div>
        {cols.map((c) => (
          <nav key={c.head} aria-label={c.head}>
            <h3 className="text-[12px] font-bold tracking-[0.12em] text-d3-mute uppercase">{c.head}</h3>
            <ul className="mt-4 flex flex-col gap-2.5">
              {c.items.map((i) => (
                <li key={i.label}>
                  <Link href={i.href} className="text-[14.5px] font-medium text-d3-ivory2 hover:text-d3-ivory">
                    {i.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="wrap overflow-hidden" aria-hidden="true">
        <p className="font-fraunces leading-none font-semibold tracking-tight whitespace-nowrap text-d3-ivory/[0.07] select-none"
          style={{ fontSize: "clamp(90px, 17.5vw, 250px)" }}
        >
          Vouchso.
        </p>
      </div>
      <div className="border-t border-d3-line">
        <div className="wrap flex flex-col gap-2 py-5 text-[12.5px] text-d3-mute md:flex-row md:items-center md:justify-between">
          <span>© 2026 Vouchso. Built for HubSpot and Salesforce teams of 10–100.</span>
          <span>0 changes applied without a human approval. Ever.</span>
        </div>
      </div>
    </footer>
  );
}

export function CtaBand3d() {
  return (
    <section className="relative">
      <div className="wrap py-24 text-center md:py-32">
        <p className="font-jbmono text-[12px] font-semibold tracking-[0.16em] text-d3-pink-bright">
          BEGIN
        </p>
        <h2 className="mx-auto mt-5 max-w-[760px] font-fraunces text-[38px] leading-[1.08] font-medium tracking-tight text-d3-ivory md:text-[56px]">
          Let the CRM keep itself — with your{" "}
          <em className="text-d3-pink-bright italic">say-so</em>.
        </h2>
        <p className="mx-auto mt-5 max-w-[520px] text-[16.5px] leading-relaxed text-d3-ivory2">
          Connect HubSpot or Salesforce, and the first proposals are waiting in your queue today.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link href="/sign-in" className="btn3d btn3d-primary btn3d-lg">
            Start free
          </Link>
          <Link href="/pricing" className="btn3d btn3d-ghost btn3d-lg">
            See pricing
          </Link>
        </div>
      </div>
    </section>
  );
}
