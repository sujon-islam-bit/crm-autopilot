import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { requireWorkspace } from "../../../lib/session";
import { prisma } from "../../../lib/db";
import { computeHygiene, type HygieneItem } from "../../../lib/hygiene";
import { Donut } from "../../../components/charts";
import { ProposeFixButton } from "../../../components/buttons";

async function Inner() {
  await connection();
  const { workspace } = await requireWorkspace();
  const h = await computeHygiene(workspace.id);
  const dealById = new Map(
    (await prisma.crmDeal.findMany({ where: { workspaceId: workspace.id } })).map((d) => [d.id, d]),
  );

  const sections: { kind: HygieneItem["kind"]; title: string; items: HygieneItem[]; color: string }[] = [
    { kind: "duplicate", title: "Duplicates", items: h.duplicates, color: "#22b573" },
    { kind: "missing", title: "Missing Fields", items: h.missing, color: "#f5a623" },
    { kind: "unlogged", title: "Unlogged Meetings", items: h.unlogged, color: "#2b6bf0" },
    { kind: "stale", title: "Stale Deals", items: h.stale, color: "#8b5cf6" },
  ];

  return (
    <div className="px-7 pt-5 pb-7">
      <h1 className="text-[24px] font-extrabold tracking-tight">Data Cleanup</h1>
      <p className="mt-1 text-[13.5px] text-muted">
        What is messy in the CRM right now. Propose a fix and it lands in Approvals for approval.
      </p>

      <div className="card mt-5 flex items-center gap-8 p-5">
        <Donut
          score={h.score}
          segments={sections.map((s) => ({ color: s.color, value: s.items.length }))}
        />
        <div>
          <div className="text-[15px] font-bold">Data Health — {h.score === null ? "—" : `${h.score}/100`}</div>
          <p className="mt-1 max-w-[520px] text-[13px] leading-relaxed text-muted">
            {h.counts.duplicates + h.counts.missing + h.counts.unlogged + h.counts.stale} things to clean up across
            duplicates, missing fields, unlogged meetings and stale deals. Fixing them keeps the AI&apos;s proposals
            accurate.
          </p>
          <Link href="/dashboard" className="mt-2 inline-block text-[13px] font-semibold">
            Back to Dashboard →
          </Link>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4">
        {sections.map((s) => (
          <div key={s.kind} className="card overflow-hidden">
            <div className="flex items-center gap-2.5 border-b border-line/70 px-5 py-3.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
              <h2 className="flex-1 text-[14.5px] font-bold">{s.title}</h2>
              <span className="rounded-full bg-canvas px-2.5 py-0.5 text-[12px] font-bold text-ink2">{s.items.length}</span>
            </div>
            <div className="max-h-[300px] divide-y divide-line/60 overflow-y-auto">
              {s.items.slice(0, 12).map((item, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium">{item.label}</div>
                    <div className="truncate text-[11.5px] text-muted">{item.detail}</div>
                  </div>
                  <ProposeFixButton
                    kind={s.kind}
                    label={item.label}
                    dealExternalId={item.dealId ? (dealById.get(item.dealId)?.externalId ?? null) : null}
                  />
                </div>
              ))}
              {s.items.length > 12 && (
                <p className="px-5 py-2.5 text-[12px] text-muted">…and {s.items.length - 12} more</p>
              )}
              {s.items.length === 0 && <p className="px-5 py-4 text-[13px] text-muted">All clean here.</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HygienePage() {
  return (
    <Suspense fallback={<div className="px-7 pt-6 text-sm text-muted">Loading…</div>}>
      <Inner />
    </Suspense>
  );
}
