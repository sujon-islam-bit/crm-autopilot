"use server";

import { revalidatePath } from "next/cache";

import { captureGoogle } from "@/lib/google-capture";
import { runProposalEngine } from "@/lib/engine";
import { getCurrentUser, getMyWorkspace } from "@/lib/session";

/**
 * "Check for updates": capture anything new, then run the proposal
 * engine over it. This is also what the scheduled job calls.
 */
export async function runEngineNow(): Promise<{ proposals: number; capturesRead: number } | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const mine = await getMyWorkspace(user.id);
  if (!mine) return null;
  const ws = mine.workspace.id;
  await captureGoogle(ws).catch(() => ({ emails: 0, meetings: 0 }));
  const result = await runProposalEngine(ws);
  revalidatePath("/dashboard");
  revalidatePath("/approvals");
  revalidatePath("/pipeline");
  revalidatePath("/activity");
  return result;
}
