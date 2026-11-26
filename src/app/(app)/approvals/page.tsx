import ProposalCard, { type ProposalView } from "@/components/proposal-card";
import RunEngineButton from "@/components/run-engine-button";
import { prisma } from "@/lib/prisma";
import { getMyWorkspace, requireUser } from "@/lib/session";

/**
 * Approvals — the product's main screen. Everything the AI wants to
 * change waits here; a human decides. Decided items stay visible so
 * the team can see what was applied, rejected or undone.
 */
export default async function ApprovalsPage() {
  const user = await requireUser();
  const mine = await getMyWorkspace(user.id);
  if (!mine) return null;
  const ws = mine.workspace.id;

  const [pending, decided] = await Promise.all([
    prisma.proposal.findMany({
      where: { workspaceId: ws, status: "pending" },
      orderBy: { createdAt: "desc" },
    }),
    prisma.proposal.findMany({
      where: { workspaceId: ws, status: { not: "pending" } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const toView = (p: (typeof pending)[number]): ProposalView => ({
    id: p.id,
    type: p.type,
    title: p.title,
    reason: p.reason,
    source: p.source,
    status: p.status,
    createdAt: p.createdAt.toISOString(),
    detail: (p.detail ?? null) as ProposalView["detail"],
  });

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight text-neutral-900 sm:text-[30px]">
            Approvals
          </h1>
          <p className="mt-1 text-[15px] text-neutral-500">
            The AI proposes. You decide. Nothing reaches your CRM without a tap here.
          </p>
        </div>
        <RunEngineButton />
      </header>

      <section>
        <h2 className="mb-3 text-[15px] font-bold text-neutral-900">
          Waiting ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="rounded-2xl border border-neutral-200 bg-white p-5 text-[14.5px] text-neutral-500">
            Nothing waiting. When the AI reads a new email or meeting, its proposals land here.
          </p>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {pending.map((p) => (
              <ProposalCard key={p.id} proposal={toView(p)} />
            ))}
          </div>
        )}
      </section>

      {decided.length > 0 && (
        <section>
          <h2 className="mb-3 text-[15px] font-bold text-neutral-900">Decided</h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {decided.map((p) => (
              <ProposalCard key={p.id} proposal={toView(p)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
