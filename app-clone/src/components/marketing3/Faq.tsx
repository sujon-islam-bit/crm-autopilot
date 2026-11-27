"use client";

import { useState } from "react";

export type FaqItem = { q: string; a: string };

/**
 * HubSpot-style FAQ: full-width white accordion cards, chevron + bold
 * question, stacked with gaps (cloned from the pricing-page FAQ anatomy).
 */
export default function Faq({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="flex flex-col gap-4">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q} className="hs-card-shadow rounded-2xl border border-hs-line bg-white">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center gap-3 px-6 py-5 text-left md:px-8"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                className={`shrink-0 text-hs-brand transition-transform duration-300 ${isOpen ? "rotate-90" : ""}`}
              >
                <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="font-jakarta text-[16px] font-semibold text-hs-ink md:text-[17px]">{item.q}</span>
            </button>
            <div
              className={`grid transition-[grid-template-rows] duration-300 ease-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
            >
              <div className="overflow-hidden">
                <p className="px-6 pb-6 pl-[54px] text-[15px] leading-relaxed text-hs-body md:px-8 md:pl-[62px]">
                  {item.a}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
