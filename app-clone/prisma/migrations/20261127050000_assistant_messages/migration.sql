-- AI Assistant: persisted chat threads. Each message belongs to a user
-- inside a workspace; assistant messages that prepared a change link to
-- the Proposal they created (the proposal still flows through Approvals).
CREATE TABLE "assistant_message" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "meta" JSONB,
    "proposalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assistant_message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assistant_message_workspaceId_userId_threadId_createdAt_idx" ON "assistant_message"("workspaceId", "userId", "threadId", "createdAt");

-- AddForeignKey
ALTER TABLE "assistant_message" ADD CONSTRAINT "assistant_message_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
