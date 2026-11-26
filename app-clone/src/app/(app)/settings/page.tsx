import { Suspense } from "react";
import { connection } from "next/server";
import { requireWorkspace } from "../../../lib/session";
import { prisma } from "../../../lib/db";
import { saveProfileAction, saveWorkspaceAction } from "../../../lib/actions";
import SignOutButton from "./SignOutButton";

async function Inner() {
  await connection();
  const { user, workspace, role } = await requireWorkspace();
  const members = await prisma.membership.findMany({
    where: { workspaceId: workspace.id },
    include: { user: true },
  });

  return (
    <div className="px-7 pt-5 pb-7">
      <h1 className="text-[24px] font-extrabold tracking-tight">Settings</h1>
      <p className="mt-1 text-[13.5px] text-muted">Your profile, workspace and plan.</p>

      <div className="mt-5 grid max-w-[880px] grid-cols-1 gap-4">
        <div className="card p-5">
          <h2 className="text-[15px] font-bold">Profile</h2>
          <form
            action={async (fd) => {
              await saveProfileAction(fd);
            }}
            className="mt-3 flex items-end gap-3"
          >
            <label className="flex-1">
              <span className="mb-1.5 block text-[12px] font-medium text-muted">Your name</span>
              <input
                name="name"
                defaultValue={user.name}
                className="w-full rounded-[10px] border border-line px-3.5 py-2.5 text-[13.5px]"
              />
            </label>
            <button className="btn-primary px-4 py-2.5 text-[13px]">Save</button>
          </form>
          <div className="mt-3 flex items-center justify-between border-t border-line/70 pt-3">
            <span className="text-[13px] text-muted">{user.email}</span>
            <SignOutButton />
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-[15px] font-bold">Workspace</h2>
          <form
            action={async (fd) => {
              await saveWorkspaceAction(fd);
            }}
            className="mt-3 flex items-end gap-3"
          >
            <label className="flex-1">
              <span className="mb-1.5 block text-[12px] font-medium text-muted">Workspace name</span>
              <input
                name="name"
                defaultValue={workspace.name}
                disabled={role !== "owner" && role !== "admin"}
                className="w-full rounded-[10px] border border-line px-3.5 py-2.5 text-[13.5px] disabled:bg-canvas"
              />
            </label>
            <button className="btn-primary px-4 py-2.5 text-[13px]" disabled={role !== "owner" && role !== "admin"}>
              Save
            </button>
          </form>
        </div>

        <div className="card p-5">
          <h2 className="text-[15px] font-bold">Team</h2>
          <div className="mt-3 divide-y divide-line/60">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 py-2.5">
                <div className="flex-1">
                  <div className="text-[13.5px] font-semibold">{m.user.name}</div>
                  <div className="text-[12px] text-muted">{m.user.email}</div>
                </div>
                <span className="rounded-full bg-canvas px-2.5 py-[3px] text-[11.5px] font-bold text-ink2 capitalize">
                  {m.role}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card flex items-center gap-4 p-5">
          <div className="flex-1">
            <h2 className="text-[15px] font-bold">Plan — Trial</h2>
            <p className="mt-1 text-[13px] text-muted">
              Flat $19–29 per rep/month at launch. No credits, no onboarding fee, monthly billing.
            </p>
          </div>
          <span className="rounded-full bg-primary-tint px-3 py-1 text-[12px] font-bold text-primary">Trial</span>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="px-7 pt-6 text-sm text-muted">Loading…</div>}>
      <Inner />
    </Suspense>
  );
}
