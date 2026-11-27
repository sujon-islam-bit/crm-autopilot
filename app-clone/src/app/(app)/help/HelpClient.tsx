"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { I } from "../../../components/icons";
import {
  HELP_ARTICLES,
  HELP_CATEGORIES,
  searchHelpArticles,
  type HelpArticle,
  type HelpBlock,
} from "../../../lib/help";

export type HelpWorkspaceData = {
  pendingCount: number;
  healthScore: number | null;
  connectedApps: string[];
};

const WHATS_NEW: { date: string; title: string; line: string }[] = [
  {
    date: "Nov 27, 2026",
    title: "AI Assistant",
    line: "Ask your pipeline questions in chat — answers come from your real deals, and actions arrive as proposals.",
  },
  {
    date: "Nov 27, 2026",
    title: "Team roles & invites",
    line: "Five roles (Owner, Admin, Manager, Sales Rep, Viewer), invite links, and a reserved seat for every pending invite.",
  },
  {
    date: "Nov 27, 2026",
    title: "History rollback",
    line: "Applied changes are grouped into batches you can preview, confirm and roll back within 7 days.",
  },
  {
    date: "Nov 27, 2026",
    title: "Data Cleanup guardrails",
    line: "Standing rules for duplicates and enrichment, with a day-by-day health trend.",
  },
  {
    date: "Nov 26, 2026",
    title: "Pipeline movement view",
    line: "See what progressed, stalled, slipped or closed this period — and export it as CSV.",
  },
];

