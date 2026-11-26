import { readFileSync, writeFileSync } from "node:fs";

// The recovery script leaves the fresh instance URL (with its new random
// password) in /tmp/builderai-db-url.txt. Never print it.
const base = readFileSync("/tmp/builderai-db-url.txt", "utf8").trim();
const u = new URL(base);
const { Client } = await import("pg");
const admin = new Client({ connectionString: base });
await admin.connect();
const exists = await admin.query("SELECT 1 FROM pg_database WHERE datname = 'crm_clone'");
if (exists.rowCount === 0) {
  await admin.query("CREATE DATABASE crm_clone");
  console.log("DB crm_clone created");
} else {
  console.log("DB crm_clone already exists");
}
await admin.end();

u.pathname = "/crm_clone";
const envPath = new URL("../.env", import.meta.url);
const env = readFileSync(envPath, "utf8");
const next = env.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL=${u.toString()}`);
if (next === env) throw new Error("DATABASE_URL line not replaced");
writeFileSync(envPath, next);
console.log(".env DATABASE_URL updated (unquoted, db crm_clone)");
