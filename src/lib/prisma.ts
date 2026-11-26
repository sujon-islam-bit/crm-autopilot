import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * A single PrismaClient per server process (same pattern as BuilderAI).
 * In development Next.js hot-reloads modules, which would create a new
 * connection pool on every edit; the client is stashed on `globalThis`.
 */
const globalForPrisma = globalThis as unknown as { connectPrisma?: PrismaClient };

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.connectPrisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.connectPrisma = prisma;
}
