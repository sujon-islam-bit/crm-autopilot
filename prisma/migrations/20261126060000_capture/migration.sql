-- CreateTable
CREATE TABLE "capture" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fromLabel" TEXT,
    "snippet" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "capture_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "capture_workspaceId_kind_externalId_key" ON "capture"("workspaceId", "kind", "externalId");

-- CreateIndex
CREATE INDEX "capture_workspaceId_processedAt_idx" ON "capture"("workspaceId", "processedAt");

-- AddForeignKey
ALTER TABLE "capture" ADD CONSTRAINT "capture_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
