import { timeAgo } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getMyWorkspace, requireUser } from "@/lib/session";

const ACTION_STYLE: Record<string, string> = {
  proposed: "bg-brand-soft text-brand ring-brand/20",
  applied: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  approved: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  rejected: "bg-neutral-100 text-neutral-500 ring-neutral-500/10",
  undone: "bg-amber-50 text-amber-700 ring-amber-600/15",
  failed: "bg-red-50 text-red-700 ring-red-600/15",
  connected: "bg-neutral-100 text-neutral-600 ring-neutral-500/10",
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
        <div className="card flex flex-col items-center px-5 py-10 text-center">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-soft text-brand">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12h4l2.5-6.5 4 13L16 12h5" />
            </svg>
          </span>
          <p className="mt-3 max-w-sm text-[14.5px] leading-relaxed text-neutral-500">
            No activity yet. The moment the AI or your team does anything, it is recorded here.
          </p>
        </div>
      ) : (
        <ul className="card divide-y divide-line-soft overflow-hidden">
          {events.map((event) => (
            <li
              key={event.id}
              className="flex items-baseline gap-3 px-5 py-3.5 transition duration-200 hover:bg-canvas"
            >
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11.5px] font-bold capitalize ring-1 ring-inset ${ACTION_STYLE[event.action] ?? "bg-neutral-100 text-neutral-500 ring-neutral-500/10"}`}
              >
                {event.action}
              </span>
              <span className="min-w-0 flex-1 text-[14.5px] text-neutral-700">{event.summary}</span>
              <span className="tnum shrink-0 text-xs text-neutral-400">{timeAgo(event.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
