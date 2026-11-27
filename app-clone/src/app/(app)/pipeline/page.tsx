import { Suspense } from "react";
import { connection } from "next/server";
import { requireWorkspace } from "@/lib/session";
import { getPipelineData, resolvePeriod } from "@/lib/pipeline";
import PipelineClient from "./PipelineClient";

export const metadata = { title: "Pipeline · Vouchso" };

async function Inner({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  await connection();
  const sp = await searchParams;
  const { workspace } = await requireWorkspace();
  const period = resolvePeriod(sp);
  const data = await getPipelineData(workspace.id, period);
  return (
    <PipelineClient
      period={{ key: period.key, days: period.days, startISO: period.start.toISOString(), endISO: period.end.toISOString() }}
      kpis={data.kpis}
      movement={data.movement}
      insights={data.insights}
      tabCounts={data.tabCounts}
      rows={data.rows}
      owners={data.owners}
      hasConnection={data.hasConnection}
    />
  );
}

export default function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  return (
    <Suspense>
      <Inner searchParams={searchParams} />
    </Suspense>
  );
}
