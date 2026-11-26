import SignOutButton from "@/components/sign-out-button";
import { renameWorkspace } from "@/lib/actions/workspace";
import { saveName } from "@/lib/actions/profile";
import { prisma } from "@/lib/prisma";
import { getMyWorkspace, requireUser } from "@/lib/session";

/**
 * Settings — workspace name, the team, and the plan. Kept deliberately
 * small: a settings page a sales manager can finish in one minute.
 */
export default async function SettingsPage() {
  const user = await requireUser();
  const mine = await getMyWorkspace(user.id);
  if (!mine) return null;

  const members = await prisma.membership.findMany({
    where: { workspaceId: mine.workspace.id },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-[26px] font-extrabold tracking-tight text-stone-900 sm:text-[30px]">
          Settings
        </h1>
      </header>

      <section className="card p-6">
        <h2 className="text-[16px] font-bold tracking-[-0.01em] text-stone-900">Your profile</h2>
        <form action={saveName} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            name="name"
            defaultValue={user.name ?? ""}
            placeholder="Your name"
            maxLength={60}
            className="w-full rounded-xl border border-line px-4 py-2.5 shadow-[inset_0_1px_2px_rgba(74,70,52,0.04)] text-[15px] outline-none focus:border-pine focus:ring-2 focus:ring-pine/25 sm:max-w-xs"
          />
          <button
            type="submit"
            className="rounded-xl bg-pine px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_18px_-8px_rgba(11,79,58,0.55)] transition duration-200 hover:bg-pine-dark"
          >
            Save name
          </button>
        </form>
        <p className="mt-3 text-[13.5px] text-stone-400">
          Signed in as {user.email} · <SignOutButton />
        </p>
      </section>

      <section className="card p-6">
        <h2 className="text-[16px] font-bold tracking-[-0.01em] text-stone-900">Workspace</h2>
        <form action={renameWorkspace} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            name="name"
            defaultValue={mine.workspace.name}
            maxLength={60}
            className="w-full rounded-xl border border-line px-4 py-2.5 shadow-[inset_0_1px_2px_rgba(74,70,52,0.04)] text-[15px] outline-none focus:border-pine focus:ring-2 focus:ring-pine/25 sm:max-w-xs"
          />
          <button
            type="submit"
            className="rounded-xl bg-pine px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_18px_-8px_rgba(11,79,58,0.55)] transition duration-200 hover:bg-pine-dark"
          >
            Save name
          </button>
        </form>
      </section>

      <section className="card p-6">
        <h2 className="text-[16px] font-bold tracking-[-0.01em] text-stone-900">Team ({members.length})</h2>
        <ul className="mt-4 divide-y divide-line-soft">
          {members.map((m) => (
            <li key={m.id} className="flex items-center gap-3 py-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-lime-100 text-[13px] font-bold text-lime-800">
                {(m.user.name || m.user.email).slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-[14.5px] font-semibold text-stone-800">
                  {m.user.name || "—"}
                </p>
                <p className="truncate text-[13px] text-stone-400">{m.user.email}</p>
              </div>
              <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-bold capitalize text-stone-500 ring-1 ring-inset ring-stone-500/10">
                {m.role}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[13.5px] text-stone-400">
          Inviting teammates by email arrives with the team release.
        </p>
      </section>

      <section className="card p-6">
        <h2 className="text-[16px] font-bold tracking-[-0.01em] text-stone-900">Plan</h2>
        <p className="mt-2 text-[15px] text-stone-600">
          You are on the <b className="capitalize">{mine.workspace.plan}</b> plan — free while in
          early access. Paid plans are flat per rep: Starter $19, Growth $29. No credits, no
          onboarding fee.
        </p>
      </section>
    </div>
  );
}
