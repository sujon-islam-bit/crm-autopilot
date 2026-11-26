"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Hit = { id: string; title: string; sub: string };
type Results = { deals: Hit[]; proposals: Hit[]; captures: Hit[] };

const EMPTY: Results = { deals: [], proposals: [], captures: [] };

/**
 * The dashboard header's search box (Emitly-style): a real query over
 * the workspace's deals, proposals and inbox captures, with a grouped
 * dropdown. Deals go to the pipeline, proposals to approvals, and
 * captures stay on the dashboard where they are shown.
 */
export default function DashboardSearch() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Results>(EMPTY);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults(EMPTY);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`);
        if (res.ok) {
          setResults((await res.json()) as Results);
          setOpen(true);
        }
      } catch {
        setResults(EMPTY);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const total = results.deals.length + results.proposals.length + results.captures.length;
  const showDropdown = open && q.trim().length >= 2;

  const groups: { label: string; href: string; hits: Hit[] }[] = [
    { label: "Deals", href: "/pipeline", hits: results.deals },
    { label: "Approvals", href: "/approvals", hits: results.proposals },
    { label: "Inbox", href: "/dashboard", hits: results.captures },
  ];

  return (
    <div ref={boxRef} className="relative w-full max-w-md">
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.8-3.8" />
        </svg>
      </span>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => total > 0 && setOpen(true)}
        type="text"
        placeholder="Search deals, approvals, emails…"
        className="w-full rounded-full bg-white py-2.5 pl-11 pr-4 text-[14.5px] text-stone-900 shadow-[0_1px_3px_rgba(74,70,52,0.08)] ring-1 ring-line-soft outline-none transition placeholder:text-stone-400 focus:ring-2 focus:ring-pine/50"
      />
      {showDropdown && (
        <div className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-2xl bg-white shadow-[0_18px_40px_-16px_rgba(60,58,40,0.35)] ring-1 ring-line">
          {loading ? (
            <p className="px-4 py-3 text-[13.5px] text-stone-400">Searching…</p>
          ) : total === 0 ? (
            <p className="px-4 py-3 text-[13.5px] text-stone-400">
              No matches for “{q.trim()}”.
            </p>
          ) : (
            groups
              .filter((g) => g.hits.length > 0)
              .map((g) => (
                <div key={g.label} className="border-b border-line-soft py-1.5 last:border-0">
                  <p className="px-4 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wide text-stone-400">
                    {g.label}
                  </p>
                  {g.hits.map((hit) => (
                    <Link
                      key={hit.id}
                      href={g.href}
                      onClick={() => setOpen(false)}
                      className="block px-4 py-2 transition hover:bg-warm"
                    >
                      <span className="block text-[14px] font-semibold leading-snug text-stone-900">
                        {hit.title}
                      </span>
                      <span className="block text-xs text-stone-400">{hit.sub}</span>
                    </Link>
                  ))}
                </div>
              ))
          )}
        </div>
      )}
    </div>
  );
}
