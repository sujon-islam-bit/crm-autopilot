-- The shell's role line is derived from the membership role ("Owner" for a
-- workspace owner). A membership may store a display override instead — the
-- demo seed stores "RevOps Admin" for its own persona only; real signups
-- leave this NULL and read "Owner".
ALTER TABLE "membership" ADD COLUMN "roleLabel" TEXT;
