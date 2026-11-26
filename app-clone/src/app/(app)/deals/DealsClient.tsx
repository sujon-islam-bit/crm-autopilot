"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { I } from "@/components/icons";
import { Sparkline } from "@/components/charts";
import { SignatureButton } from "@/components/buttons";
import { money } from "@/lib/constants";
import {
  createAccountAction,
  createContactAction,
  createDealAction,
  proposeStaleFollowupAction,
  signatureAction,
} from "@/lib/actions";
import type {
  AccountRow,
  ContactRow,
  DealRow,
  StatCard,
} from "@/lib/deals";
import type { getDealsData } from "@/lib/deals";

type Data = Awaited<ReturnType<typeof getDealsData>>;
type TabKey = "deals" | "accounts" | "contacts" | "recent" | "atrisk";
type Sel = { type: "deal" | "account" | "contact"; id: string } | null;
type PanelTab = "overview" | "timeline" | "insights" | "notes";

const PAGE_SIZE = 10;

const STAGE_PILL: Record<string, string> = {
  New: "bg-canvas text-muted",
  Discovery: "bg-violet-tint text-violet",
  Contacted: "bg-primary-tint text-primary",
  "Meeting booked": "bg-amber-tint text-amber",
  "Proposal sent": "bg-primary-tint text-primary",
  Negotiation: "bg-purple-tint text-purple",
  Won: "bg-green-tint text-green",
  Lost: "bg-[#fdecec] text-red",
};

const RISK_STYLE: Record<string, { pill: string; dot: string }> = {
  High: { pill: "bg-[#fdecec] text-red", dot: "bg-red" },
  Medium: { pill: "bg-amber-tint text-amber", dot: "bg-[#d99a16]" },
  Low: { pill: "bg-green-tint text-green", dot: "bg-green" },
};

const TILE_COLORS = [
  "bg-primary-tint text-primary",
  "bg-violet-tint text-violet",
  "bg-green-tint text-green",
  "bg-amber-tint text-amber",
  "bg-purple-tint text-purple",
  "bg-[#fdecec] text-red",
];

export function tileColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return TILE_COLORS[h % TILE_COLORS.length];
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function DeltaLine({ card }: { card: StatCard }) {
  const d = card.delta;
  if (!d) return <p className="mt-1 text-[11.5px] font-semibold text-faint">— vs previous 30d</p>;
  if (d.dir === "flat")
    return <p className="mt-1 text-[11.5px] font-semibold text-faint">— {d.text} vs previous 30d</p>;
  return (
    <p className={`mt-1 text-[11.5px] font-semibold ${d.dir === "up" ? "text-green" : "text-red"}`}>
      {d.dir === "up" ? "↑" : "↓"} {d.text} vs previous 30d
    </p>
  );
}

