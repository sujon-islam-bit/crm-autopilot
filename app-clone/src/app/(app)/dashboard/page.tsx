import { Suspense } from "react";
import { connection } from "next/server";
import { requireWorkspace } from "../../../lib/session";
import { prisma } from "../../../lib/db";
import { getDashboardData } from "../../../lib/data";
import { toProposalView } from "../../../lib/view";
import DashboardClient from "./DashboardClient";

async function DashboardInner() {
  await connection();
  const { user, workspace } = await requireWorkspace();
  const data = await getDashboardData(workspace.id);

  const top = data.pending.slice(0, 3);
  const views = await Promise.all(
    top.map(async (p) => {
      const deal = p.dealExternalId
        ? await prisma.crmDeal.findFirst({
            where: { workspaceId: workspace.id, externalId: p.dealExternalId },
          })
        : null;
      return toProposalView(p, deal);
    }),
  );

  // Greeting name: profile name when present; OTP signups may have an empty
  // name, so fall back to the email handle ("fresh@…" → "Fresh").
  const rawName = user.name.trim();
  const emailHandle = user.email.split("@")[0].replace(/[._-]+/g, " ").trim();
  const base = rawName || emailHandle;
  const lastWord = base.split(" ").filter(Boolean).slice(-1)[0] ?? "there";
  const firstName = rawName ? lastWord : lastWord.charAt(0).toUpperCase() + lastWord.slice(1);

  return (
    <DashboardClient
      firstName={firstName}
      connected={data.hasConnection}
      views={views}
      stats={{
        queueCount: data.queueCount,
        queueDelta: data.queueDelta,
        score: data.integrity.score,
        scoreDelta: data.integrity.delta,
        readyCount: data.readyCount,
        repHours: data.repHours,
        repDelta: data.repDelta,
        sparks: data.sparks,
        pulseNow: data.pulseNow,
        pulseDelta: data.pulseDelta,
        counts: data.integrity.counts,
      }}
      pulse={data.pulse}
      briefs={data.briefs}
    />
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="px-7 pt-6 text-sm text-muted">Loading…</div>}>
      <DashboardInner />
    </Suspense>
  );
}
