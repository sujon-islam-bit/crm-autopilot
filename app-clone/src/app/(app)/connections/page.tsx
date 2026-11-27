import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { requireWorkspace } from "@/lib/session";
import { getConnectionsData } from "@/lib/connections";
import { can } from "@/lib/permissions";
import ConnectionsClient from "@/components/ConnectionsClient";

export const metadata = { title: "Connections · Vouchso" };

async function ConnectionsInner() {
  await connection();
  const { workspace, role } = await requireWorkspace();
  // Page visibility: Connections is Owner/Admin only — everyone else is
  // bounced to the dashboard server-side (the sidebar hides it too).
  if (!can(role, "pages.connections")) redirect("/dashboard");
  const data = await getConnectionsData(workspace.id);
  return <ConnectionsClient data={data} canManage={can(role, "connections.write")} />;
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
