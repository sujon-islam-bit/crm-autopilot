"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { I } from "../../../components/icons";
import { addNoteAction } from "../../../lib/actions";

export default function AddNotesClient() {
  const router = useRouter();
  const [kind, setKind] = useState<"call" | "chat">("call");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [note, setNote] = useState("");
  const [busy, start] = useTransition();

  const submit = () => {
    const form = new FormData();
    form.set("kind", kind);
    form.set("title", title || (kind === "call" ? "Call notes" : "Chat thread"));
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
            ? `Read it — ${r.proposals} proposal${r.proposals === 1 ? "" : "s"} waiting in Approvals.`
            : "Read it — no CRM change needed from this one.",
      );
      setBody("");
      setTitle("");
      router.refresh();
    });
  };

  return (
    <div className="card p-5">
      <div className="flex gap-2">
        {(
          [
            ["call", "phone", "Call notes"],
            ["chat", "msg", "WhatsApp / LinkedIn chat"],
          ] as const
        ).map(([k, icon, label]) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={`flex items-center gap-2 rounded-[10px] px-3.5 py-2 text-[13px] font-semibold ${
              kind === k ? "bg-primary-tint text-primary" : "border border-line text-ink2 hover:bg-canvas"
            }`}
          >
            <I n={icon} size={15} /> {label}
          </button>
        ))}
      </div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={kind === "call" ? "Title — e.g. Zoom call with Acme Corp" : "Title — e.g. WhatsApp with Sara Lee"}
        className="mt-4 w-full rounded-[10px] border border-line bg-white px-3.5 py-2.5 text-[13.5px]"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={9}
        placeholder={
          kind === "call"
            ? "Paste the call transcript or your notes here. The AI reads it and proposes CRM updates — nothing changes without your approval."
            : "Paste the chat thread here. The AI reads it and proposes CRM updates — nothing changes without your approval."
        }
        className="mt-3 w-full resize-y rounded-[10px] border border-line bg-white px-3.5 py-3 text-[13.5px] leading-relaxed"
      />
      <div className="mt-3 flex items-center gap-3">
        <button onClick={submit} disabled={busy || !body.trim()} className="btn-primary px-5 py-2.5 text-[13.5px] disabled:opacity-50">
          {busy ? "Reading…" : "Read with AI"}
        </button>
        {note && <span className="text-[13px] text-muted">{note}</span>}
      </div>
    </div>
  );
}
