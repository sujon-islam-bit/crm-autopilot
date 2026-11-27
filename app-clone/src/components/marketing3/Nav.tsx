"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/*
  THE Vouchso logo — Sujon's pick, sample S3 (Linear style), decided
  2026-11-28: near-black rounded tile (#17131F) with the white orbit/arc
  mark. Geometry copied 1:1 from logo-samples-v2/s3.svg (tile-local
  160x160 viewBox). On dark backgrounds use the reversed variant (white
  tile, ink mark) — same geometry.
*/
export function LogoMark({ size = 34, dark = false }: { size?: number; dark?: boolean }) {
  const tile = dark ? "#FFFFFF" : "#17131F";
  const mark = dark ? "#17131F" : "#FFFFFF";
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 160 160"
      className="shrink-0"
      style={{ borderRadius: size * 0.225 }}
    >
      <rect width="160" height="160" rx="36" fill={tile} />
      <g fill="none" stroke={mark} strokeWidth="11" strokeLinecap="round">
        <path d="M103,40.2 A46,46 0 1 1 36.8,64.3" />
        <path d="M57,99.3 A30,30 0 0 0 108.2,69.7" />
      </g>
      <circle cx="80" cy="80" r="6" fill={mark} />
    </svg>
  );
}

export function Wordmark({ dark = false }: { dark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark dark={dark} />
      <span className={`font-jakarta text-[22px] font-extrabold tracking-tight ${dark ? "text-white" : "text-hs-ink"}`}>
        Vouchso
      </span>
    </span>
  );
}

const NAV_LINKS = [
  { label: "Product", href: "/product" },
  { label: "Pricing", href: "/pricing" },
  { label: "Security", href: "/security" },
  { label: "About", href: "/about" },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="sticky top-0 z-50">
      {/* Utility bar (HubSpot anatomy) */}
      <div className="hidden border-b border-hs-line bg-white md:block">
        <div className="wrap flex h-[38px] items-center justify-between text-[13px] font-medium text-hs-body">
          <div className="flex items-center gap-6">
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true">◎</span> English
            </span>
            <Link href="/security" className="hover:text-hs-brand">Security &amp; trust</Link>
            <Link href="/about" className="hover:text-hs-brand">About Vouchso</Link>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/pricing" className="hover:text-hs-brand">See pricing</Link>
            <Link href="/sign-in" className="font-semibold text-hs-ink hover:text-hs-brand">Log in</Link>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <div className={`border-b bg-white transition-shadow duration-300 ${scrolled ? "border-hs-line shadow-[0_6px_24px_-12px_rgba(31,31,31,0.25)]" : "border-transparent"}`}>
        <div className="wrap flex h-[72px] items-center justify-between gap-6">
          <Link href="/" aria-label="Vouchso home" className="shrink-0">
            <Wordmark />
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-9 lg:flex">
            {NAV_LINKS.map((l) => (
              <Link key={l.label} href={l.href} className="font-jakarta text-[16px] font-semibold text-hs-ink hover:text-hs-brand">
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <Link href="/sign-in" className="btn btn-sm btn-primary">Get a demo</Link>
            <Link href="/sign-in" className="btn btn-sm btn-outline">Start free</Link>
          </div>

          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-hs-ink lg:hidden"
            aria-expanded={open}
            aria-label="Toggle menu"
            onClick={() => setOpen(!open)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              {open ? (
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <nav aria-label="Mobile" className="border-t border-hs-line bg-white px-6 pt-2 pb-6 lg:hidden">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block border-b border-hs-line py-3.5 font-jakarta text-[17px] font-semibold text-hs-ink"
              >
                {l.label}
              </Link>
            ))}
            <div className="mt-5 flex flex-col gap-3">
              <Link href="/sign-in" className="btn btn-primary w-full" onClick={() => setOpen(false)}>Get a demo</Link>
              <Link href="/sign-in" className="btn btn-outline w-full" onClick={() => setOpen(false)}>Start free</Link>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
