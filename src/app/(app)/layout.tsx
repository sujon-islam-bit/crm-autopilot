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
      <main className="flex min-h-screen items-center justify-center bg-[#fafafa] px-4">
        <p className="max-w-sm text-center text-[15px] text-neutral-500">
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
    <div className="min-h-screen bg-canvas text-neutral-900 lg:flex">
      <aside className="border-b border-line bg-shell lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-60 lg:shrink-0 lg:flex-col lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-3 px-4 pb-2 pt-4 lg:px-5 lg:pb-4 lg:pt-6">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-[17px] font-extrabold text-white shadow-[0_6px_14px_-6px_rgba(62,124,177,0.7)]">
            A
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[14.5px] font-bold tracking-[-0.01em]">{mine.workspace.name}</p>
            <p className="truncate text-xs capitalize text-neutral-400">
              {mine.workspace.plan} plan
            </p>
          </div>
        </div>
        <div className="px-2 pb-3 lg:flex-1 lg:px-3">
          <SidebarNav pendingApprovals={pendingApprovals} />
        </div>
        <div className="hidden items-center gap-3 border-t border-line px-5 py-4 lg:flex">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-[13px] font-bold text-brand shadow-[0_1px_3px_rgba(27,43,66,0.12)] ring-1 ring-line">
            {(user.name || user.email).slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[13.5px] font-semibold">{user.name || "Account"}</p>
            <p className="truncate text-xs text-neutral-400">{user.email}</p>
          </div>
          <SignOutButton />
        </div>
      </aside>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-8 lg:py-10">{children}</main>
    </div>
  );
}