function Block({ block }: { block: HelpBlock }) {
  if (block.kind === "p") {
    return <p className="text-[14px] leading-[1.75] text-ink2">{block.text}</p>;
  }
  if (block.kind === "steps") {
    return (
      <ol className="flex flex-col gap-2.5">
        {block.items.map((item, i) => (
          <li key={i} className="flex gap-3">
            <span className="mt-[1px] flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-violet-tint text-[12px] font-bold text-violet">
              {i + 1}
            </span>
            <span className="text-[14px] leading-[1.7] text-ink2">{item}</span>
          </li>
        ))}
      </ol>
    );
  }
  return (
    <ul className="flex flex-col gap-2.5">
      {block.items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span className="mt-[9px] h-[6px] w-[6px] shrink-0 rounded-full bg-violet" />
          <span className="text-[14px] leading-[1.7] text-ink2">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function ArticleView({ article, onBack }: { article: HelpArticle; onBack: () => void }) {
  return (
    <div>
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-violet hover:underline"
      >
        <I n="arrowR" size={14} className="rotate-180" /> All help topics
      </button>
      <div className="mt-4 text-[11.5px] font-bold tracking-[0.08em] text-violet uppercase">
        {article.category}
      </div>
      <h2 className="mt-1.5 text-[22px] font-extrabold tracking-tight">{article.title}</h2>
      <div className="mt-1.5 flex items-center gap-1.5 text-[12.5px] text-muted">
        <I n="clock" size={13} /> {article.minutes} min read
      </div>
      <div className="card mt-5 px-6 py-6">
        {article.sections.map((section, si) => (
          <div key={si} className={si > 0 ? "mt-6" : ""}>
            {section.heading && (
              <h3 className="mb-2.5 text-[15px] font-bold text-ink">{section.heading}</h3>
            )}
            <div className="flex flex-col gap-3.5">
              {section.blocks.map((block, bi) => (
                <Block key={bi} block={block} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HelpClient({ data }: { data: HelpWorkspaceData }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [openSlug, setOpenSlug] = useState<string | null>(null);

  const searching = query.trim().length > 0;
  const matches = useMemo(() => searchHelpArticles(query), [query]);
  const visible = useMemo(
    () => (category ? matches.filter((a) => a.category === category) : matches),
    [matches, category],
  );
  const open = openSlug ? (HELP_ARTICLES.find((a) => a.slug === openSlug) ?? null) : null;

  const groups = HELP_CATEGORIES.map((c) => ({
    category: c,
    articles: visible.filter((a) => a.category === c.name),
  })).filter((g) => g.articles.length > 0);

  return (
    <div className="px-7 pt-5 pb-7">
      <h1 className="text-[24px] font-extrabold tracking-tight">Help</h1>
      <p className="mt-1 text-[13.5px] text-muted">Guides and answers for everything in Vouchso.</p>

      <div className="mt-5 flex flex-col gap-5 xl:flex-row">
        {/* ---- Main column ---- */}
        <div className="w-full max-w-[880px] min-w-0 flex-1">
          {open ? (
            <ArticleView article={open} onBack={() => setOpenSlug(null)} />
          ) : (
            <>
              {/* Search */}
              <div className="relative">
                <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-faint">
                  <I n="search" size={18} />
                </span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search help — try 'rollback' or 'invite'…"
                  className="w-full rounded-2xl border border-line bg-white py-[14px] pr-11 pl-11 text-[14.5px] shadow-[0_1px_2px_rgba(16,16,30,0.04)] outline-none placeholder:text-faint"
                />
                {searching && (
                  <button
                    onClick={() => setQuery("")}
                    aria-label="Clear search"
                    className="absolute top-1/2 right-3.5 -translate-y-1/2 text-faint hover:text-ink"
                  >
                    <I n="x" size={16} />
                  </button>
                )}
              </div>

              {/* Category tiles */}
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {HELP_CATEGORIES.map((c) => {
                  const count = HELP_ARTICLES.filter((a) => a.category === c.name).length;
                  const active = category === c.name;
                  return (
                    <button
                      key={c.name}
                      onClick={() => setCategory(active ? null : c.name)}
                      className={`rounded-2xl border p-3.5 text-left transition-colors ${
                        active
                          ? "border-violet bg-violet-soft"
                          : "border-line bg-white hover:border-violet/50 hover:bg-violet-soft/60"
                      }`}
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-violet-tint text-violet">
                        <I n={c.icon as never} size={16} />
                      </span>
                      <span className="mt-2.5 block text-[13px] leading-tight font-bold">{c.name}</span>
                      <span className="mt-0.5 block text-[11.5px] text-muted">
                        {count} article{count === 1 ? "" : "s"}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Article groups / states */}
              {visible.length === 0 ? (
                <div className="card mt-5 px-6 py-8 text-center">
                  <p className="text-[14px] font-semibold">No matches for “{query.trim()}” — try a shorter word.</p>
                  <p className="mt-1.5 text-[13px] text-muted">
                    Search looks through article titles and text — one or two words usually find it.
                  </p>
                  <button
                    onClick={() => {
                      setQuery("");
                      setCategory(null);
                    }}
                    className="mt-4 text-[13px] font-semibold text-violet hover:underline"
                  >
                    Clear search and filters
                  </button>
                </div>
              ) : (
                groups.map((g) => (
                  <div key={g.category.name} className="mt-6">
                    <h2 className="mb-2.5 flex items-center gap-2 text-[13px] font-bold tracking-[0.06em] text-ink2 uppercase">
                      <I n={g.category.icon as never} size={15} className="text-violet" />
                      {g.category.name}
                      <span className="font-semibold text-faint normal-case">· {g.category.blurb}</span>
                    </h2>
                    <div className="card divide-y divide-line/60 overflow-hidden">
                      {g.articles.map((a) => (
                        <button
                          key={a.slug}
                          onClick={() => setOpenSlug(a.slug)}
                          className="group flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-violet-soft/70"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block text-[14px] font-semibold text-ink group-hover:text-violet">
                              {a.title}
                            </span>
                            <span className="mt-0.5 block text-[12.5px] leading-relaxed text-muted">
                              {a.summary}
                            </span>
                          </span>
                          <span className="flex shrink-0 items-center gap-1 text-[11.5px] whitespace-nowrap text-faint">
                            <I n="clock" size={12} /> {a.minutes} min
                          </span>
                          <I n="arrowR" size={15} className="shrink-0 text-faint group-hover:text-violet" />
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </div>

        {/* ---- Right column ---- */}
        <aside className="flex w-full shrink-0 flex-col gap-4 xl:w-[300px]">
          <div className="card p-5">
            <h3 className="text-[13px] font-bold tracking-[0.06em] text-ink2 uppercase">
              Your workspace right now
            </h3>
            <div className="mt-4 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-violet-tint text-violet">
                  <I n="inbox" size={17} />
                </span>
                <div className="min-w-0 flex-1 leading-tight">
                  <div className="text-[13px] text-muted">Pending approvals</div>
                  <div className="text-[15px] font-bold">{data.pendingCount}</div>
                </div>
                <Link href="/approvals" className="text-[12.5px] font-semibold text-violet hover:underline">
                  Review
                </Link>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-violet-tint text-violet">
                  <I n="shield" size={17} />
                </span>
                <div className="min-w-0 flex-1 leading-tight">
                  <div className="text-[13px] text-muted">Data health score</div>
                  <div className="text-[15px] font-bold">
                    {data.healthScore != null ? `${data.healthScore} / 100` : "—"}
                  </div>
                  {data.healthScore == null && (
                    <div className="mt-0.5 text-[11.5px] text-faint">
                      Your score appears once Vouchso has read your CRM data.
                    </div>
                  )}
                </div>
                <Link href="/hygiene" className="text-[12.5px] font-semibold text-violet hover:underline">
                  View
                </Link>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-violet-tint text-violet">
                  <I n="plug" size={17} />
                </span>
                <div className="min-w-0 flex-1 leading-tight">
                  <div className="text-[13px] text-muted">Connected apps</div>
                  {data.connectedApps.length > 0 ? (
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {data.connectedApps.map((name) => (
                        <span
                          key={name}
                          className="rounded-full bg-violet-tint px-2.5 py-[3px] text-[12px] font-semibold text-violet"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[15px] font-bold">None yet</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="text-[13px] font-bold tracking-[0.06em] text-ink2 uppercase">What&apos;s new</h3>
            <div className="mt-3.5 flex flex-col gap-4">
              {WHATS_NEW.map((item) => (
                <div key={item.title}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[13.5px] font-bold">{item.title}</span>
                    <span className="shrink-0 text-[11.5px] text-faint">{item.date}</span>
                  </div>
                  <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">{item.line}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <h3 className="flex items-center gap-2 text-[14.5px] font-bold">
              <I n="msg" size={16} className="text-violet" /> Still stuck?
            </h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
              In-app support opens when Vouchso launches. Until then, the guides here cover everything the
              product does today — the search at the top looks through all of them.
            </p>
            <button
              disabled
              title="Available at launch"
              className="mt-3.5 w-full cursor-not-allowed rounded-[10px] border border-line bg-canvas px-3 py-2 text-[13px] font-semibold text-faint"
            >
              Chat with support — available at launch
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
