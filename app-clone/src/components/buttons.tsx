"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { I } from "./icons";
import { undoAction, proposeFixAction, signatureAction, disconnectAction, runEngineAction } from "../lib/actions";

export function UndoButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  return (
    <button
      disabled={busy}
      onClick={() =>
        start(async () => {
          await undoAction(id);
          router.refresh();
        })
      }
      className="btn-outline px-3 py-[6px] text-[12px] font-semibold text-primary disabled:opacity-60"
    >
      Undo
    </button>
  );
}

export function ProposeFixButton({
  kind,
  label,
  dealExternalId,
}: {
  kind: string;
  label: string;
  dealExternalId: string | null;
}) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [done, setDone] = useState(false);
  return (
    <button
      disabled={busy || done}
      onClick={() =>
        start(async () => {
          await proposeFixAction(kind, label, dealExternalId);
          setDone(true);
          router.refresh();
        })
      }
      className="btn-outline px-3 py-[6px] text-[12px] font-semibold text-primary disabled:opacity-60"
    >
      {done ? "Proposed ✓" : "Propose fix"}
    </button>
  );
}

export function SignatureButton({ dealExternalId }: { dealExternalId: string }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [note, setNote] = useState("");
  return (
    <span className="inline-flex items-center gap-2">
      <button
        disabled={busy}
        onClick={() =>
          start(async () => {
            const r = await signatureAction(dealExternalId);
            if (r.ok) setNote(r.configured ? "Sent via SignuDoc" : "Requested (SignuDoc not configured)");
            router.refresh();
          })
        }
        className="btn-outline px-3 py-[6px] text-[12px] font-semibold text-primary disabled:opacity-60"
      >
        Send for signature
      </button>
      {note && <span className="text-[11.5px] text-muted">{note}</span>}
    </span>
  );
}

export function DisconnectButton({ provider, label }: { provider: string; label: string }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  if (!confirm) {
    return (
      <button onClick={() => setConfirm(true)} className="btn-outline px-3.5 py-2 text-[12.5px] font-semibold text-red">
        Disconnect
      </button>
    );
  }
  return (
    <span className="inline-flex items-center gap-2">
      <span className="text-[12px] text-muted">Disconnect {label}?</span>
      <button
        disabled={busy}
        onClick={() =>
          start(async () => {
            await disconnectAction(provider);
            router.refresh();
          })
        }
        className="rounded-[10px] bg-red px-3 py-[7px] text-[12px] font-semibold text-white disabled:opacity-60"
      >
        Yes, disconnect
      </button>
      <button onClick={() => setConfirm(false)} className="btn-outline px-3 py-[7px] text-[12px]">
        Cancel
      </button>
    </span>
  );
}

export function CheckUpdatesButton() {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [note, setNote] = useState("");
  return (
    <span className="inline-flex items-center gap-3">
      {note && <span className="text-[12.5px] text-muted">{note}</span>}
      <button
        disabled={busy}
        onClick={() =>
          start(async () => {
            const r = await runEngineAction();
            setNote(
              r.error
                ? "AI unavailable right now — nothing was marked as read."
                : r.proposals > 0
                  ? `${r.proposals} new proposal${r.proposals === 1 ? "" : "s"} from ${r.processed} captures.`
                  : "No new proposals — everything is up to date.",
            );
            router.refresh();
          })
        }
        className="btn-primary flex items-center gap-1.5 px-4 py-2 text-[13px] disabled:opacity-60"
      >
        <I n="sync" size={14} sw={2.2} /> {busy ? "Checking…" : "Check for updates"}
      </button>
    </span>
  );
}
