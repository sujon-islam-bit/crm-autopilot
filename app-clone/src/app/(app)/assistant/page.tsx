import { Suspense } from "react";
import { connection } from "next/server";
import { requireWorkspace } from "../../../lib/session";
import { getAssistantUsage, latestThreadId, loadThread } from "../../../lib/assistant";
import AssistantClient from "../../../components/AssistantClient";

export const metadata = { title: "AI Assistant · Vouchso" };

async function AssistantInner() {
  await connection();
  const { user, workspace, role } = await requireWorkspace();
  const ctx = { workspaceId: workspace.id, userId: user.id, userName: user.name ?? "", role };

  // The latest thread opens on arrival; the full thread list lives in the
  // main sidebar (BuilderAI's Chats section), loaded client-side there.
  const threadId = await latestThreadId(ctx);
  const [messages, usage] = await Promise.all([loadThread(ctx, threadId), getAssistantUsage(ctx)]);

  return (
    <AssistantClient
      initialThreadId={threadId}
      initialMessages={messages}
      initialLimit={usage.limit}
      initialRemaining={usage.remaining}
    />
  );
}

export default function AssistantPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted">Loading…</div>}>
      <AssistantInner />
    </Suspense>
  );
}
