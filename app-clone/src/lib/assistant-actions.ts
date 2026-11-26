"use server";

import { randomUUID } from "node:crypto";
import { prisma } from "./db";
import { requireWorkspace } from "./session";
import {
  answerAssistant,
  assistantLimitMessage,
  getAssistantUsage,
  latestThreadId,
  listThreads,
  loadThread,
  threadBelongs,
} from "./assistant";
import type { SerializedMessage, ThreadSummary } from "./assistant-types";
import type { Prisma } from "../generated/prisma/client";

/**
 * AI Assistant chat actions. Sending a message persists the user's line,
 * runs the grounded brain (lib/assistant.ts), persists the reply (with
 * its structured blocks + any proposal it prepared) and returns the two
 * new messages serialized for the client.
 */
export async function sendAssistantMessageAction(
  threadId: string,
  text: string,
): Promise<{
  ok: boolean;
  threadId: string;
  messages: SerializedMessage[];
  limit?: number;
  remaining?: number;
  limited?: boolean;
  error?: string;
}> {
  const { user, workspace, role } = await requireWorkspace();
  const ctx = { workspaceId: workspace.id, userId: user.id, userName: user.name ?? "", role };
  const clean = text.trim().slice(0, 1000);
  if (!clean) return { ok: false, threadId, messages: [], error: "Type a message first" };

  let tid = threadId;
  if (!tid || !(await threadBelongs(ctx, tid))) tid = randomUUID();

  // Daily limit (per user, resets at Asia/Dhaka midnight): when the caller
  // is at the cap, the model is never called and no proposal is created —
  // the thread just records the attempt and the limit note.
  const usage = await getAssistantUsage(ctx);
  const userMsg = await prisma.assistantMessage.create({
    data: { workspaceId: workspace.id, userId: user.id, threadId: tid, role: "user", content: clean },
  });
  if (usage.remaining <= 0) {
    const note = await prisma.assistantMessage.create({
      data: {
        workspaceId: workspace.id,
        userId: user.id,
        threadId: tid,
        role: "assistant",
        content: assistantLimitMessage(usage.limit),
        meta: { blocks: [], narration: null } as Prisma.InputJsonValue,
      },
    });
    const all = await loadThread(ctx, tid);
    return {
      ok: true,
      threadId: tid,
      messages: all.filter((m) => m.id === userMsg.id || m.id === note.id),
      limit: usage.limit,
      remaining: 0,
      limited: true,
    };
  }

  const reply = await answerAssistant(ctx, clean);
  const asstMsg = await prisma.assistantMessage.create({
    data: {
      workspaceId: workspace.id,
      userId: user.id,
      threadId: tid,
      role: "assistant",
      content: reply.text,
      meta: { blocks: reply.blocks, narration: reply.narration ?? null } as Prisma.InputJsonValue,
      proposalId: reply.proposalId ?? null,
    },
  });
  const all = await loadThread(ctx, tid);
  const fresh = all.filter((m) => m.id === userMsg.id || m.id === asstMsg.id);
  const after = await getAssistantUsage(ctx);
  return { ok: true, threadId: tid, messages: fresh, limit: after.limit, remaining: after.remaining, limited: false };
}

/** Start a fresh thread. Nothing is written until the first message —
 *  the returned id simply becomes the client's active thread. */
export async function newAssistantThreadAction(): Promise<{ threadId: string }> {
  await requireWorkspace();
  return { threadId: randomUUID() };
}

export async function currentAssistantThreadAction(): Promise<{ threadId: string }> {
  const { user, workspace, role } = await requireWorkspace();
  const ctx = { workspaceId: workspace.id, userId: user.id, userName: user.name ?? "", role };
  return { threadId: await latestThreadId(ctx) };
}

/** The history rail: the caller's threads, newest activity first. */
export async function listAssistantThreadsAction(): Promise<{ threads: ThreadSummary[] }> {
  const { user, workspace, role } = await requireWorkspace();
  const ctx = { workspaceId: workspace.id, userId: user.id, userName: user.name ?? "", role };
  return { threads: await listThreads(ctx) };
}

/** Load one of the caller's threads (ownership-checked) for the rail. */
export async function loadAssistantThreadAction(
  threadId: string,
): Promise<{ ok: boolean; messages: SerializedMessage[] }> {
  const { user, workspace, role } = await requireWorkspace();
  const ctx = { workspaceId: workspace.id, userId: user.id, userName: user.name ?? "", role };
  if (!(await threadBelongs(ctx, threadId))) return { ok: false, messages: [] };
  return { ok: true, messages: await loadThread(ctx, threadId) };
}
