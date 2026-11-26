import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runEngineForWorkspace } from "@/lib/engine";
import { syncGoogleCaptures } from "@/lib/google-capture";
import { syncOutlookCaptures } from "@/lib/outlook-capture";

// Scheduled engine run (pinger-ready). Guarded by CRON_SECRET.
export async function POST(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const workspaces = await prisma.workspace.findMany({ select: { id: true } });
  const results: Record<string, unknown> = {};
  for (const ws of workspaces) {
    await syncGoogleCaptures(ws.id).catch(() => null);
    await syncOutlookCaptures(ws.id).catch(() => null);
    results[ws.id] = await runEngineForWorkspace(ws.id);
  }
  return NextResponse.json({ ok: true, results });
}
