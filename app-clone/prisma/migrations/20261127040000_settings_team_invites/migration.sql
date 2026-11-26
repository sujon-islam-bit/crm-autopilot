-- Settings screen + Team system: workspace-scoped settings JSON (company
-- details, AI preferences, data retention), per-member notification
-- preferences JSON, and the Invite table behind team invitations.
ALTER TABLE "workspace" ADD COLUMN "settings" JSONB;
ALTER TABLE "membership" ADD COLUMN "settings" JSONB;

-- CreateTable
CREATE TABLE "invite" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invite_token_key" ON "invite"("token");

-- AddForeignKey
ALTER TABLE "invite" ADD CONSTRAINT "invite_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
