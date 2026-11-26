import { daysSilent, money } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getMyWorkspace, requireUser } from "@/lib/session";

const STAGES = ["New", "Contacted", "Meeting booked", "Proposal sent", "Negotiation", "Won"];

const FLAG_LABEL: Record<string, { label: string; style: string }> = {
  going_cold: { label: "Going cold", style: "bg-red-50 text-red-700 ring-red-600/15" },
  no_reply: { label: "No reply yet", style: "bg-amber-50 text-amber-700 ring-amber-600/15" },
  promise_due: { label: "Promise due", style: "bg-lime-100 text-lime-800 ring-lime-600/20" },
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
        <h1 className="text-[26px] font-extrabold tracking-tight text-stone-900 sm:text-[30px]">
          Pipeline
        </h1>
        <p className="mt-1 text-[15px] text-stone-500">
          {deals.length} deals · {money(total)} open. Synced from your CRM; flags are the
          AI&apos;s.
        </p>
      </header>

      {deals.length === 0 ? (
        <div className="card flex flex-col items-center px-5 py-10 text-center">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-lime-100 text-lime-800">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="7.5" width="18" height="12" rx="2.5" />
              <path d="M9 7.5V6.2A2.2 2.2 0 0 1 11.2 4h1.6A2.2 2.2 0 0 1 15 6.2v1.3" />
              <path d="M3 12.8h18" />
            </svg>
          </span>
          <p className="mt-3 max-w-sm text-[14.5px] leading-relaxed text-stone-500">
            No deals yet. Once HubSpot is connected, your pipeline appears here — kept in sync
            automatically.
          </p>
        </div>
      ) : (
        <div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {STAGES.map((stage) => {
              const inStage = deals.filter((d) => d.stage === stage);
              const sum = inStage.reduce((s, d) => s + (d.amount ?? 0), 0);
              return (
                <section key={stage} className="card p-5">
                  <div className="flex items-center gap-2">
                    <h2 className="text-[13px] font-bold uppercase tracking-wide text-stone-500">
                      {stage}
                    </h2>
                    <span className="tnum rounded-full bg-lime px-2 py-0.5 text-[11.5px] font-bold leading-none text-stone-900">
                      {inStage.length}
                    </span>
                    <span className="tnum ml-auto text-[13px] font-semibold text-stone-400">
                      {money(sum)}
                    </span>
                  </div>
                  <ul className="mt-3 space-y-2.5">
                    {inStage.map((deal) => {
                      const flag = deal.healthFlag ? FLAG_LABEL[deal.healthFlag] : null;
                      const silent = daysSilent(deal.lastActivityAt);
                      return (
                        <li
                          key={deal.id}
                          className="rounded-xl border border-line-soft bg-warm px-3.5 py-3 transition duration-200 hover:border-line hover:bg-white hover:shadow-[0_8px_18px_-12px_rgba(74,70,52,0.3)]"
                        >
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="truncate text-[14.5px] font-bold tracking-[-0.01em] text-stone-900">
                              {deal.company ?? deal.name}
                            </p>
                            <p className="tnum shrink-0 text-[14.5px] font-extrabold text-stone-900">
                              {money(deal.amount, deal.currency)}
                            </p>
                          </div>
                          <p className="tnum mt-0.5 truncate text-[13px] text-stone-500">
                            {deal.name}
                            {deal.ownerName ? ` · ${deal.ownerName}` : ""}
                            {silent != null && silent > 0 ? ` · ${silent}d silent` : ""}
                          </p>
                          {flag && (
                            <span
                              className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-[11.5px] font-bold ring-1 ring-inset ${flag.style}`}
                            >
                              {flag.label}
                            </span>
                          )}
                        </li>
                      );
                    })}
                    {inStage.length === 0 && (
                      <li className="py-2 text-[13.5px] text-stone-400">No deals here.</li>
                    )}
                  </ul>
                </section>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