function downloadCsv(filename: string, rows: string[][]) {
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const blob = new Blob([rows.map((r) => r.map(esc).join(",")).join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const selectCls =
  "rounded-lg border border-line bg-white px-2.5 py-[7px] text-[12.5px] font-medium text-ink2 outline-none focus:border-violet";
const inputCls =
  "w-full rounded-lg border border-line bg-white px-3 py-[8px] text-[13px] text-ink outline-none focus:border-violet";

export default function DealsClient({ data, stages }: { data: Data; stages: string[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("deals");
  const [query, setQuery] = useState("");
  const [fStage, setFStage] = useState("any");
  const [fOwner, setFOwner] = useState("any");
  const [fValue, setFValue] = useState("any");
  const [fActivity, setFActivity] = useState("any");
  const [fRisk, setFRisk] = useState("any");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [view, setView] = useState<"list" | "grid">("list");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Sel>(
    data.dealRows[0] ? { type: "deal", id: data.dealRows[0].id } : null,
  );
  const [panelOpen, setPanelOpen] = useState(true);
  const [panelTab, setPanelTab] = useState<PanelTab>("overview");
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [newMenu, setNewMenu] = useState(false);
  const [newKind, setNewKind] = useState<"deal" | "contact" | "account" | null>(null);
  const [sigNote, setSigNote] = useState("");
  const [, startSig] = useTransition();

  const q = query.trim().toLowerCase();
  const resetPage = () => setPage(1);

  const dealMatches = (r: DealRow) => {
    if (q && !`${r.name} ${r.company ?? ""} ${r.contact?.name ?? ""}`.toLowerCase().includes(q)) return false;
    if (fStage !== "any" && r.stage !== fStage) return false;
    if (fOwner === "__none" ? r.ownerName != null : fOwner !== "any" && r.ownerName !== fOwner) return false;
    if (fValue !== "any") {
      if (r.amount == null) return false;
      if (fValue === "lt50" && r.amount >= 50000) return false;
      if (fValue === "50to100" && (r.amount < 50000 || r.amount > 100000)) return false;
      if (fValue === "gt100" && r.amount <= 100000) return false;
    }
    if (fActivity !== "any") {
      const age = Date.now() - new Date(r.lastActivityISO).getTime();
      if (fActivity === "today" && age > 86_400_000) return false;
      if (fActivity === "week" && age > 7 * 86_400_000) return false;
      if (fActivity === "month" && age > 30 * 86_400_000) return false;
    }
    if (fRisk !== "any" && r.risk !== fRisk) return false;
    return true;
  };

  const dealsFiltered = useMemo(
    () => data.dealRows.filter(dealMatches),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, q, fStage, fOwner, fValue, fActivity, fRisk],
  );
  const atriskFiltered = useMemo(
    () =>
      data.dealRows
        .filter((r) => r.risk === "High" || r.risk === "Medium")
        .filter(dealMatches)
        .sort((a, b) => (a.risk === b.risk ? (b.amount ?? 0) - (a.amount ?? 0) : a.risk === "High" ? -1 : 1)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, q, fStage, fOwner, fValue, fActivity, fRisk],
  );
  const accountsFiltered = useMemo(
    () =>
      data.accountRows.filter(
        (a) => !q || `${a.name} ${a.industry ?? ""}`.toLowerCase().includes(q),
      ),
    [data, q],
  );
  const contactsFiltered = useMemo(
    () =>
      data.contactRows.filter(
        (c) => !q || `${c.name} ${c.email ?? ""} ${c.company ?? ""} ${c.title ?? ""}`.toLowerCase().includes(q),
      ),
    [data, q],
  );
  const recentFiltered = useMemo(
    () => data.recent.filter((r) => !q || `${r.name} ${r.detail}`.toLowerCase().includes(q)),
    [data, q],
  );

  const activeCount =
    tab === "deals"
      ? dealsFiltered.length
      : tab === "atrisk"
        ? atriskFiltered.length
        : tab === "accounts"
          ? accountsFiltered.length
          : tab === "contacts"
            ? contactsFiltered.length
            : recentFiltered.length;
  const pageCount = Math.max(1, Math.ceil(activeCount / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const slice = <T,>(arr: T[]): T[] => arr.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const dealsPage = slice(dealsFiltered);
  const atriskPage = slice(atriskFiltered);
  const accountsPage = slice(accountsFiltered);
  const contactsPage = slice(contactsFiltered);
  const recentPage = slice(recentFiltered);

  const selectDeal = (r: DealRow) => {
    setSelected({ type: "deal", id: r.id });
    setPanelOpen(true);
    setPanelTab("overview");
    setMenuFor(null);
  };
  const selectAccount = (a: AccountRow) => {
    setSelected({ type: "account", id: a.name });
    setPanelOpen(true);
    setPanelTab("overview");
  };
  const selectContact = (c: ContactRow) => {
    setSelected({ type: "contact", id: c.id });
    setPanelOpen(true);
    setPanelTab("overview");
  };

  const toggleCheck = (id: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const sendSignature = (r: DealRow) => {
    setMenuFor(null);
    startSig(async () => {
      const res = await signatureAction(r.externalId);
      setSigNote(
        res.ok
          ? res.sent
            ? `Sent via SignuDoc — ${r.name}`
            : res.configured
              ? `SignuDoc send failed — recorded as requested (${r.name})`
              : `Signature requested for ${r.name} (SignuDoc not configured)`
          : "Could not send for signature",
      );
      router.refresh();
    });
  };

  const exportCsv = () => {
    if (tab === "deals" || tab === "atrisk") {
      const rows = tab === "deals" ? dealsFiltered : atriskFiltered;
      downloadCsv("deals.csv", [
        ["Deal Name", "Company", "Amount", "Stage", "Owner", "Last Activity", "Risk"],
        ...rows.map((r) => [
          r.name,
          r.company ?? "",
          r.amount != null ? String(Math.round(r.amount)) : "",
          r.stage,
          r.ownerName ?? "",
          r.lastActivityLabel,
          r.risk ?? "",
        ]),
      ]);
    } else if (tab === "accounts") {
      downloadCsv("accounts.csv", [
        ["Company", "Industry", "Deals", "Open Value", "Contacts", "Last Activity"],
        ...accountsFiltered.map((a) => [
          a.name,
          a.industry ?? "",
          String(a.dealsCount),
          String(Math.round(a.openValue)),
          String(a.contactsCount),
          a.lastActivityLabel,
        ]),
      ]);
    } else if (tab === "contacts") {
      downloadCsv("contacts.csv", [
        ["Name", "Title", "Company", "Email", "Added"],
        ...contactsFiltered.map((c) => [c.name, c.title ?? "", c.company ?? "", c.email ?? "", c.addedLabel]),
      ]);
    } else {
      downloadCsv("recently-updated.csv", [
        ["Type", "Name", "Detail", "Updated"],
        ...recentFiltered.map((r) => [r.type, r.name, r.detail, r.when]),
      ]);
    }
  };

  const clearFilters = () => {
    setFStage("any");
    setFOwner("any");
    setFValue("any");
    setFActivity("any");
    setFRisk("any");
    setQuery("");
    resetPage();
  };

  const tabs: { key: TabKey; label: string; count?: number; red?: boolean }[] = [
    { key: "deals", label: "All Deals", count: data.counts.deals },
    { key: "accounts", label: "All Accounts", count: data.counts.accounts },
    { key: "contacts", label: "All Contacts", count: data.counts.contacts },
    { key: "recent", label: "Recently Updated" },
    { key: "atrisk", label: "At Risk", count: data.counts.atRisk, red: true },
  ];

  const selDeal = selected?.type === "deal" ? data.dealRows.find((r) => r.id === selected.id) : undefined;
  const selAccount = selected?.type === "account" ? data.accountRows.find((a) => a.name === selected.id) : undefined;
  const selContact = selected?.type === "contact" ? data.contactRows.find((c) => c.id === selected.id) : undefined;

  return (
    <div className="flex items-start gap-5 px-7 pt-5 pb-7">
      <div className="min-w-0 flex-1">
        {/* header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[24px] font-extrabold tracking-tight">Deals &amp; Contacts</h1>
            <p className="mt-1 text-[13.5px] text-muted">
              View and manage your CRM records with AI-powered insights.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            <button onClick={exportCsv} className="btn-outline flex items-center gap-2 px-3.5 py-[8px] text-[13px] font-semibold">
              <I n="download" size={14} sw={2.2} />
              Export
            </button>
            <div className="relative">
              <button
                onClick={() => setNewMenu((v) => !v)}
                className="btn-violet flex items-center gap-1.5 px-3.5 py-[8px] text-[13px] font-semibold"
              >
                <I n="plus" size={14} sw={2.4} />
                New Deal
                <I n="chevD" size={13} />
              </button>
              {newMenu && (
                <div className="absolute right-0 z-40 mt-2 w-44 overflow-hidden rounded-xl border border-line bg-white shadow-[0_16px_40px_-12px_rgba(23,23,40,0.3)]">
                  {(
                    [
                      ["deal", "New Deal"],
                      ["contact", "New Contact"],
                      ["account", "New Account"],
                    ] as const
                  ).map(([kind, label]) => (
                    <button
                      key={kind}
                      onClick={() => {
                        setNewMenu(false);
                        setNewKind(kind);
                      }}
                      className="block w-full px-3.5 py-2.5 text-left text-[13px] font-medium text-ink2 hover:bg-canvas"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* stat cards */}
        <div className="mt-5 grid grid-cols-4 gap-4">
          {data.stats.map((s) => (
            <div key={s.key} className="card flex items-start gap-3 px-4 py-3.5">
              <div className="min-w-0 flex-1">
                <span className={`flex h-[30px] w-[30px] items-center justify-center rounded-[9px] ${s.tile}`}>
                  <I n={s.icon} size={15} />
                </span>
                <p className="mt-2 text-[12px] font-medium text-muted">{s.label}</p>
                <p className="text-[22px] leading-tight font-extrabold tracking-tight">{s.value}</p>
                <DeltaLine card={s} />
              </div>
              <div className="w-[86px] shrink-0 pt-1">
                <Sparkline data={s.spark} color={s.color} width={86} height={40} />
              </div>
            </div>
          ))}
        </div>

        {/* tabs */}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setTab(t.key);
                resetPage();
              }}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-[7px] text-[13px] font-semibold ${
                tab === t.key ? "bg-violet text-white" : "bg-white text-ink2 border border-line hover:bg-canvas"
              }`}
            >
              {t.label}
              {t.count != null && (
                <span
                  className={`rounded-full px-1.5 py-[1px] text-[11px] font-bold ${
                    t.red ? "bg-[#fdecec] text-red" : tab === t.key ? "bg-white/25 text-white" : "bg-violet-tint text-violet"
                  }`}
                >
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* filter row (deal-shaped tabs) */}
        {(tab === "deals" || tab === "atrisk") && (
          <div className="mt-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setFiltersOpen((v) => !v)}
                className="btn-outline flex items-center gap-2 px-3 py-[7px] text-[12.5px] font-semibold"
              >
                <I n="filter" size={13} />
                Filters
              </button>
              <select aria-label="Deal Stage" className={selectCls} value={fStage} onChange={(e) => { setFStage(e.target.value); resetPage(); }}>
                <option value="any">Deal Stage</option>
                {stages.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <select aria-label="Owner" className={selectCls} value={fOwner} onChange={(e) => { setFOwner(e.target.value); resetPage(); }}>
                <option value="any">Owner</option>
                {data.owners.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
                {data.hasUnassigned && <option value="__none">Unassigned</option>}
              </select>
              <select aria-label="Value" className={selectCls} value={fValue} onChange={(e) => { setFValue(e.target.value); resetPage(); }}>
                <option value="any">Value</option>
                <option value="lt50">Under $50K</option>
                <option value="50to100">$50K – $100K</option>
                <option value="gt100">Over $100K</option>
              </select>
              <select aria-label="Last Activity" className={selectCls} value={fActivity} onChange={(e) => { setFActivity(e.target.value); resetPage(); }}>
                <option value="any">Last Activity</option>
                <option value="today">Today</option>
                <option value="week">This week</option>
                <option value="month">This month</option>
              </select>
              <div className="relative ml-auto">
                <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint">
                  <I n="search" size={13} />
                </span>
                <input
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); resetPage(); }}
                  placeholder="Search deals..."
                  className="w-[210px] rounded-lg border border-line bg-white py-[7px] pr-3 pl-8 text-[12.5px] outline-none focus:border-violet"
                />
              </div>
              <div className="flex overflow-hidden rounded-lg border border-line">
                <button
                  aria-label="List view"
                  onClick={() => setView("list")}
                  className={`px-2.5 py-[7px] ${view === "list" ? "bg-violet-tint text-violet" : "bg-white text-muted"}`}
                >
                  <I n="list" size={14} />
                </button>
                <button
                  aria-label="Grid view"
                  onClick={() => setView("grid")}
                  className={`px-2.5 py-[7px] ${view === "grid" ? "bg-violet-tint text-violet" : "bg-white text-muted"}`}
                >
                  <I n="grid" size={14} />
                </button>
              </div>
            </div>
            {filtersOpen && (
              <div className="card mt-2.5 flex flex-wrap items-center gap-3 px-4 py-3">
                <label className="flex items-center gap-2 text-[12.5px] font-medium text-ink2">
                  Risk
                  <select aria-label="Risk" className={selectCls} value={fRisk} onChange={(e) => { setFRisk(e.target.value); resetPage(); }}>
                    <option value="any">Any risk</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </label>
                <button onClick={clearFilters} className="text-[12.5px] font-semibold text-violet hover:underline">
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        )}
        {(tab === "accounts" || tab === "contacts" || tab === "recent") && (
          <div className="mt-4 flex items-center gap-2">
            <div className="relative ml-auto">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint">
                <I n="search" size={13} />
              </span>
              <input
                value={query}
                onChange={(e) => { setQuery(e.target.value); resetPage(); }}
                placeholder={tab === "accounts" ? "Search accounts..." : tab === "contacts" ? "Search contacts..." : "Search updates..."}
                className="w-[210px] rounded-lg border border-line bg-white py-[7px] pr-3 pl-8 text-[12.5px] outline-none focus:border-violet"
              />
            </div>
          </div>
        )}

        {!data.hasConnection && (
          <div className="card mt-4 flex items-center gap-3.5 px-5 py-4">
            <span className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-primary-tint text-primary">
              <I n="plug" size={18} />
            </span>
            <div className="flex-1">
              <p className="text-[13.5px] font-bold">Connect your CRM</p>
              <p className="text-[12.5px] text-muted">Connect HubSpot or Salesforce and your deals and contacts will appear here automatically.</p>
            </div>
            <Link href="/connections" className="btn-violet px-3.5 py-[8px] text-[13px] font-semibold">
              Connect your CRM
            </Link>
          </div>
        )}

        {sigNote && (
          <p className="mt-3 rounded-lg bg-green-tint px-3.5 py-2 text-[12.5px] font-medium text-green">{sigNote}</p>
        )}
        {checked.size > 0 && (
          <div className="mt-3 flex items-center gap-3 rounded-lg bg-violet-soft px-3.5 py-2 text-[12.5px] font-medium text-ink2">
            <span>{checked.size} selected</span>
            <button onClick={() => setChecked(new Set())} className="font-semibold text-violet hover:underline">
              Clear
            </button>
          </div>
        )}

        {/* ---------- tables ---------- */}
        {(tab === "deals" || tab === "atrisk") && (
          <>
            {view === "list" ? (
              <div className="card mt-4 overflow-hidden">
                <table className="w-full table-fixed text-[13px]" id="deals-table">
                  <colgroup>
                    <col style={{ width: 36 }} />
                    <col style={{ width: "19%" }} />
                    <col style={{ width: "16%" }} />
                    <col style={{ width: "11%" }} />
                    <col style={{ width: "14%" }} />
                    <col style={{ width: "13%" }} />
                    <col style={{ width: "9%" }} />
                    <col style={{ width: "9%" }} />
                    <col style={{ width: 40 }} />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-line bg-[#fafaff] text-left text-[11.5px] tracking-wide text-muted uppercase">
                      <th className="w-9 px-3 py-3">
                        <input
                          type="checkbox"
                          aria-label="Select all on page"
                          checked={(tab === "deals" ? dealsPage : atriskPage).length > 0 && (tab === "deals" ? dealsPage : atriskPage).every((r) => checked.has(r.id))}
                          onChange={(e) => {
                            const rows = tab === "deals" ? dealsPage : atriskPage;
                            setChecked((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) rows.forEach((r) => next.add(r.id));
                              else rows.forEach((r) => next.delete(r.id));
                              return next;
                            });
                          }}
                        />
                      </th>
                      <th className="px-3 py-3 font-semibold">Deal Name</th>
                      <th className="px-3 py-3 font-semibold">Company</th>
                      <th className="px-3 py-3 font-semibold">Amount</th>
                      <th className="px-3 py-3 font-semibold">Stage</th>
                      <th className="px-3 py-3 font-semibold">Owner</th>
                      <th className="px-3 py-3 font-semibold">Last Activity</th>
                      <th className="px-3 py-3 font-semibold">Risk</th>
                      <th className="w-10 px-3 py-3 font-semibold"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/60">
                    {(tab === "deals" ? dealsPage : atriskPage).map((r) => (
                      <tr
                        key={r.id}
                        onClick={() => selectDeal(r)}
                        className={`cursor-pointer hover:bg-[#fafaff] ${selected?.type === "deal" && selected.id === r.id ? "bg-violet-soft" : ""}`}
                      >
                        <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" aria-label={`Select ${r.name}`} checked={checked.has(r.id)} onChange={() => toggleCheck(r.id)} />
                        </td>
                        <td className="max-w-[230px] px-3 py-3">
                          <span className="flex items-center gap-2.5">
                            <span className={`flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[8px] text-[12px] font-extrabold ${tileColor(r.company ?? r.name)}`}>
                              {(r.company ?? r.name).charAt(0).toUpperCase()}
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate font-semibold">{r.name}</span>
                              {r.subline && <span className="block truncate text-[11.5px] text-muted">{r.subline}</span>}
                            </span>
                          </span>
                        </td>
                        <td className="px-3 py-3 text-ink2">
                          {r.company ? (
                            <span className="flex items-center gap-2">
                              <span className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[6px] text-[10px] font-extrabold ${tileColor(r.company)}`}>
                                {r.company.charAt(0).toUpperCase()}
                              </span>
                              <span className="min-w-0 truncate" title={r.company}>{r.company}</span>
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-3 py-3 font-bold">{money(r.amount)}</td>
                        <td className="px-3 py-3">
                          <span className={`rounded-full px-2.5 py-[3px] text-[11px] font-semibold whitespace-nowrap ${STAGE_PILL[r.stage] ?? "bg-canvas text-muted"}`}>
                            {r.stage}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          {r.ownerName ? (
                            <span className="flex items-center gap-2 whitespace-nowrap">
                              <span className="flex h-[24px] w-[24px] items-center justify-center rounded-full bg-primary-tint text-[9.5px] font-extrabold text-primary">
                                {initials(r.ownerName)}
                              </span>
                              <span className="text-ink2">{r.ownerName}</span>
                            </span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-ink2">{r.lastActivityLabel}</td>
                        <td className="px-3 py-3">
                          {r.risk ? (
                            <span className={`flex w-fit items-center gap-1.5 rounded-full px-2 py-[3px] text-[11px] font-bold ${RISK_STYLE[r.risk].pill}`}>
                              <span className={`h-[6px] w-[6px] rounded-full ${RISK_STYLE[r.risk].dot}`} />
                              {r.risk}
                            </span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className="relative px-3 py-3" onClick={(e) => e.stopPropagation()}>
                          <button
                            aria-label={`Actions for ${r.name}`}
                            onClick={() => setMenuFor(menuFor === r.id ? null : r.id)}
                            className="rounded-md px-1.5 py-1 text-muted hover:bg-canvas hover:text-ink"
                          >
                            <I n="dots" size={15} />
                          </button>
                          {menuFor === r.id && (
                            <div className="absolute right-3 z-40 mt-1 w-48 overflow-hidden rounded-xl border border-line bg-white shadow-[0_16px_40px_-12px_rgba(23,23,40,0.3)]">
                              <button onClick={() => selectDeal(r)} className="block w-full px-3.5 py-2.5 text-left text-[12.5px] font-medium text-ink2 hover:bg-canvas">
                                View details
                              </button>
                              <button onClick={() => sendSignature(r)} className="block w-full px-3.5 py-2.5 text-left text-[12.5px] font-medium text-ink2 hover:bg-canvas">
                                Send for signature
                              </button>
                              <Link href="/pipeline" className="block px-3.5 py-2.5 text-[12.5px] font-medium text-ink2 hover:bg-canvas">
                                Open in Pipeline
                              </Link>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {(tab === "deals" ? dealsPage : atriskPage).length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-5 py-8 text-center text-muted">
                          {activeCount === 0 && (q || fStage !== "any" || fRisk !== "any")
                            ? "No deals match these filters."
                            : tab === "atrisk"
                              ? "No deals at risk right now."
                              : "No deals yet — connect your CRM or add your first deal."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-3 gap-3.5">
                {(tab === "deals" ? dealsFiltered : atriskFiltered).map((r) => (
                  <button
                    key={r.id}
                    onClick={() => selectDeal(r)}
                    className={`card px-4 py-3.5 text-left hover:border-violet/40 ${selected?.type === "deal" && selected.id === r.id ? "border-violet/50 bg-violet-soft" : ""}`}
                  >
                    <span className="flex items-center gap-2.5">
                      <span className={`flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[8px] text-[12px] font-extrabold ${tileColor(r.company ?? r.name)}`}>
                        {(r.company ?? r.name).charAt(0).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[13.5px] font-bold">{r.name}</span>
                      <span className="text-[15px] font-extrabold">{money(r.amount)}</span>
                    </span>
                    <span className="mt-2.5 flex items-center gap-2">
                      <span className={`rounded-full px-2.5 py-[3px] text-[11px] font-semibold ${STAGE_PILL[r.stage] ?? "bg-canvas text-muted"}`}>{r.stage}</span>
                      {r.risk && (
                        <span className={`flex items-center gap-1.5 rounded-full px-2 py-[3px] text-[11px] font-bold ${RISK_STYLE[r.risk].pill}`}>
                          <span className={`h-[6px] w-[6px] rounded-full ${RISK_STYLE[r.risk].dot}`} />
                          {r.risk}
                        </span>
                      )}
                      <span className="ml-auto text-[11.5px] text-muted">{r.lastActivityLabel}</span>
                    </span>
                  </button>
                ))}
                {(tab === "deals" ? dealsFiltered : atriskFiltered).length === 0 && (
                  <p className="col-span-3 py-8 text-center text-muted">No deals match.</p>
                )}
              </div>
            )}
          </>
        )}

        {tab === "accounts" && (
          <div className="card mt-4 overflow-hidden">
            <table className="w-full text-[13px]" id="accounts-table">
              <thead>
                <tr className="border-b border-line bg-[#fafaff] text-left text-[11.5px] tracking-wide text-muted uppercase">
                  <th className="px-4 py-3 font-semibold">Company</th>
                  <th className="px-4 py-3 font-semibold">Industry</th>
                  <th className="px-4 py-3 font-semibold">Deals</th>
                  <th className="px-4 py-3 font-semibold">Open Value</th>
                  <th className="px-4 py-3 font-semibold">Contacts</th>
                  <th className="px-4 py-3 font-semibold">Last Activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {accountsPage.map((a) => (
                  <tr
                    key={a.name}
                    onClick={() => selectAccount(a)}
                    className={`cursor-pointer hover:bg-[#fafaff] ${selected?.type === "account" && selected.id === a.name ? "bg-violet-soft" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2.5 font-semibold">
                        <span className={`flex h-[28px] w-[28px] items-center justify-center rounded-[8px] text-[11px] font-extrabold ${tileColor(a.name)}`}>
                          {a.name.charAt(0).toUpperCase()}
                        </span>
                        {a.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink2">{a.industry ?? "—"}</td>
                    <td className="px-4 py-3 text-ink2">{a.dealsCount}</td>
                    <td className="px-4 py-3 font-bold">{money(a.openValue)}</td>
                    <td className="px-4 py-3 text-ink2">{a.contactsCount}</td>
                    <td className="px-4 py-3 text-ink2">{a.lastActivityLabel}</td>
                  </tr>
                ))}
                {accountsPage.length === 0 && (
                  <tr><td colSpan={6} className="px-5 py-8 text-center text-muted">No accounts yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === "contacts" && (
          <div className="card mt-4 overflow-hidden">
            <table className="w-full text-[13px]" id="contacts-table">
              <thead>
                <tr className="border-b border-line bg-[#fafaff] text-left text-[11.5px] tracking-wide text-muted uppercase">
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Title</th>
                  <th className="px-4 py-3 font-semibold">Company</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {contactsPage.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => selectContact(c)}
                    className={`cursor-pointer hover:bg-[#fafaff] ${selected?.type === "contact" && selected.id === c.id ? "bg-violet-soft" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2.5 font-semibold">
                        <span className="flex h-[28px] w-[28px] items-center justify-center rounded-full bg-primary-tint text-[10px] font-extrabold text-primary">
                          {initials(c.name)}
                        </span>
                        {c.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink2">{c.title ?? "—"}</td>
                    <td className="px-4 py-3 text-ink2">{c.company ?? "—"}</td>
                    <td className="px-4 py-3 text-ink2">{c.email ?? "—"}</td>
                    <td className="px-4 py-3 text-ink2">{c.addedLabel}</td>
                  </tr>
                ))}
                {contactsPage.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-muted">No contacts yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === "recent" && (
          <div className="card mt-4 overflow-hidden">
            <table className="w-full text-[13px]" id="recent-table">
              <thead>
                <tr className="border-b border-line bg-[#fafaff] text-left text-[11.5px] tracking-wide text-muted uppercase">
                  <th className="px-4 py-3 font-semibold">Record</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Detail</th>
                  <th className="px-4 py-3 font-semibold">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {recentPage.map((r) => (
                  <tr
                    key={`${r.type}-${r.id}`}
                    onClick={() => {
                      if (r.type === "deal") {
                        const d = data.dealRows.find((x) => x.id === r.id);
                        if (d) selectDeal(d);
                      } else {
                        const c = data.contactRows.find((x) => x.id === r.id);
                        if (c) selectContact(c);
                      }
                    }}
                    className="cursor-pointer hover:bg-[#fafaff]"
                  >
                    <td className="px-4 py-3 font-semibold">{r.name}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-[2px] text-[11px] font-bold capitalize ${r.type === "deal" ? "bg-primary-tint text-primary" : "bg-violet-tint text-violet"}`}>
                        {r.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink2">{r.detail}</td>
                    <td className="px-4 py-3 text-ink2">{r.when}</td>
                  </tr>
                ))}
                {recentPage.length === 0 && (
                  <tr><td colSpan={4} className="px-5 py-8 text-center text-muted">Nothing updated in the last 7 days.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* pagination */}
        {activeCount > 0 && (view === "list" || (tab !== "deals" && tab !== "atrisk")) ? (
          <div className="mt-3.5 flex items-center justify-between text-[12.5px] text-muted">
            <span>
              Showing {activeCount === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, activeCount)} of {activeCount}{" "}
              {tab === "accounts" ? "accounts" : tab === "contacts" ? "contacts" : tab === "recent" ? "updates" : "deals"}
            </span>
            <span className="flex items-center gap-1.5">
              <button
                aria-label="Previous page"
                disabled={safePage <= 1}
                onClick={() => setPage(safePage - 1)}
                className="rounded-lg border border-line bg-white px-2.5 py-[6px] font-semibold disabled:opacity-40"
              >
                ←
              </button>
              {Array.from({ length: pageCount }, (_, i) => i + 1)
                .filter((n) => n === 1 || n === pageCount || Math.abs(n - safePage) <= 1)
                .reduce<(number | "…")[]>((acc, n, i, arr) => {
                  if (i > 0 && n - (arr[i - 1] as number) > 1) acc.push("…");
                  acc.push(n);
                  return acc;
                }, [])
                .map((n, i) =>
                  n === "…" ? (
                    <span key={`e${i}`} className="px-1">…</span>
                  ) : (
                    <button
                      key={n}
                      onClick={() => setPage(n as number)}
                      className={`rounded-lg px-2.5 py-[6px] font-semibold ${n === safePage ? "bg-violet text-white" : "border border-line bg-white"}`}
                    >
                      {n}
                    </button>
                  ),
                )}
              <button
                aria-label="Next page"
                disabled={safePage >= pageCount}
                onClick={() => setPage(safePage + 1)}
                className="rounded-lg border border-line bg-white px-2.5 py-[6px] font-semibold disabled:opacity-40"
              >
                →
              </button>
            </span>
          </div>
        ) : null}
      </div>

      {/* ---------- right detail panel ---------- */}
      {panelOpen && (selDeal || selAccount || selContact) && (
        <aside className="card sticky top-5 max-h-[calc(100vh-40px)] w-[368px] shrink-0 overflow-y-auto p-[18px]">
          {selDeal && (
            <DealPanel
              deal={selDeal}
              panelTab={panelTab}
              setPanelTab={setPanelTab}
              crmPortalId={data.crmPortalId}
              onClose={() => setPanelOpen(false)}
            />
          )}
          {selAccount && (
            <AccountPanel
              account={selAccount}
              data={data}
              onClose={() => setPanelOpen(false)}
              onDeal={(id) => {
                const d = data.dealRows.find((x) => x.id === id);
                if (d) selectDeal(d);
              }}
              onContact={(id) => {
                const c = data.contactRows.find((x) => x.id === id);
                if (c) selectContact(c);
              }}
            />
          )}
          {selContact && <ContactPanel contact={selContact} onClose={() => setPanelOpen(false)} />}
        </aside>
      )}

      {newKind && (
        <CreateModal
          kind={newKind}
          stages={stages}
          onClose={() => setNewKind(null)}
          onCreated={(id) => {
            setNewKind(null);
            if (newKind === "deal") {
              setTab("deals");
              setSelected({ type: "deal", id });
            } else if (newKind === "contact") {
              setTab("contacts");
              setSelected({ type: "contact", id });
            } else {
              setTab("accounts");
            }
            setPanelOpen(true);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

/* ================= panels ================= */

function PanelHeader({
  tile,
  title,
  meta,
  onClose,
  crmPortalId,
}: {
  tile: React.ReactNode;
  title: string;
  meta: string | null;
  onClose: () => void;
  crmPortalId?: string | null;
}) {
  return (
    <div className="flex items-start gap-2.5">
      {tile}
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-[15px] font-extrabold tracking-tight">{title}</h3>
        {meta && <p className="mt-[1px] truncate text-[12px] text-muted">{meta}</p>}
      </div>
      {crmPortalId ? (
        <a
          href={`https://app.hubspot.com/contacts/${crmPortalId}/objects/0-3/views/all/list`}
          target="_blank"
          rel="noreferrer"
          className="text-faint hover:text-ink"
          aria-label="Open in CRM"
        >
          <I n="external" size={15} />
        </a>
      ) : (
        <span className="text-line" aria-hidden>
          <I n="external" size={15} />
        </span>
      )}
      <button onClick={onClose} className="text-faint hover:text-ink" aria-label="Close panel">
        <I n="x" size={16} />
      </button>
    </div>
  );
}

function DealPanel({
  deal,
  panelTab,
  setPanelTab,
  crmPortalId,
  onClose,
}: {
  deal: DealRow;
  panelTab: PanelTab;
  setPanelTab: (t: PanelTab) => void;
  crmPortalId: string | null;
  onClose: () => void;
}) {
  const company = deal.company ?? deal.name;
  return (
    <div>
      <PanelHeader
        tile={
          <span className={`flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] text-[15px] font-extrabold ${tileColor(company)}`}>
            {company.charAt(0).toUpperCase()}
          </span>
        }
        title={company}
        meta={deal.industry}
        onClose={onClose}
        crmPortalId={crmPortalId}
      />

      <div className="mt-4 flex gap-4 border-b border-line text-[12.5px] font-semibold">
        {(
          [
            ["overview", "Deal Overview"],
            ["timeline", "Timeline"],
            ["insights", "Insights"],
            ["notes", "AI Notes"],
          ] as [PanelTab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setPanelTab(key)}
            className={`pb-2 ${panelTab === key ? "border-b-2 border-violet text-violet" : "text-muted hover:text-ink"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {panelTab === "overview" && (
        <div>
          <div className="mt-3.5 flex items-start justify-between gap-2">
            <h4 className="text-[16px] leading-snug font-extrabold tracking-tight">{deal.name}</h4>
            <span className={`shrink-0 rounded-full px-2.5 py-[3px] text-[11px] font-semibold ${STAGE_PILL[deal.stage] ?? "bg-canvas text-muted"}`}>
              {deal.stage}
            </span>
          </div>
          <p className="mt-1 text-[24px] leading-none font-extrabold tracking-tight">{money(deal.amount)}</p>
          {deal.description && <p className="mt-2 text-[12.5px] leading-snug text-muted">{deal.description}</p>}

          <div className="mt-4 flex flex-col gap-2.5 text-[12.5px]">
            <span className="flex items-center gap-2.5">
              <I n="calendar" size={14} className="text-faint" />
              <span className="w-[86px] text-muted">Close Date</span>
              <span className="ml-auto font-semibold">{deal.closeDateLabel ?? "—"}</span>
            </span>
            <span className="flex items-center gap-2.5">
              <I n="user" size={14} className="text-faint" />
              <span className="w-[86px] text-muted">Deal Owner</span>
              <span className="ml-auto flex items-center gap-1.5 font-semibold">
                {deal.ownerName ? (
                  <>
                    <span className="flex h-[20px] w-[20px] items-center justify-center rounded-full bg-primary-tint text-[8.5px] font-extrabold text-primary">
                      {initials(deal.ownerName)}
                    </span>
                    {deal.ownerName}
                  </>
                ) : (
                  "—"
                )}
              </span>
            </span>
            <span className="flex items-center gap-2.5">
              <I n="layers" size={14} className="text-faint" />
              <span className="w-[86px] text-muted">Pipeline</span>
              <span className="ml-auto font-semibold">Sales Pipeline</span>
            </span>
            <span className="flex items-center gap-2.5">
              <I n="zap" size={14} className="text-faint" />
              <span className="w-[86px] text-muted">Stage</span>
              <span className={`ml-auto rounded-full px-2.5 py-[3px] text-[11px] font-semibold ${STAGE_PILL[deal.stage] ?? "bg-canvas text-muted"}`}>
                {deal.stage}
              </span>
            </span>
          </div>

          {crmPortalId ? (
            <a
              href={`https://app.hubspot.com/contacts/${crmPortalId}/objects/0-3/views/all/list`}
              target="_blank"
              rel="noreferrer"
              className="btn-violet mt-4 block py-[9px] text-center text-[13px] font-semibold"
            >
              View in CRM →
            </a>
          ) : (
            <div className="mt-4">
              <button disabled className="btn-violet block w-full py-[9px] text-center text-[13px] font-semibold opacity-50">
                View in CRM →
              </button>
              <p className="mt-1.5 text-center text-[11.5px] text-muted">Available once your CRM is connected</p>
            </div>
          )}

          <div className="mt-3.5">
            {deal.signatureStatus ? (
              <div className="rounded-[10px] bg-canvas px-3.5 py-2.5 text-[12.5px] font-medium text-ink2">
                {deal.signatureStatus === "completed"
                  ? "Signature completed — signed via SignuDoc."
                  : deal.signatureStatus === "sent"
                    ? "Signature sent via SignuDoc — waiting for the signature."
                    : deal.signatureStatus === "declined"
                      ? "Signature declined by the signer."
                      : "Signature requested — SignuDoc isn't connected yet, so nothing has been sent."}
              </div>
            ) : (
              <SignatureButton dealExternalId={deal.externalId} />
            )}
          </div>

          <div className="mt-5 rounded-xl bg-violet-soft px-3.5 py-3">
            <div className="flex items-center gap-1.5">
              <I n="sparkle" size={13} className="text-violet" />
              <h5 className="text-[13px] font-bold">AI Insights</h5>
              <span className="ml-auto rounded-full bg-white px-2 py-[1px] text-[10px] font-bold text-violet">Beta</span>
            </div>
            <p className="mt-2 flex gap-2 text-[12.5px] leading-snug text-ink2">
              <I n="bulb" size={14} className="mt-[1px] shrink-0 text-amber-bright" />
              {deal.insight.summary}
            </p>
            <div className="mt-2 flex flex-col gap-1 border-t border-violet/10 pt-2">
              {deal.insight.reasons.map((r, i) => (
                <p key={i} className="flex items-baseline justify-between gap-2 text-[11.5px] text-muted">
                  <span>{r.text}</span>
                  <span className={`shrink-0 font-bold ${r.points > 0 ? "text-green" : r.points < 0 ? "text-red" : "text-faint"}`}>
                    {r.points > 0 ? `+${r.points}` : r.points}
                  </span>
                </p>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between">
              <h5 className="text-[13px] font-bold">Recent Activity</h5>
              <Link href="/activity" className="text-[12px] font-semibold text-violet hover:underline">
                View All →
              </Link>
            </div>
            <div className="mt-2 flex flex-col gap-2">
              {deal.recent.map((e, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className="mt-[1px] flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full bg-canvas text-muted">
                    <I n={e.kind === "capture" ? "mail" : e.kind === "proposal" ? "sparkle" : "sync"} size={11} />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-ink2">{e.title}</span>
                  <span className="shrink-0 text-[11px] text-faint">{e.when}</span>
                </div>
              ))}
              {deal.recent.length === 0 && <p className="text-[12.5px] text-muted">No activity recorded for this deal yet.</p>}
            </div>
          </div>
        </div>
      )}

      {panelTab === "timeline" && (
        <div className="mt-3.5 flex flex-col gap-2.5">
          {deal.timeline.map((e, i) => (
            <div key={i} className="flex items-start gap-2.5 rounded-xl border border-line px-3 py-2.5">
              <span className="mt-[1px] flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full bg-canvas text-muted">
                <I n={e.kind === "capture" ? "mail" : e.kind === "proposal" ? "sparkle" : "sync"} size={11} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] leading-snug font-medium text-ink2">{e.title}</span>
                {e.sub && <span className="mt-[1px] block text-[11.5px] leading-snug text-muted">{e.sub}</span>}
                {e.status && (
                  <span className="mt-1 inline-block rounded-full bg-canvas px-2 py-[1px] text-[10.5px] font-bold text-muted capitalize">
                    {e.status}
                  </span>
                )}
              </span>
              <span className="shrink-0 text-[11px] text-faint">{e.when}</span>
            </div>
          ))}
          {deal.timeline.length === 0 && <p className="text-[12.5px] text-muted">Nothing recorded for this deal yet.</p>}
        </div>
      )}

      {panelTab === "insights" && (
        <div className="mt-3.5">
          <h5 className="text-[13px] font-bold">Risk factors</h5>
          <div className="mt-2 flex flex-col gap-2">
            {deal.riskFactors.map((f, i) => (
              <div key={i} className="rounded-xl border border-line px-3 py-2.5">
                <p className="flex items-center gap-1.5 text-[12.5px] font-bold text-ink2">
                  <I n="alert" size={12} className="text-amber" />
                  {f.label}
                </p>
                <p className="mt-[2px] text-[12px] leading-snug text-muted">{f.detail}</p>
              </div>
            ))}
            {deal.riskFactors.length === 0 && <p className="text-[12.5px] text-muted">No risk factors detected — activity and stage look healthy.</p>}
          </div>
          <h5 className="mt-4 text-[13px] font-bold">Suggested next action</h5>
          <div className="mt-2 rounded-xl bg-violet-soft px-3.5 py-3">
            {deal.nextAction?.type === "proposal" ? (
              <>
                <p className="text-[12.5px] leading-snug text-ink2">
                  Review the waiting suggestion: <span className="font-semibold">“{deal.nextAction.title}”</span>
                </p>
                <Link href="/approvals" className="btn-violet mt-2.5 inline-block px-3 py-[7px] text-[12.5px] font-semibold">
                  Review in Approvals
                </Link>
              </>
            ) : deal.nextAction?.type === "followup" ? (
              <>
                <p className="text-[12.5px] leading-snug text-ink2">
                  No suggestion is waiting. Draft a follow-up and it will appear in Approvals for your approval — nothing is sent without it.
                </p>
                <FollowupButton externalId={deal.externalId} />
              </>
            ) : (
              <p className="text-[12.5px] text-ink2">This deal is closed — no next action needed.</p>
            )}
          </div>
        </div>
      )}

      {panelTab === "notes" && (
        <div className="mt-3.5 flex flex-col gap-2.5">
          {deal.notes.map((n) => (
            <div key={n.id} className="rounded-xl border border-line px-3.5 py-3">
              <p className="flex items-center gap-2 text-[11px] font-bold tracking-wide text-muted uppercase">
                <I n={n.kind === "email" ? "mail" : n.kind === "chat" ? "msg" : "phone"} size={11} />
                {n.sourceLabel}
                <span className="ml-auto font-medium normal-case">{n.when}</span>
              </p>
              <p className="mt-1.5 text-[12.5px] font-semibold">{n.title}</p>
              {n.text && <p className="mt-1 text-[12.5px] leading-snug text-muted">{n.text}</p>}
            </div>
          ))}
          {deal.notes.length === 0 && (
            <p className="text-[12.5px] text-muted">No emails or meeting notes recorded for this deal yet.</p>
          )}
        </div>
      )}
    </div>
  );
}

function FollowupButton({ externalId }: { externalId: string }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [note, setNote] = useState("");
  return (
    <span className="mt-2.5 inline-flex items-center gap-2">
      <button
        disabled={busy}
        onClick={() =>
          start(async () => {
            const r = await proposeStaleFollowupAction(externalId);
            setNote(r.ok ? "Draft created — waiting in Approvals" : (r.error ?? "Could not create the draft"));
            if (r.ok) router.refresh();
          })
        }
        className="btn-violet px-3 py-[7px] text-[12.5px] font-semibold disabled:opacity-60"
      >
        Draft follow-up
      </button>
      {note && <span className="text-[11.5px] text-muted">{note}</span>}
    </span>
  );
}

function AccountPanel({
  account,
  data,
  onClose,
  onDeal,
  onContact,
}: {
  account: AccountRow;
  data: Data;
  onClose: () => void;
  onDeal: (id: string) => void;
  onContact: (id: string) => void;
}) {
  const deals = data.dealRows.filter((d) => account.dealIds.includes(d.id));
  const contacts = data.contactRows.filter((c) => account.contactIds.includes(c.id));
  return (
    <div>
      <PanelHeader
        tile={
          <span className={`flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] text-[15px] font-extrabold ${tileColor(account.name)}`}>
            {account.name.charAt(0).toUpperCase()}
          </span>
        }
        title={account.name}
        meta={account.industry}
        onClose={onClose}
      />
      <div className="mt-4 flex flex-col gap-2.5 text-[12.5px]">
        <span className="flex items-center gap-2.5">
          <I n="briefcase" size={14} className="text-faint" />
          <span className="w-[86px] text-muted">Deals</span>
          <span className="ml-auto font-semibold">{account.dealsCount}</span>
        </span>
        <span className="flex items-center gap-2.5">
          <I n="dollar" size={14} className="text-faint" />
          <span className="w-[86px] text-muted">Open Value</span>
          <span className="ml-auto font-semibold">{money(account.openValue)}</span>
        </span>
        <span className="flex items-center gap-2.5">
          <I n="users" size={14} className="text-faint" />
          <span className="w-[86px] text-muted">Contacts</span>
          <span className="ml-auto font-semibold">{account.contactsCount}</span>
        </span>
        <span className="flex items-center gap-2.5">
          <I n="clock" size={14} className="text-faint" />
          <span className="w-[86px] text-muted">Last Activity</span>
          <span className="ml-auto font-semibold">{account.lastActivityLabel}</span>
        </span>
      </div>

      <h5 className="mt-5 text-[13px] font-bold">Deals at {account.name}</h5>
      <div className="mt-2 flex flex-col gap-2">
        {deals.map((d) => (
          <button key={d.id} onClick={() => onDeal(d.id)} className="flex items-center gap-2 rounded-xl border border-line px-3 py-2.5 text-left hover:bg-canvas">
            <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold">{d.name}</span>
            <span className={`rounded-full px-2 py-[2px] text-[10.5px] font-semibold ${STAGE_PILL[d.stage] ?? "bg-canvas text-muted"}`}>{d.stage}</span>
            <span className="text-[12.5px] font-bold">{money(d.amount)}</span>
          </button>
        ))}
        {deals.length === 0 && <p className="text-[12.5px] text-muted">No deals at this account yet.</p>}
      </div>

      <h5 className="mt-5 text-[13px] font-bold">Contacts at {account.name}</h5>
      <div className="mt-2 flex flex-col gap-2">
        {contacts.map((c) => (
          <button key={c.id} onClick={() => onContact(c.id)} className="flex items-center gap-2.5 rounded-xl border border-line px-3 py-2.5 text-left hover:bg-canvas">
            <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-primary-tint text-[9.5px] font-extrabold text-primary">
              {initials(c.name)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] font-semibold">{c.name}</span>
              {c.title && <span className="block truncate text-[11.5px] text-muted">{c.title}</span>}
            </span>
          </button>
        ))}
        {contacts.length === 0 && <p className="text-[12.5px] text-muted">No contacts at this account yet.</p>}
      </div>
      <p className="mt-4 text-[11.5px] leading-snug text-muted">
        Account view — pick a deal or contact above to see its full timeline and AI notes.
      </p>
    </div>
  );
}

function ContactPanel({ contact, onClose }: { contact: ContactRow; onClose: () => void }) {
  return (
    <div>
      <PanelHeader
        tile={
          <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-primary-tint text-[13px] font-extrabold text-primary">
            {initials(contact.name)}
          </span>
        }
        title={contact.name}
        meta={[contact.title, contact.company].filter(Boolean).join(" · ") || null}
        onClose={onClose}
      />
      <div className="mt-4 flex flex-col gap-2.5 text-[12.5px]">
        <span className="flex items-center gap-2.5">
          <I n="mail" size={14} className="text-faint" />
          <span className="w-[86px] text-muted">Email</span>
          <span className="ml-auto min-w-0 truncate font-semibold">{contact.email ?? "—"}</span>
        </span>
        <span className="flex items-center gap-2.5">
          <I n="building" size={14} className="text-faint" />
          <span className="w-[86px] text-muted">Company</span>
          <span className="ml-auto font-semibold">{contact.company ?? "—"}</span>
        </span>
        <span className="flex items-center gap-2.5">
          <I n="user" size={14} className="text-faint" />
          <span className="w-[86px] text-muted">Title</span>
          <span className="ml-auto font-semibold">{contact.title ?? "—"}</span>
        </span>
        <span className="flex items-center gap-2.5">
          <I n="layers" size={14} className="text-faint" />
          <span className="w-[86px] text-muted">Industry</span>
          <span className="ml-auto font-semibold">{contact.industry ?? "—"}</span>
        </span>
        <span className="flex items-center gap-2.5">
          <I n="clock" size={14} className="text-faint" />
          <span className="w-[86px] text-muted">Added</span>
          <span className="ml-auto font-semibold">{contact.addedLabel}</span>
        </span>
      </div>

      <h5 className="mt-5 text-[13px] font-bold">Deals at {contact.company ?? "their company"}</h5>
      <div className="mt-2 flex flex-col gap-2">
        {contact.deals.map((d) => (
          <div key={d.id} className="flex items-center gap-2 rounded-xl border border-line px-3 py-2.5">
            <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold">{d.name}</span>
            <span className={`rounded-full px-2 py-[2px] text-[10.5px] font-semibold ${STAGE_PILL[d.stage] ?? "bg-canvas text-muted"}`}>{d.stage}</span>
            <span className="text-[12.5px] font-bold">{money(d.amount)}</span>
          </div>
        ))}
        {contact.deals.length === 0 && <p className="text-[12.5px] text-muted">No deals at this company.</p>}
      </div>

      <h5 className="mt-5 text-[13px] font-bold">AI activity mentioning {contact.name.split(" ")[0]}</h5>
      <div className="mt-2 flex flex-col gap-2">
        {contact.proposals.map((p, i) => (
          <div key={i} className="flex items-start gap-2.5 rounded-xl border border-line px-3 py-2.5">
            <span className="min-w-0 flex-1 text-[12.5px] leading-snug font-medium text-ink2">{p.title}</span>
            <span className="shrink-0 rounded-full bg-canvas px-2 py-[1px] text-[10.5px] font-bold text-muted capitalize">{p.status}</span>
            <span className="shrink-0 text-[11px] text-faint">{p.when}</span>
          </div>
        ))}
        {contact.proposals.length === 0 && <p className="text-[12.5px] text-muted">No AI suggestions mention this contact yet.</p>}
      </div>
    </div>
  );
}

/* ================= create modal ================= */

function CreateModal({
  kind,
  stages,
  onClose,
  onCreated,
}: {
  kind: "deal" | "contact" | "account";
  stages: string[];
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [busy, start] = useTransition();
  const [error, setError] = useState("");
  const [f, setF] = useState({ name: "", company: "", email: "", title: "", industry: "", amount: "", stage: "New", closeDate: "" });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((prev) => ({ ...prev, [k]: e.target.value }));

  const submit = () =>
    start(async () => {
      const r =
        kind === "deal"
          ? await createDealAction({ name: f.name, company: f.company, amount: f.amount, stage: f.stage, closeDate: f.closeDate })
          : kind === "contact"
            ? await createContactAction({ name: f.name, email: f.email, title: f.title, company: f.company })
            : await createAccountAction({ name: f.name, industry: f.industry });
      if (r.ok && "id" in r && r.id) onCreated(r.id);
      else setError(("error" in r && r.error) || "Could not save");
    });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#16161d]/40 p-4" onClick={onClose}>
      <div className="card w-[420px] p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-[16px] font-extrabold tracking-tight">
            {kind === "deal" ? "New Deal" : kind === "contact" ? "New Contact" : "New Account"}
          </h3>
          <button onClick={onClose} className="text-faint hover:text-ink" aria-label="Close">
            <I n="x" size={16} />
          </button>
        </div>
        <div className="mt-4 flex flex-col gap-3">
          <label className="text-[12.5px] font-medium text-ink2">
            {kind === "account" ? "Company name" : "Name"} *
            <input className={`${inputCls} mt-1`} value={f.name} onChange={set("name")} placeholder={kind === "deal" ? "e.g. Acme expansion" : kind === "account" ? "e.g. Acme Corp" : "e.g. Jane Cooper"} />
          </label>
          {kind === "deal" && (
            <>
              <label className="text-[12.5px] font-medium text-ink2">
                Company
                <input className={`${inputCls} mt-1`} value={f.company} onChange={set("company")} placeholder="e.g. Acme Corp" />
              </label>
              <span className="flex gap-3">
                <label className="flex-1 text-[12.5px] font-medium text-ink2">
                  Amount (USD)
                  <input className={`${inputCls} mt-1`} type="number" min="0" value={f.amount} onChange={set("amount")} placeholder="50000" />
                </label>
                <label className="flex-1 text-[12.5px] font-medium text-ink2">
                  Stage
                  <select className={`${inputCls} mt-1`} value={f.stage} onChange={set("stage")}>
                    {stages.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </label>
              </span>
              <label className="text-[12.5px] font-medium text-ink2">
                Close date
                <input className={`${inputCls} mt-1`} type="date" value={f.closeDate} onChange={set("closeDate")} />
              </label>
            </>
          )}
          {kind === "contact" && (
            <>
              <label className="text-[12.5px] font-medium text-ink2">
                Email
                <input className={`${inputCls} mt-1`} type="email" value={f.email} onChange={set("email")} placeholder="jane@acme.com" />
              </label>
              <label className="text-[12.5px] font-medium text-ink2">
                Title
                <input className={`${inputCls} mt-1`} value={f.title} onChange={set("title")} placeholder="e.g. VP Sales" />
              </label>
              <label className="text-[12.5px] font-medium text-ink2">
                Company
                <input className={`${inputCls} mt-1`} value={f.company} onChange={set("company")} placeholder="e.g. Acme Corp" />
              </label>
            </>
          )}
          {kind === "account" && (
            <label className="text-[12.5px] font-medium text-ink2">
              Industry
              <input className={`${inputCls} mt-1`} value={f.industry} onChange={set("industry")} placeholder="e.g. Software" />
            </label>
          )}
          {error && <p className="rounded-lg bg-[#fdecec] px-3 py-2 text-[12.5px] font-medium text-red">{error}</p>}
          <span className="mt-1 flex justify-end gap-2">
            <button onClick={onClose} className="btn-outline px-3.5 py-[8px] text-[13px] font-semibold">
              Cancel
            </button>
            <button onClick={submit} disabled={busy} className="btn-violet px-3.5 py-[8px] text-[13px] font-semibold disabled:opacity-60">
              {busy ? "Saving…" : kind === "deal" ? "Create deal" : kind === "contact" ? "Create contact" : "Create account"}
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}
