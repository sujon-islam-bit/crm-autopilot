"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { runEngineNow } from "@/lib/actions/engine";

export default function RunEngineButton() {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-3">
      {note && <span className="text-[13.5px] text-stone-500">{note}</span>}
      <button
        onClick={() =>
          start(async () => {
            const result = await runEngineNow();
            setNote(
              result
                ? result.capturesRead === 0
                  ? "Nothing new to read."
                  : `${result.proposals} new proposal${result.proposals === 1 ? "" : "s"} from ${result.capturesRead} items.`
                : "Could not run.",
            );
            router.refresh();
          })
        }
        disabled={busy}
        className="rounded-xl bg-pine px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_18px_-8px_rgba(11,79,58,0.55)] transition duration-200 hover:bg-pine-dark disabled:opacity-50 disabled:shadow-none"
      >
        {busy ? "Reading…" : "Check for updates"}
      </button>
    </div>
  );
}
