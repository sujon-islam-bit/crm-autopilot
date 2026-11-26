import { Suspense } from "react";
import { connection } from "next/server";
import { requireWorkspace } from "../../../lib/session";
import { prisma } from "../../../lib/db";
import { STAGES, money, moneyShort, startOfWeek } from "../../../lib/constants";
import { I } from "../../../components/icons";

async function Inner() {
  await connection();
  const { workspace } = await requireWorkspace();
  const deals = await prisma.crmDeal.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { amount: "desc" },
  });
  const weekStart = startOfWeek();
  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const open = deals.filter((d) => d.stage !== "Won");
  const cum = (upto: Date, from?: Date) =>
    open
      .filter((d) => d.createdAt <= upto && (!from || d.createdAt >= from))
      .reduce((s, d) => s + (d.amount ?? 0), 0);
  const endThis = cum(new Date());
  const endLast = cum(lastWeekStart);
  const addedThis = cum(new Date(), weekStart);
  const delta = endLast > 0 ? Math.round(((endThis - endLast) / endLast) * 100) : 0;

  return (
    <div className="px-7 pt-5 pb-7">
      <h1 className="text-[24px] font-extrabold tracking-tight">Pipeline</h1>
      <p className="mt-1 text-[13.5px] text-muted">Your board by stage — and how this week stacks up against last week.</p>

      <div className="card mt-5 flex flex-wrap items-center gap-x-10 gap-y-3 px-5 py-4">
        <div>
          <div className="text-[11.5px] font-medium tracking-wide text-muted uppercase">Open pipeline</div>
          <div className="text-[22px] font-extrabold">{moneyShort(endThis)}</div>
        </div>
        <div>
          <div className="text-[11.5px] font-medium tracking-wide text-muted uppercase">vs last week</div>
          <div className="text-[22px] font-extrabold text-green">↑ +{delta}%</div>
        </div>
        <div>
          <div className="text-[11.5px] font-medium tracking-wide text-muted uppercase">Added this week</div>
          <div className="text-[22px] font-extrabold text-green">+{moneyShort(addedThis)}</div>
        </div>
        <div>
          <div className="text-[11.5px] font-medium tracking-wide text-muted uppercase">Open deals</div>
          <div className="text-[22px] font-extrabold">{open.length}</div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-7 gap-3">
        {STAGES.map((stage) => {
          const rows = deals.filter((d) => d.stage === stage);
          const total = rows.reduce((s, d) => s + (d.amount ?? 0), 0);
          return (
            <div key={stage} className="min-w-0">
              <div className="mb-2 flex items-baseline justify-between gap-1 px-0.5">
                <span className="truncate text-[12px] font-bold text-ink2">{stage}</span>
                <span className="text-[11px] font-semibold text-muted">{moneyShort(total)}</span>
              </div>
              <div className="flex flex-col gap-2">
                {rows.map((d) => (
                  <div key={d.id} className="card p-3">
                    <div className="truncate text-[12.5px] font-semibold">{d.name}</div>
                    <div className="mt-0.5 truncate text-[11px] text-muted">{d.company ?? "—"}</div>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="text-[12.5px] font-bold">{money(d.amount)}</span>
                      {d.healthFlag && (
                        <span className="flex items-center gap-1 rounded-full bg-amber-tint px-1.5 py-0.5 text-[9.5px] font-bold text-amber">
                          <I n="alert" size={9} sw={2.6} />
                          {d.healthFlag === "going_cold" ? "Going cold" : d.healthFlag === "promise_due" ? "Promise due" : "No reply"}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {rows.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-line px-3 py-4 text-center text-[11px] text-faint">
                    No deals
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function PipelinePage() {
  return (
    <Suspense fallback={<div className="px-7 pt-6 text-sm text-muted">Loading…</div>}>
      <Inner />
    </Suspense>
  );
}
