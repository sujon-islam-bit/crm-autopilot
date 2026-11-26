import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const membership = await prisma.membership.findFirst({ where: { userId: session.user.id } });
  if (!membership) return NextResponse.json({ deals: [], proposals: [], captures: [] });
  const ws = membership.workspaceId;
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ deals: [], proposals: [], captures: [] });

  const [deals, proposals, captures] = await Promise.all([
    prisma.crmDeal.findMany({
      where: {
        workspaceId: ws,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { company: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { externalId: true, name: true, company: true, stage: true, amount: true },
      take: 6,
    }),
    prisma.proposal.findMany({
      where: { workspaceId: ws, title: { contains: q, mode: "insensitive" } },
      select: { id: true, title: true, status: true, type: true },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.capture.findMany({
      where: { workspaceId: ws, title: { contains: q, mode: "insensitive" } },
      select: { id: true, title: true, kind: true },
      orderBy: { occurredAt: "desc" },
      take: 6,
    }),
  ]);
  return NextResponse.json({ deals, proposals, captures });
}
