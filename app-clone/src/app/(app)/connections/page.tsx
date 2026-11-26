import { Suspense } from "react";
import { connection } from "next/server";
import { requireWorkspace } from "@/lib/session";
import { getConnectionsData } from "@/lib/connections";
import ConnectionsClient from "@/components/ConnectionsClient";

async function ConnectionsInner() {
  await connection();
  const { workspace } = await requireWorkspace();
  const data = await getConnectionsData(workspace.id);
  return <ConnectionsClient data={data} />;
}

export default function ConnectionsPage() {
  return (
    <Suspense
      fallback={<div className="animate-pulse px-7 pt-5 text-[13px] text-[#8a8fa3]">Loading connections…</div>}
    >
      <ConnectionsInner />
    </Suspense>
  );
}
