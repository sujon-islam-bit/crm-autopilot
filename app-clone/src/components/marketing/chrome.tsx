"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function Wordmark({ dark = false }: { dark?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-mkt-violet">
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
      <span
        className={`font-jakarta text-[19px] font-extrabold tracking-tight ${dark ? "text-white" : "text-mkt-ink"}`}
      >
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

export function MarketingNav() {
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
      className={`mkt-glass sticky top-0 z-50 transition-shadow ${
        scrolled ? "border-b border-mkt-border" : "border-b border-transparent"
      }`}
    >
      <div className="wrap flex h-[68px] items-center gap-8">
        <Link href="/" aria-label="Vouchso home">
          <Wordmark />
        </Link>
        <nav className="ml-2 hidden items-center gap-8 md:flex" aria-label="Primary">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="mkt-navlink text-[14.5px] font-semibold text-mkt-body hover:text-mkt-ink"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <span className="ml-auto hidden items-center gap-5 md:flex">
          <Link href="/sign-in" className="text-[14.5px] font-semibold text-mkt-body hover:text-mkt-ink">
            Sign in
          </Link>
          <Link
            href="/sign-in"
            className="rounded-xl bg-mkt-violet px-5 py-2.5 text-[14.5px] font-semibold text-white transition hover:bg-mkt-violet-dark active:translate-y-px"
          >
            Start free
          </Link>
        </span>
        <button
          type="button"
          className="ml-auto flex h-11 w-11 items-center justify-center rounded-xl border border-mkt-border bg-white md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            {open ? (
              <path d="M5 5l14 14M19 5L5 19" stroke="#17131F" strokeWidth="2" strokeLinecap="round" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" stroke="#17131F" strokeWidth="2" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>
      {open && (
        <nav className="border-t border-mkt-border bg-white px-6 py-4 md:hidden" aria-label="Mobile">
          <ul className="flex flex-col">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="flex min-h-[44px] items-center text-[16px] font-semibold text-mkt-ink"
                >
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/sign-in"
                onClick={() => setOpen(false)}
                className="flex min-h-[44px] items-center text-[16px] font-semibold text-mkt-ink"
              >
                Sign in
              </Link>
            </li>
            <li className="pt-2 pb-2">
              <Link
                href="/sign-in"
                onClick={() => setOpen(false)}
                className="flex min-h-[48px] items-center justify-center rounded-xl bg-mkt-violet text-[16px] font-semibold text-white"
              >
                Start free
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}

export function MarketingFooter() {
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
    <footer className="border-t border-mkt-border bg-white">
      <div className="wrap grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Wordmark />
          <p className="mt-4 max-w-[300px] text-[14px] leading-relaxed text-mkt-body">
            The AI layer on HubSpot and Salesforce. It drafts every CRM update — a person approves
            each one before it applies.
          </p>
          <p className="mt-5 font-jbmono text-[11.5px] tracking-wide text-mkt-body">
            DEFAULT PERMISSIONS: READS ON · WRITES OFF
          </p>
        </div>
        {cols.map((c) => (
          <nav key={c.head} aria-label={c.head}>
            <h3 className="text-[12px] font-bold tracking-[0.12em] text-mkt-body uppercase">{c.head}</h3>
            <ul className="mt-4 flex flex-col gap-2.5">
              {c.items.map((i) => (
                <li key={i.label}>
                  <Link href={i.href} className="text-[14.5px] font-medium text-mkt-ink hover:text-mkt-violet">
                    {i.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-mkt-border">
        <div className="wrap flex flex-col gap-2 py-5 text-[12.5px] text-mkt-body md:flex-row md:items-center md:justify-between">
          <span>© 2026 Vouchso. Built for HubSpot and Salesforce teams of 10–100.</span>
          <span>0 changes applied without a human approval. Ever.</span>
        </div>
      </div>
    </footer>
  );
}

export function CtaBand() {
  return (
    <section className="bg-mkt-violet">
      <div className="wrap py-20 text-center md:py-24">
        <h2 className="mx-auto max-w-[720px] font-jakarta text-[34px] leading-[1.12] font-extrabold tracking-tight text-white md:text-[44px]">
          Let the CRM keep itself — with your <span className="text-[#ffb9d2]">say-so</span>.
        </h2>
        <p className="mx-auto mt-4 max-w-[520px] text-[16px] leading-relaxed text-white/85">
          Connect HubSpot or Salesforce, and the first proposals are waiting in your queue today.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/sign-in"
            className="inline-flex min-h-[48px] items-center rounded-xl bg-white px-7 text-[15.5px] font-bold text-mkt-violet transition hover:bg-mkt-ground active:translate-y-px"
          >
            Start free
          </Link>
          <Link
            href="/pricing"
            className="inline-flex min-h-[48px] items-center text-[15.5px] font-semibold text-white underline decoration-white/50 decoration-2 underline-offset-4 hover:decoration-white"
          >
            See pricing
          </Link>
        </div>
      </div>
    </section>
  );
}
