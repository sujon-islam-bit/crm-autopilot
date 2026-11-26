// Prisma 7 reads its CLI configuration from this file (not from schema.prisma).
// The CLI no longer auto-loads .env files, so we load them explicitly.
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
