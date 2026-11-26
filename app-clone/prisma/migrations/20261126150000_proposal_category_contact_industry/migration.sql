-- Review Queue v2: proposals carry a tab category (Deal Updates / New
-- Contacts / Enrichment / Follow-ups / Field Fixes); contacts gain an
-- Industry field so the "Fix Missing Field: Industry" proposal can apply
-- for real. Existing rows default to deal_update; the seed sets every
-- demo row's category explicitly.
ALTER TABLE "proposal" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'deal_update';
ALTER TABLE "crm_contact" ADD COLUMN "industry" TEXT;
