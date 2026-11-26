import { daysSilent, money } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getMyWorkspace, requireUser } from "@/lib/session";

const STAGES = ["New", "Contacted", "Meeting booked", "Proposal sent", "Negotiation", "Won"];

const FLAG_LABEL: Record<string, { label: string; style: string }> = {
  going_cold: { label: "Going cold", style: "bg-red-50 text-red-700" },
  no_reply: { label: "No reply yet", style: "bg-amber-50 text-amber-700" },
  promise_due: { label: "Promise due", style: "bg-brand-soft text-brand" },
};

/**
 * Pipeline — the mirrored deals as a board, grouped by stage, with the
 * AI's health flags on the cards that need a human.
 */
export default async function PipelinePage() {
  const user = await requireUser();
  const mine = await getMyWorkspace(user.id);
  if (!mine) return null;

  const deals = await prisma.crmDeal.findMany({
    where: { workspaceId: mine.workspace.id },
    orderBy: { amount: "desc" },
  });
  const total = deals.filter((d) => d.stage !== "Won").reduce((s, d) => s + (d.amount ?? 0), 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[26px] font-extrabold tracking-tight text-neutral-900 sm:text-[30px]">
          Pipeline
        </h1>
        <p className="mt-1 text-[15px] text-neutral-500">
          {deals.length} deals · {money(total)} open. Synced from your CRM; flags are the
          AI&apos;s.
        </p>
      </header>

      {deals.length === 0 ? (
        <p className="rounded-2xl border border-neutral-200 bg-white p-5 text-[14.5px] text-neutral-500">
          No deals yet. Once HubSpot is connected, your pipeline appears here — kept in sync
          automatically.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {STAGES.map((stage) => {
            const inStage = deals.filter((d) => d.stage === stage);
            const sum = inStage.reduce((s, d) => s + (d.amount ?? 0), 0);
            return (
              <section
                key={stage}
                className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-[0_6px_20px_rgba(30,40,60,0.04)]"
              >
                <div className="flex items-baseline justify-between">
                  <h2 className="text-[13px] font-bold uppercase tracking-wide text-neutral-500">
                    {stage}
                  </h2>
                  <span className="text-[13px] font-semibold text-neutral-400">
                    {inStage.length} · {money(sum)}
                  </span>
                </div>
                <ul className="mt-3 space-y-2.5">
                  {inStage.map((deal) => {
                    const flag = deal.healthFlag ? FLAG_LABEL[deal.healthFlag] : null;
                    const silent = daysSilent(deal.lastActivityAt);
                    return (
                      <li key={deal.id} className="rounded-xl bg-neutral-50 px-3.5 py-3">
                        <p className="truncate text-[14.5px] font-bold text-neutral-900">
                          {deal.company ?? deal.name}
                        </p>
                        <p className="truncate text-[13px] text-neutral-500">
                          {deal.name} · {money(deal.amount, deal.currency)}
                          {deal.ownerName ? ` · ${deal.ownerName}` : ""}
                          {silent != null && silent > 0 ? ` · ${silent}d silent` : ""}
                        </p>
                        {flag && (
                          <span
                            className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-[11.5px] font-bold ${flag.style}`}
                          >
                            {flag.label}
                          </span>
                        )}
                      </li>
                    );
                  })}
                  {inStage.length === 0 && (
                    <li className="py-2 text-[13.5px] text-neutral-400">No deals here.</li>
                  )}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
