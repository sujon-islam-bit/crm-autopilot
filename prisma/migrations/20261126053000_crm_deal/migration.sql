-- CreateTable
CREATE TABLE "crm_deal" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "stage" TEXT NOT NULL,
    "amount" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "ownerName" TEXT,
    "lastActivityAt" TIMESTAMP(3),
    "healthFlag" TEXT,
    "healthNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_deal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "crm_deal_workspaceId_externalId_key" ON "crm_deal"("workspaceId", "externalId");

-- CreateIndex
CREATE INDEX "crm_deal_workspaceId_stage_idx" ON "crm_deal"("workspaceId", "stage");

-- AddForeignKey
ALTER TABLE "crm_deal" ADD CONSTRAINT "crm_deal_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
