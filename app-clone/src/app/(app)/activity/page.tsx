import { Suspense } from "react";
import { connection } from "next/server";
import { requireWorkspace } from "../../../lib/session";
import { prisma } from "../../../lib/db";
import { timeAgo } from "../../../lib/constants";
import { UndoButton } from "../../../components/buttons";
import { I } from "../../../components/icons";

const ACTION_STYLE: Record<string, string> = {
  applied: "bg-green-tint text-green",
  approved: "bg-green-tint text-green",
  proposed: "bg-primary-tint text-primary",
  rejected: "bg-[#fdecec] text-red",
  undone: "bg-amber-tint text-amber",
  failed: "bg-[#fdecec] text-red",
  connected: "bg-green-tint text-green",
  disconnected: "bg-canvas text-muted",
  captured: "bg-canvas text-muted",
  synced: "bg-canvas text-muted",
};

async function Inner() {
  await connection();
  const { workspace } = await requireWorkspace();
  const [events, connections, applied] = await Promise.all([
    prisma.auditEvent.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "desc" },
      take: 60,
    }),
    prisma.connection.findMany({ where: { workspaceId: workspace.id } }),
    prisma.proposal.findMany({
      where: { workspaceId: workspace.id, status: "applied" },
      orderBy: { appliedAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <div className="px-7 pt-5 pb-7">
      <h1 className="text-[24px] font-extrabold tracking-tight">History</h1>
      <p className="mt-1 text-[13.5px] text-muted">
        The full record of what the AI proposed, what you approved, and what was applied. Every applied change can be
        rolled back.
      </p>

      <div className="mt-5 grid grid-cols-3 gap-4">
        {["hubspot", "salesforce", "google", "outlook", "signudoc"].map((p) => {
          const c = connections.find((x) => x.provider === p);
          return (
            <div key={p} className="card flex items-center gap-3 px-4 py-3.5">
              <span className={`h-2.5 w-2.5 rounded-full ${c ? "bg-green-bright" : "bg-[#d4d6e2]"}`} />
              <div className="flex-1 leading-tight">
                <div className="text-[13px] font-semibold capitalize">{p === "signudoc" ? "SignuDoc" : p}</div>
                <div className="text-[11.5px] text-muted">
                  {c ? `Connected${c.lastSyncAt ? ` · synced ${timeAgo(c.lastSyncAt)}` : ""}` : "Not connected"}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {applied.length > 0 && (
        <>
          <h2 className="mt-7 mb-3 flex items-center gap-2 text-[15px] font-bold">
            <I n="sync" size={15} className="text-primary" /> Applied changes — rollback
          </h2>
          <div className="card divide-y divide-line/60 overflow-hidden">
            {applied.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-medium">{p.title}</div>
                  <div className="text-[11.5px] text-muted">Applied {p.appliedAt ? timeAgo(p.appliedAt) : ""}</div>
                </div>
                <UndoButton id={p.id} />
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="mt-7 mb-3 text-[15px] font-bold">Activity</h2>
      <div className="card divide-y divide-line/60 overflow-hidden">
        {events.map((e) => (
          <div key={e.id} className="flex items-center gap-3.5 px-5 py-3">
            <span
              className={`inline-flex w-[86px] shrink-0 items-center justify-center rounded-full px-2 py-[3px] text-[11px] font-bold capitalize ${ACTION_STYLE[e.action] ?? "bg-canvas text-muted"}`}
            >
              {e.action}
            </span>
            <div className="min-w-0 flex-1 truncate text-[13.5px]">{e.summary}</div>
            <span className="shrink-0 text-[12px] text-faint">{timeAgo(e.createdAt)}</span>
          </div>
        ))}
        {events.length === 0 && <p className="px-5 py-6 text-[13.5px] text-muted">No activity yet.</p>}
      </div>
    </div>
  );
}

export default function ActivityPage() {
  return (
    <Suspense fallback={<div className="px-7 pt-6 text-sm text-muted">Loading…</div>}>
      <Inner />
    </Suspense>
  );
}
