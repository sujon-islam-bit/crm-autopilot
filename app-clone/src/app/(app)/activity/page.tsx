import { Suspense } from "react";
import { connection } from "next/server";
import { requireWorkspace } from "@/lib/session";
import { getHistoryData } from "@/lib/history";
import HistoryClient from "@/components/HistoryClient";

async function HistoryInner({ period }: { period: number }) {
  await connection();
  const { workspace } = await requireWorkspace();
  const data = await getHistoryData(workspace.id);
  return <HistoryClient data={data} period={period} />;
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const sp = await searchParams;
  const period = sp.period === "7" ? 7 : sp.period === "90" ? 90 : 30;
  return (
    <Suspense
      fallback={<div className="animate-pulse text-[13px] text-[#8a8fa3]">Loading history…</div>}
    >
      <HistoryInner period={period} />
    </Suspense>
  );
}
