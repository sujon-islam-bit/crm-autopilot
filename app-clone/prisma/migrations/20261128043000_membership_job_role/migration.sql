-- Sign-up role step: the member's self-described job (Owner / Admin /
-- Manager / Sales Rep / Viewer). Descriptive only — the permission role
-- stays in "role" (a workspace creator is always the Owner).
ALTER TABLE "membership" ADD COLUMN "jobRole" TEXT;
