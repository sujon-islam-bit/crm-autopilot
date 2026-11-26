import { timeAgo } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getMyWorkspace, requireUser } from "@/lib/session";

const ACTION_STYLE: Record<string, string> = {
  proposed: "bg-brand-soft text-brand",
  applied: "bg-emerald-50 text-emerald-700",
  approved: "bg-emerald-50 text-emerald-700",
  rejected: "bg-neutral-100 text-neutral-500",
  undone: "bg-amber-50 text-amber-700",
  failed: "bg-red-50 text-red-700",
  connected: "bg-neutral-100 text-neutral-600",
};

/**
 * Activity — the full audit trail. Every proposal, approval, applied
 * change and undo, in order. This is how a team trusts the AI: nothing
 * it does is ever hidden.
 */
export default async function ActivityPage() {
  const user = await requireUser();
  const mine = await getMyWorkspace(user.id);
  if (!mine) return null;

  const events = await prisma.auditEvent.findMany({
    where: { workspaceId: mine.workspace.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[26px] font-extrabold tracking-tight text-neutral-900 sm:text-[30px]">
          Activity
        </h1>
        <p className="mt-1 text-[15px] text-neutral-500">
          Everything the AI proposed, your team approved, and what was applied or undone — in
          order.
        </p>
      </header>

      {events.length === 0 ? (
        <p className="rounded-2xl border border-neutral-200 bg-white p-5 text-[14.5px] text-neutral-500">
          No activity yet. The moment the AI or your team does anything, it is recorded here.
        </p>
      ) : (
        <ul className="divide-y divide-neutral-100 rounded-2xl border border-neutral-200 bg-white shadow-[0_6px_20px_rgba(30,40,60,0.04)]">
          {events.map((event) => (
            <li key={event.id} className="flex items-baseline gap-3 px-5 py-3.5">
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11.5px] font-bold capitalize ${ACTION_STYLE[event.action] ?? "bg-neutral-100 text-neutral-500"}`}
              >
                {event.action}
              </span>
              <span className="min-w-0 flex-1 text-[14.5px] text-neutral-700">{event.summary}</span>
              <span className="shrink-0 text-xs text-neutral-400">{timeAgo(event.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
