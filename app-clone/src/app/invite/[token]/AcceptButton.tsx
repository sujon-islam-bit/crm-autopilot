"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { acceptInviteAction } from "../../../lib/settings-actions";

export default function AcceptButton({ token }: { token: string }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  if (done) {
    return (
      <div className="mt-5">
        <p className="rounded-[10px] bg-green-tint px-4 py-3 text-[13.5px] font-semibold text-green">
          You're in — welcome to {done}.
        </p>
        <button
          onClick={() => router.push("/dashboard")}
          className="btn-violet mt-4 w-full px-4 py-2.5 text-[13.5px]"
        >
          Open the app
        </button>
      </div>
    );
  }

  return (
    <div className="mt-5">
      <button
        disabled={busy}
        onClick={() =>
          start(async () => {
            const r = await acceptInviteAction(token);
            if (!r.ok) {
              setError(r.error ?? "Something went wrong");
              return;
            }
            setDone(r.workspaceName ?? "the workspace");
          })
        }
        className="btn-violet w-full px-4 py-2.5 text-[13.5px] disabled:opacity-60"
      >
        {busy ? "Joining…" : "Accept invite"}
      </button>
      {error && <p className="mt-3 text-[13px] font-medium text-red">{error}</p>}
    </div>
  );
}
