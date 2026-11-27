import { Suspense } from "react";
import { connection } from "next/server";
import { requireWorkspace } from "../../../lib/session";
import { getDealsData } from "../../../lib/deals";
import { STAGES } from "../../../lib/constants";
import { can, normalizeRole } from "../../../lib/permissions";
import DealsClient from "./DealsClient";

export const metadata = { title: "Deals & Contacts · Vouchso" };

async function Inner({ tab }: { tab?: string }) {
  await connection();
  const { workspace, user, role } = await requireWorkspace();
  const isRep = normalizeRole(role) === "rep";
  const data = await getDealsData(workspace.id, isRep ? (user.name ?? "") : undefined);
  return (
    <DealsClient
      data={data}
      stages={[...STAGES, "Lost"]}
      canWrite={can(role, "deals.write")}
      scopedToOwn={isRep}
      initialTab={tab === "atrisk" ? "atrisk" : "deals"}
    />
  );
}

export default function DealsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  return (
    <Suspense fallback={<div className="px-7 pt-6 text-sm text-muted">Loading…</div>}>
      <InnerWithParams searchParams={searchParams} />
    </Suspense>
  );
}

async function InnerWithParams({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const sp = await searchParams;
  return <Inner tab={sp.tab} />;
}
