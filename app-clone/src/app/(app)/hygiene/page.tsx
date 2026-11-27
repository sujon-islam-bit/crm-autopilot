import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { requireWorkspace } from "@/lib/session";
import { getCleanupData } from "@/lib/cleanup";
import { can } from "@/lib/permissions";
import HygieneClient from "./HygieneClient";

export const metadata = { title: "Data Cleanup · Vouchso" };

async function Inner({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  await connection();
  const sp = await searchParams;
  const { workspace, role } = await requireWorkspace();
  // Page visibility: Data Cleanup is hidden for Sales Reps.
  if (!can(role, "pages.cleanup")) redirect("/dashboard");
  const periodDays = sp.period === "7" ? 7 : sp.period === "90" ? 90 : 30;
  const data = await getCleanupData(workspace.id, periodDays);
  return (
    <HygieneClient
      data={data}
      periodDays={periodDays}
      canPropose={can(role, "hygiene.propose")}
      canGuardrails={can(role, "guardrails.write")}
    />
  );
}

export default function HygienePage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  return (
    <Suspense>
      <Inner searchParams={searchParams} />
    </Suspense>
  );
}
