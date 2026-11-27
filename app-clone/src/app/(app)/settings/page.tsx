import { Suspense } from "react";
import { connection } from "next/server";
import { headers } from "next/headers";
import { requireWorkspace } from "../../../lib/session";
import { auth } from "../../../lib/auth";
import { getSettingsData } from "../../../lib/settings";
import SettingsClient from "../../../components/SettingsClient";

export const metadata = { title: "Settings · Vouchso" };

async function Inner() {
  await connection();
  const { user, workspace } = await requireWorkspace();
  const session = await auth.api.getSession({ headers: await headers() });
  const data = await getSettingsData(workspace.id, user.id, session?.session.id ?? null);
  return (
    <SettingsClient
      data={data}
      userName={user.name ?? ""}
      userEmail={user.email}
    />
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="px-7 pt-6 text-sm text-muted">Loading…</div>}>
      <Inner />
    </Suspense>
  );
}
