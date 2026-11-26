"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { I } from "./icons";
import { addNoteAction } from "../lib/actions";

const SOURCES = [
  { key: "call", label: "Call", icon: "phone", kind: "call", title: "Call notes" },
  { key: "whatsapp", label: "WhatsApp", icon: "msg", kind: "chat", title: "WhatsApp chat" },
  { key: "linkedin", label: "LinkedIn", icon: "msg", kind: "chat", title: "LinkedIn chat" },
] as const;

/** Inline paste panel on the Approvals page: paste a call transcript or a
 *  WhatsApp/LinkedIn thread, the note becomes a Capture and the engine runs
 *  on it immediately — any proposals land in the list below. */
export default function AddNotePanel() {
  const router = useRouter();
  const [source, setSource] = useState<(typeof SOURCES)[number]>(SOURCES[0]);
  const [body, setBody] = useState("");
  const [note, setNote] = useState("");
  const [busy, start] = useTransition();

  const submit = () => {
    const form = new FormData();
    form.set("kind", source.kind);
    form.set("title", source.title);
    form.set("body", body);
    start(async () => {
      const r = await addNoteAction(form);
      if (!r.ok) {
        setNote(r.error ?? "Something went wrong");
        return;
      }
      setNote(
        r.error
          ? "Saved — but the AI is unavailable right now, so it has not been read yet."
          : r.proposals && r.proposals > 0
            ? `Read it — ${r.proposals} proposal${r.proposals === 1 ? "" : "s"} waiting in Approvals below.`
            : "Read it — no CRM change needed from this one.",
      );
      setBody("");
      router.refresh();
    });
  };

  return (
    <div className="card mt-4 p-5">
      <div className="flex gap-2">
        {SOURCES.map((s) => (
          <button
            key={s.key}
            onClick={() => setSource(s)}
            className={`flex items-center gap-2 rounded-[10px] px-3.5 py-2 text-[13px] font-semibold ${
              source.key === s.key ? "bg-primary-tint text-primary" : "border border-line text-ink2 hover:bg-canvas"
            }`}
          >
            <I n={s.icon} size={15} /> {s.label}
          </button>
        ))}
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={6}
        placeholder={
          source.key === "call"
            ? "Paste the call transcript or your notes here. The AI reads it and proposes CRM updates — nothing changes without your approval."
            : `Paste the ${source.label} thread here. The AI reads it and proposes CRM updates — nothing changes without your approval.`
        }
        className="mt-3 w-full resize-y rounded-[10px] border border-line bg-white px-3.5 py-3 text-[13.5px] leading-relaxed"
      />
      <div className="mt-3 flex items-center gap-3">
        <button onClick={submit} disabled={busy || !body.trim()} className="btn-primary px-5 py-2.5 text-[13.5px] disabled:opacity-50">
          {busy ? "Reading…" : "Add"}
        </button>
        {note && <span className="text-[13px] text-muted">{note}</span>}
      </div>
    </div>
  );
}
