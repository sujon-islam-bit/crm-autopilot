"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

/** Save the signed-in user's display name (Settings → Profile). */
export async function saveName(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2 || name.length > 60) return;
  const user = await getCurrentUser();
  if (!user) return;
  await prisma.user.update({ where: { id: user.id }, data: { name } });
  revalidatePath("/settings");
  revalidatePath("/dashboard");
}
