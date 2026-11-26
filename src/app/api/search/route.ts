import { NextResponse } from "next/server";

import { money } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getMyWorkspace } from "@/lib/session";

/**
 * Dashboard search: matches deals (name/company), proposals (title)
 * and captures (title) inside the signed-in user's workspace. Small
 * and read-only — the dashboard's search box is a real query, not a
 * decoration.
 */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const mine = await getMyWorkspace(user.id);
  const empty = { deals: [], proposals: [], captures: [] };
  if (!mine) return NextResponse.json(empty);

  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json(empty);

  const ws = mine.workspace.id;
  const contains = { contains: q, mode: "insensitive" as const };
  const [deals, proposals, captures] = await Promise.all([
    prisma.crmDeal.findMany({
      where: { workspaceId: ws, OR: [{ name: contains }, { company: contains }] },
      orderBy: { amount: "desc" },
      take: 5,
    }),
    prisma.proposal.findMany({
      where: { workspaceId: ws, title: contains },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.capture.findMany({
      where: { workspaceId: ws, title: contains },
      orderBy: { occurredAt: "desc" },
      take: 5,
    }),
  ]);

  return NextResponse.json({
    deals: deals.map((d) => ({
      id: d.id,
      title: d.company ?? d.name,
      sub: `${d.name} · ${d.stage} · ${money(d.amount, d.currency)}`,
    })),
    proposals: proposals.map((p) => ({ id: p.id, title: p.title, sub: `Proposal · ${p.status}` })),
    captures: captures.map((c) => ({
      id: c.id,
      title: c.title,
      sub: c.kind === "meeting" ? "Meeting" : "Email",
    })),
  });
}
