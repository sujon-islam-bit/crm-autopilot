"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { disconnectProvider } from "@/lib/actions/connections";

export default function DisconnectButton({ provider, label }: { provider: string; label: string }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="mt-4 text-sm font-semibold text-neutral-400 transition hover:text-red-600"
      >
        Disconnect
      </button>
    );
  }
  return (
    <span className="mt-4 flex items-center gap-3">
      <span className="text-[13.5px] text-neutral-500">Disconnect {label}?</span>
      <button
        onClick={() =>
          start(async () => {
            await disconnectProvider(provider);
            setConfirming(false);
            router.refresh();
          })
        }
        disabled={busy}
        className="rounded-lg bg-red-600 px-4 py-1.5 text-[13px] font-semibold text-white disabled:opacity-50"
      >
        {busy ? "…" : "Yes, disconnect"}
      </button>
      <button
        onClick={() => setConfirming(false)}
        className="text-[13.5px] font-semibold text-neutral-500 hover:text-neutral-800"
      >
        Keep it
      </button>
    </span>
  );
}
