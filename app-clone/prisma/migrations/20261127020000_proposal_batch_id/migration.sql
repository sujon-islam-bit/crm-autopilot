-- History (Sync & Rollback): every apply action stamps its proposals with
-- a shared batch id, so the History screen can list, inspect and roll back
-- the exact set of changes that were written to the CRM together.
ALTER TABLE "proposal" ADD COLUMN "batchId" TEXT;
