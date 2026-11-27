"use client";

import { useState } from "react";

export default function Faq3d({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState(0);
  return (
    <div className="divide-y divide-white/[0.08] rounded-[20px] border border-white/10 bg-white/[0.03]">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q}>
            <button
              type="button"
              className="flex min-h-[56px] w-full items-center gap-4 px-6 py-4 text-left"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? -1 : i)}
            >
              <span className="text-[16px] font-semibold text-d3-ivory">{item.q}</span>
              <span
                className={`ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-d3-pink/15 text-d3-pink-bright transition-transform duration-300 ${
                  isOpen ? "rotate-45" : ""
                }`}
                aria-hidden="true"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <path d="M12 4v16M4 12h16" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                </svg>
              </span>
            </button>
            {isOpen && (
              <p className="px-6 pb-5 text-[15px] leading-relaxed text-d3-ivory2">{item.a}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
