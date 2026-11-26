"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { I } from "../../../components/icons";
import { PulseChart } from "../../../components/charts";
import DealDrawer from "../../../components/DealDrawer";
import type { DealView } from "../../../lib/view";
import { money, moneyShort } from "../../../lib/constants";
import { healthChipClass } from "../../../lib/health";

export default function PipelineClient({
  stages,
  deals,
  pulse,
  pulseNow,
  pulseDelta,
  openTotalLabel,
  openCount,
  connected,
}: {
  stages: readonly string[];
  deals: DealView[];
  pulse: { label: string; thisWeek: number; lastWeek: number }[];
  pulseNow: number;
  pulseDelta: number;
  openTotalLabel: string;
  openCount: number;
  connected: boolean;
}) {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<DealView | null>(null);
  const needle = q.trim().toLowerCase();
  const visible = useMemo(
    () =>
      needle
        ? deals.filter(
            (d) => d.name.toLowerCase().includes(needle) || (d.company ?? "").toLowerCase().includes(needle),
          )
        : deals,
    [deals, needle],
  );
  const visibleIds = useMemo(() => new Set(visible.map((d) => d.id)), [visible]);

  return (
    <div className="px-7 pt-5 pb-7">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-extrabold tracking-tight">Pipeline</h1>
          <p className="mt-1 text-[13.5px] text-muted">
            {openTotalLabel} open · {openCount} {openCount === 1 ? "deal" : "deals"}
          </p>
        </div>
        <div className="flex w-[280px] items-center gap-2.5 rounded-full border border-line bg-white py-2.5 pr-3 pl-4 shadow-[0_1px_2px_rgba(23,23,40,0.05)]">
          <I n="search" size={15} className="shrink-0 text-faint" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search deals or companies…"
            aria-label="Search deals"
            className="min-w-0 flex-1 border-0 bg-transparent text-[13px] text-ink placeholder:text-faint"
            style={{ boxShadow: "none" }}
          />
          {q && (
            <button onClick={() => setQ("")} className="shrink-0 text-faint hover:text-ink" aria-label="Clear search">
              <I n="x" size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Connect CTA — same pattern as the dashboard, until a CRM is connected */}
      {!connected && (
        <div className="card mt-5 flex items-center gap-4 px-5 py-4">
          <span className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[12px] bg-primary text-white">
            <I n="plug" size={20} sw={2} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-bold">Connect your CRM</div>
            <p className="mt-0.5 text-[13px] text-muted">
              Connect HubSpot or Salesforce and CleanPipe will start reading your pipeline and preparing updates for
              your approval.
            </p>
          </div>
          <Link href="/connections" className="btn-primary shrink-0 px-4 py-2.5 text-[13.5px]">
            Connect your CRM
          </Link>
        </div>
      )}

      {/* Pipeline Pulse — the dashboard card, full width */}
      <div className="card mt-5 p-5">
        <div className="flex items-center gap-2">
          <I n="chart" size={16} className="text-primary" />
          <h2 className="flex-1 text-[15px] font-bold">Pipeline Pulse</h2>
          <div className="flex items-center gap-3.5 text-[11.5px] text-ink2">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary" /> This Week
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#c3cdf5]" /> Last Week
            </span>
          </div>
        </div>
        <div className="mt-3 flex items-start gap-2.5">
          <span className="text-[27px] leading-none font-extrabold tracking-tight">{moneyShort(pulseNow)}</span>
          {pulseNow > 0 ? (
            <span className="leading-tight">
              <span className="block text-[12.5px] font-bold text-green">↑ +{pulseDelta}%</span>
              <span className="block text-[10.5px] text-muted">vs last week</span>
            </span>
          ) : (
            <span className="pt-1 text-[12.5px] font-medium text-muted">No data yet</span>
          )}
        </div>
        <div className="mt-1">
          <PulseChart points={pulse} nowLabel={moneyShort(pulseNow)} />
        </div>
      </div>

      {/* Board */}
      <div className="mt-5 grid grid-cols-7 items-start gap-3">
        {stages.map((stage) => {
          const rows = deals.filter((d) => d.stage === stage);
          const shown = rows.filter((d) => visibleIds.has(d.id));
          const total = rows.reduce((s, d) => s + (d.amount ?? 0), 0);
          return (
            <div key={stage} className="min-w-0">
              <div className="mb-2 px-0.5">
                <div className="flex items-start justify-between gap-1">
                  <span className="text-[12.5px] leading-snug font-bold text-ink2">{stage}</span>
                  <span className="shrink-0 rounded-full bg-[#eef0f7] px-1.5 py-0.5 text-[10.5px] font-bold text-muted">
                    {rows.length}
                  </span>
                </div>
                <div className="mt-0.5 text-[11.5px] font-semibold text-muted">{moneyShort(total)}</div>
              </div>
              <div className="flex flex-col gap-2">
                {shown.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setSelected(d)}
                    className="card w-full p-3 text-left transition hover:border-[#cfd2e0]"
                  >
                    <div className="text-[12.5px] leading-snug font-semibold">{d.name}</div>
                    {d.company && d.company !== d.name && (
                      <div className="mt-0.5 text-[11px] leading-snug text-muted">{d.company}</div>
                    )}
                    <div className="mt-1.5 text-[13px] font-bold">{money(d.amount)}</div>
                    <div className="mt-1 text-[10.5px] text-faint">Last activity {d.lastActivityLabel}</div>
                    {d.health && (
                      <span
                        className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9.5px] font-bold ${healthChipClass(d.health.flag)}`}
                      >
                        <I n="alert" size={9} sw={2.6} />
                        {d.health.label}
                      </span>
                    )}
                  </button>
                ))}
                {rows.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-line px-3 py-4 text-center text-[11px] text-faint">
                    No deals
                  </div>
                )}
                {rows.length > 0 && shown.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-line px-3 py-4 text-center text-[11px] text-faint">
                    No matches
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {needle && visible.length === 0 && (
        <p className="mt-5 text-[13px] text-muted">No deals match “{q.trim()}”.</p>
      )}

      {selected && (
        <div className="fixed inset-0 z-30">
          <DealDrawer deal={selected} onClose={() => setSelected(null)} />
        </div>
      )}
    </div>
  );
}
