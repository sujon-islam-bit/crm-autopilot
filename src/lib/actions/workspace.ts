"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { getCurrentUser, getMyWorkspace } from "@/lib/session";

export async function renameWorkspace(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2 || name.length > 60) return;
  const user = await getCurrentUser();
  if (!user) return;
  const mine = await getMyWorkspace(user.id);
  if (!mine || mine.membership.role === "member") return;
  await prisma.workspace.update({ where: { id: mine.workspace.id }, data: { name } });
  revalidatePath("/settings");
  revalidatePath("/dashboard");
}
