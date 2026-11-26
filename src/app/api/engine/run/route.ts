import { NextResponse, type NextRequest } from "next/server";

import { captureGoogle } from "@/lib/google-capture";
import { runProposalEngine } from "@/lib/engine";
import { prisma } from "@/lib/prisma";

/**
 * Scheduled engine run (the pinger calls this): for every workspace,
 * capture new mail/meetings, then propose. Guarded by CRON_SECRET —
 * the same pattern as BuilderAI's trigger tick.
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const workspaces = await prisma.workspace.findMany({ select: { id: true } });
  let total = 0;
  for (const ws of workspaces) {
    await captureGoogle(ws.id).catch(() => null);
    const result = await runProposalEngine(ws.id).catch(() => null);
    if (result) total += result.proposals;
  }
  return NextResponse.json({ ok: true, proposals: total });
}
