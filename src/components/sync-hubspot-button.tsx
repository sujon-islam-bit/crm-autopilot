"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { syncHubspotNow } from "@/lib/actions/connections";

export default function SyncHubspotButton() {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  return (
    <div className="mt-4 flex items-center gap-3">
      <button
        onClick={() =>
          start(async () => {
            const result = await syncHubspotNow();
            setNote(result ? `Synced — ${result.deals} deals up to date.` : "Sync could not run.");
            router.refresh();
          })
        }
        disabled={busy}
        className="rounded-xl border-[1.5px] border-line bg-white px-5 py-2.5 text-sm font-semibold text-neutral-700 shadow-[0_1px_2px_rgba(27,43,66,0.05)] transition duration-200 hover:border-neutral-300 hover:bg-neutral-50 disabled:opacity-50"
      >
        {busy ? "Syncing…" : "Sync deals"}
      </button>
      {note && <span className="text-[13px] text-neutral-400">{note}</span>}
    </div>
  );
}
