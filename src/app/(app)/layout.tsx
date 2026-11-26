import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";

import SidebarNav from "@/components/sidebar-nav";
import SignOutButton from "@/components/sign-out-button";
import { prisma } from "@/lib/prisma";
import { getMyWorkspace, requireUser } from "@/lib/session";

/**
 * The signed-in app shell: a calm sidebar on desktop (Attio-like),
 * a compact top bar with a scrolling nav on phones. Every screen
 * inside (app) is a real product screen — no placeholders.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}

async function Shell({ children }: { children: ReactNode }) {
  await connection();
  const user = await requireUser();
  const mine = await getMyWorkspace(user.id);

  if (!mine) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas px-4">
        <p className="max-w-sm text-center text-[15px] text-stone-500">
          Your workspace is still being set up. Refresh in a moment — if this stays, sign out and
          back in.
        </p>
      </main>
    );
  }

  const pendingApprovals = await prisma.proposal.count({
    where: { workspaceId: mine.workspace.id, status: "pending" },
  });

  return (
    <div className="min-h-screen bg-canvas text-stone-900 lg:flex">
      <aside className="lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-60 lg:shrink-0 lg:flex-col">
        <div className="px-4 pb-2 pt-4 lg:px-4 lg:pb-4 lg:pt-5">
          <div className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-[0_1px_3px_rgba(74,70,52,0.08)] ring-1 ring-line-soft">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-pine text-[17px] font-extrabold text-white shadow-[0_6px_14px_-6px_rgba(11,79,58,0.55)]">
              {mine.workspace.name.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-[14.5px] font-bold tracking-[-0.01em]">{mine.workspace.name}</p>
              <p className="truncate text-xs capitalize text-stone-400">
                {mine.workspace.plan} plan
              </p>
            </div>
          </div>
        </div>
        <div className="px-2 pb-3 lg:flex-1 lg:px-3">
          <SidebarNav pendingApprovals={pendingApprovals} />
        </div>
        <div className="hidden px-4 pb-5 lg:block">
          <div className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-[0_1px_3px_rgba(74,70,52,0.08)] ring-1 ring-line-soft">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-lime text-[13px] font-bold text-lime-950">
              {(user.name || user.email).slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-[13.5px] font-semibold">{user.name || "Account"}</p>
              <p className="truncate text-xs text-stone-400">{user.email}</p>
            </div>
            <SignOutButton />
          </div>
        </div>
      </aside>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-8 lg:py-8">{children}</main>
    </div>
  );
}
