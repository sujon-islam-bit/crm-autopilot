import "server-only";
import { prisma } from "./db";
import type { Prisma } from "../generated/prisma/client";

export async function audit(
  workspaceId: string,
  action: string,
  summary: string,
  opts?: { userId?: string; meta?: Record<string, unknown> },
) {
  await prisma.auditEvent.create({
    data: {
      workspaceId,
      action,
      summary,
      userId: opts?.userId,
      meta: (opts?.meta ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}
