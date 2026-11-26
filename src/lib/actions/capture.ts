"use server";

import { revalidatePath } from "next/cache";

import { captureGoogle } from "@/lib/google-capture";
import { getCurrentUser, getMyWorkspace } from "@/lib/session";

/** Manual "sync now" from the Connections screen. */
export async function syncGoogleNow(): Promise<{ emails: number; meetings: number } | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const mine = await getMyWorkspace(user.id);
  if (!mine) return null;
  const result = await captureGoogle(mine.workspace.id);
  revalidatePath("/connections");
  revalidatePath("/dashboard");
  return result;
}
