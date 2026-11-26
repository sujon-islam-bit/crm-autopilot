import { Suspense } from "react";
import { connection } from "next/server";
import { requireWorkspace } from "@/lib/session";
import { getCleanupData } from "@/lib/cleanup";
import HygieneClient from "./HygieneClient";

export const metadata = { title: "Data Cleanup — CRM Autopilot" };

async function Inner({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  await connection();
  const sp = await searchParams;
  const { workspace } = await requireWorkspace();
  const periodDays = sp.period === "7" ? 7 : sp.period === "90" ? 90 : 30;
  const data = await getCleanupData(workspace.id, periodDays);
  return <HygieneClient data={data} periodDays={periodDays} />;
}

export default function HygienePage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  return (
    <Suspense>
      <Inner searchParams={searchParams} />
    </Suspense>
  );
}
