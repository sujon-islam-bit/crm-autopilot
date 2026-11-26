// Scratch: create the crm_clone database on the fresh embedded Postgres.
// Reads the admin URL from /tmp/builderai-db-url.txt; never prints it.
import { readFileSync } from "node:fs";
const base = readFileSync("/tmp/builderai-db-url.txt", "utf8").trim();
const adminUrl = base.replace(/\/[^/]*$/, "/postgres");
const { PrismaPg } = await import("@prisma/adapter-pg");
const { PrismaClient } = await import("../src/generated/prisma/client");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: adminUrl }) });
const rows = await prisma.$queryRawUnsafe("SELECT 1 AS ok FROM pg_database WHERE datname = 'crm_clone'");
if (Array.isArray(rows) && rows.length > 0) {
  console.log("crm_clone already exists");
} else {
  await prisma.$executeRawUnsafe("CREATE DATABASE crm_clone");
  console.log("crm_clone created");
}
await prisma.$disconnect();
