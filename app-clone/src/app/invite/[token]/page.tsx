import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { prisma } from "../../../lib/db";
import { getCurrentUser } from "../../../lib/session";
import { ROLE_LABELS, normalizeRole } from "../../../lib/permissions";
import { LogoMark } from "../../../components/icons";
import AcceptButton from "./AcceptButton";

async function Inner({ params }: { params: Promise<{ token: string }> }) {
  await connection();
  const { token } = await params;
  const invite = await prisma.invite.findUnique({
    where: { token },
    include: { workspace: true },
  });
  const user = await getCurrentUser();

  let body: React.ReactNode;
  if (!invite) {
    body = (
      <>
        <h1 className="text-[20px] font-extrabold">This invite link isn't valid</h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
          The link may have been replaced by a newer one — ask the person who invited you to
          re-send it from Settings → Workspace.
        </p>
      </>
    );
  } else if (invite.status === "revoked") {
    body = (
      <>
        <h1 className="text-[20px] font-extrabold">This invite was revoked</h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
          Ask the workspace admin to send a fresh invite if you still need access.
        </p>
      </>
    );
  } else if (invite.status === "accepted") {
    body = (
      <>
        <h1 className="text-[20px] font-extrabold">Invite already accepted</h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
          This invite has already been used. If that was you, just open the app.
        </p>
        <Link href="/dashboard" className="btn-violet mt-5 block px-4 py-2.5 text-center text-[13.5px]">
          Open the app
        </Link>
      </>
    );
  } else if (invite.expiresAt.getTime() < Date.now()) {
    body = (
      <>
        <h1 className="text-[20px] font-extrabold">This invite has expired</h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
          Invites last 7 days. Ask the workspace admin to re-send it from Settings → Workspace.
        </p>
      </>
    );
  } else if (!user) {
    body = (
      <>
        <h1 className="text-[20px] font-extrabold">You've been invited</h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
          Join <strong className="text-ink">{invite.workspace.name}</strong> as{" "}
          <strong className="text-ink">{ROLE_LABELS[normalizeRole(invite.role)]}</strong>. Sign in
          with <strong className="text-ink">{invite.email}</strong> first, then come back to this
          link to accept.
        </p>
        <Link href="/sign-in" className="btn-violet mt-5 block px-4 py-2.5 text-center text-[13.5px]">
          Sign in to accept
        </Link>
      </>
    );
  } else if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
    body = (
      <>
        <h1 className="text-[20px] font-extrabold">This invite is for someone else</h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
          The invite was sent to <strong className="text-ink">{invite.email}</strong>, but you're
          signed in as <strong className="text-ink">{user.email}</strong>. Sign in with the
          invited email to accept it.
        </p>
      </>
    );
  } else {
    body = (
      <>
        <h1 className="text-[20px] font-extrabold">Join {invite.workspace.name}</h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
          You'll join as <strong className="text-ink">{ROLE_LABELS[normalizeRole(invite.role)]}</strong>.
          Your access follows that role's permissions.
        </p>
        <AcceptButton token={token} />
      </>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
      <div className="card w-full max-w-[430px] p-7">
        <div className="mb-5 flex items-center gap-2.5">
          <LogoMark size={30} />
          <span className="text-[16px] font-extrabold tracking-tight">CleanPipe</span>
        </div>
        {body}
      </div>
    </div>
  );
}

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-muted">Loading…</div>}>
      <Inner params={params} />
    </Suspense>
  );
}
