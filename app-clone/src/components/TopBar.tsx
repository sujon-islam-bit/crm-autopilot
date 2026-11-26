"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { I } from "./icons";
import { Avatar } from "./Sidebar";

type Hit = { kind: string; label: string; sub: string; href: string };

export default function TopBar({
  healthScore,
  syncText,
  bellCount,
  userName,
}: {
  healthScore: number | null;
  syncText: string;
  bellCount: number;
  userName: string;
}) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!q.trim()) {
      setHits([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data = (await res.json()) as { results: Hit[] };
        setHits(data.results ?? []);
        setOpen(true);
      } catch {
        setHits([]);
      }
    }, 180);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="flex items-center gap-4 px-7 pt-5">
      <div ref={boxRef} className="relative w-[500px] max-w-[46vw]">
        <div className="flex items-center gap-2.5 rounded-full border border-line bg-white py-2.5 pr-2.5 pl-4 shadow-[0_1px_2px_rgba(23,23,40,0.05)]">
          <I n="search" size={16} className="shrink-0 text-faint" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => hits.length && setOpen(true)}
            placeholder="Ask your CRM anything..."
            className="min-w-0 flex-1 border-0 bg-transparent text-[13px] text-ink shadow-none placeholder:text-faint focus:shadow-none"
            style={{ boxShadow: "none" }}
          />
          <kbd className="flex shrink-0 items-center gap-0.5 rounded-md border border-line bg-canvas px-1.5 py-0.5 text-[10.5px] font-medium text-muted">
            ⌘ K
          </kbd>
        </div>
        {open && hits.length > 0 && (
          <div className="absolute inset-x-0 top-full z-40 mt-2 overflow-hidden rounded-2xl border border-line bg-white shadow-xl">
            {hits.map((h, i) => (
              <Link
                key={i}
                href={h.href}
                onClick={() => setOpen(false)}
                className="block border-b border-line/60 px-4 py-2.5 last:border-0 hover:bg-canvas"
              >
                <div className="text-[13px] font-medium text-ink">{h.label}</div>
                <div className="text-[11.5px] text-muted">
                  {h.kind} · {h.sub}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="ml-auto flex items-center gap-4">
        <span className="flex items-center gap-1.5 text-[12.5px] font-medium whitespace-nowrap text-ink2">
          <span className="h-2 w-2 rounded-full bg-green-bright" />
          {syncText}
        </span>
        <span className="flex items-center gap-1.5 rounded-full bg-green-tint px-3 py-1.5 text-[12.5px] font-semibold whitespace-nowrap text-green">
          <I n="shield" size={14} sw={2.2} />
          Data Healthy • {healthScore === null ? "—" : `${healthScore}/100`}
        </span>
        <span className="relative flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white">
          <I n="bell" size={17} className="text-ink2" />
          {bellCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-red px-0.5 text-[9.5px] font-bold text-white">
              {bellCount}
            </span>
          )}
        </span>
        <span className="flex items-center gap-1">
          <Avatar name={userName} size={34} />
          <I n="chevD" size={14} className="text-faint" />
        </span>
      </div>
    </div>
  );
}
