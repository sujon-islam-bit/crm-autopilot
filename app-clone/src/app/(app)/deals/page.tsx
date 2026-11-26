import { Suspense } from "react";
import { connection } from "next/server";
import { requireWorkspace } from "../../../lib/session";
import { prisma } from "../../../lib/db";
import { money, fmtDate } from "../../../lib/constants";
import { SignatureButton } from "../../../components/buttons";
import DealsSearch from "./DealsSearch";

async function Inner({ q }: { q: string }) {
  await connection();
  const { workspace } = await requireWorkspace();
  const needle = q.trim().toLowerCase();
  const [dealsAll, contacts, signatures] = await Promise.all([
    prisma.crmDeal.findMany({ where: { workspaceId: workspace.id }, orderBy: { amount: "desc" } }),
    prisma.crmContact.findMany({ where: { workspaceId: workspace.id }, orderBy: { name: "asc" }, take: 60 }),
    prisma.signatureRequest.findMany({ where: { workspaceId: workspace.id } }),
  ]);
  const deals = needle
    ? dealsAll.filter(
        (d) => d.name.toLowerCase().includes(needle) || (d.company ?? "").toLowerCase().includes(needle),
      )
    : dealsAll;
  const sigByDeal = new Map(signatures.map((s) => [s.dealExternalId, s.status]));

  return (
    <div className="px-7 pt-5 pb-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-extrabold tracking-tight">Deals &amp; Contacts</h1>
          <p className="mt-1 text-[13.5px] text-muted">Every deal and contact in the mirror — kept in sync with your CRM.</p>
        </div>
        <DealsSearch initial={q} />
      </div>

      <div className="card mt-5 overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-line bg-[#fafaff] text-left text-[11.5px] tracking-wide text-muted uppercase">
              <th className="px-5 py-3 font-semibold">Deal</th>
              <th className="px-5 py-3 font-semibold">Company</th>
              <th className="px-5 py-3 font-semibold">Stage</th>
              <th className="px-5 py-3 font-semibold">Amount</th>
              <th className="px-5 py-3 font-semibold">Close date</th>
              <th className="px-5 py-3 font-semibold">Health</th>
              <th className="px-5 py-3 font-semibold">Signature</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/60">
            {deals.map((d) => (
              <tr key={d.id} className="hover:bg-[#fafaff]">
                <td className="px-5 py-3 font-semibold">{d.name}</td>
                <td className="px-5 py-3 text-ink2">{d.company ?? "—"}</td>
                <td className="px-5 py-3">
                  <span className="rounded-md bg-primary-tint px-2 py-[3px] text-[11.5px] font-semibold text-primary">
                    {d.stage}
                  </span>
                </td>
                <td className="px-5 py-3 font-bold">{money(d.amount)}</td>
                <td className="px-5 py-3 text-ink2">{d.closeDate ? fmtDate(d.closeDate) : "—"}</td>
                <td className="px-5 py-3">
                  {d.healthFlag ? (
                    <span className="rounded-full bg-amber-tint px-2 py-[3px] text-[11px] font-bold text-amber">
                      {d.healthFlag === "going_cold" ? "Going cold" : d.healthFlag === "promise_due" ? "Promise due" : "No reply"}
                    </span>
                  ) : (
                    <span className="text-muted">Healthy</span>
                  )}
                </td>
                <td className="px-5 py-3">
                  {sigByDeal.has(d.externalId) ? (
                    <span className="text-[12px] font-medium text-muted capitalize">{sigByDeal.get(d.externalId)}</span>
                  ) : (
                    <SignatureButton dealExternalId={d.externalId} />
                  )}
                </td>
              </tr>
            ))}
            {deals.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-6 text-muted">
                  No deals match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 className="mt-7 mb-3 text-[15px] font-bold">Contacts</h2>
      <div className="card overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-line bg-[#fafaff] text-left text-[11.5px] tracking-wide text-muted uppercase">
              <th className="px-5 py-3 font-semibold">Name</th>
              <th className="px-5 py-3 font-semibold">Email</th>
              <th className="px-5 py-3 font-semibold">Company</th>
              <th className="px-5 py-3 font-semibold">Title</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/60">
            {contacts.map((c) => (
              <tr key={c.id} className="hover:bg-[#fafaff]">
                <td className="px-5 py-3 font-semibold">{c.name}</td>
                <td className="px-5 py-3 text-ink2">{c.email ?? "—"}</td>
                <td className="px-5 py-3 text-ink2">{c.company ?? "—"}</td>
                <td className="px-5 py-3 text-ink2">{c.title ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  return (
    <Suspense fallback={<div className="px-7 pt-6 text-sm text-muted">Loading…</div>}>
      <Inner q={q ?? ""} />
    </Suspense>
  );
}
