"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { syncGoogleNow } from "@/lib/actions/capture";

export default function SyncGoogleButton({ capturedCount }: { capturedCount: number }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  return (
    <div className="mt-4 flex items-center gap-3">
      <button
        onClick={() =>
          start(async () => {
            const result = await syncGoogleNow();
            setNote(
              result
                ? `Synced — ${result.emails} emails, ${result.meetings} meetings captured.`
                : "Sync could not run.",
            );
            router.refresh();
          })
        }
        disabled={busy}
        className="rounded-lg border-[1.5px] border-neutral-200 bg-white px-5 py-2.5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50"
      >
        {busy ? "Syncing…" : "Sync now"}
      </button>
      <span className="text-[13px] text-neutral-400">
        {note ?? `${capturedCount} items captured so far`}
      </span>
    </div>
  );
}
