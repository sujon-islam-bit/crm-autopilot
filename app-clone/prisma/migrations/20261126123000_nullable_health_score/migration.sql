-- A workspace is born with NO health score. The demo seed sets 94/+11
-- explicitly on its own workspace; every real signup starts NULL (no data yet)
-- instead of inheriting the demo's numbers as column defaults.
ALTER TABLE "workspace" ALTER COLUMN "healthScore" DROP DEFAULT, ALTER COLUMN "healthScore" DROP NOT NULL;
ALTER TABLE "workspace" ALTER COLUMN "healthDelta" DROP DEFAULT, ALTER COLUMN "healthDelta" DROP NOT NULL;
