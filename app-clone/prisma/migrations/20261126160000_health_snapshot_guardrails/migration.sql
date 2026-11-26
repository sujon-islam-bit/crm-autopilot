-- Data Cleanup (Data Hygiene design): daily health snapshots for the Data
-- Quality Trend, and per-workspace Data Guardrails settings.
CREATE TABLE "health_snapshot" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "score" INTEGER NOT NULL,
    "dupCount" INTEGER NOT NULL,
    "missingCount" INTEGER NOT NULL,
    "unloggedCount" INTEGER NOT NULL,
    "staleCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_snapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "health_snapshot_workspaceId_date_key" ON "health_snapshot"("workspaceId", "date");

ALTER TABLE "health_snapshot" ADD CONSTRAINT "health_snapshot_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "guardrail_setting" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "autoEnrich" BOOLEAN NOT NULL DEFAULT true,
    "preventInvalidStage" BOOLEAN NOT NULL DEFAULT true,
    "requireNextStep" BOOLEAN NOT NULL DEFAULT true,
    "detectDuplicates" BOOLEAN NOT NULL DEFAULT true,
    "flagSuspicious" BOOLEAN NOT NULL DEFAULT true,
    "lastDupCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guardrail_setting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "guardrail_setting_workspaceId_key" ON "guardrail_setting"("workspaceId");

ALTER TABLE "guardrail_setting" ADD CONSTRAINT "guardrail_setting_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
