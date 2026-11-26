"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { I } from "./icons";
import { money } from "../lib/constants";
import type { ProposalCardData, SerializedMessage, ThreadSummary } from "../lib/assistant-types";
import {
  listAssistantThreadsAction,
  loadAssistantThreadAction,
  newAssistantThreadAction,
  sendAssistantMessageAction,
} from "../lib/assistant-actions";
import { approveAction, rejectAction } from "../lib/actions";

/*
 * Presentation cloned SAME-TO-SAME from BuilderAI's build chat (Sujon's
 * order): a calm plain-text conversation — no boxes around messages, lists
 * as text lines, the proposal result as the ONLY card. Thread access is a
 * single "Chat history" row in the main sidebar (Sujon's reference): it
 * dispatches an "assistant:open-history" window event, and this client
 * swaps the column to a plain in-page history list (Back / New chat /
 * thread rows) and back.
 * Palette taken from BuilderAI's globals.css :root tokens, applied to this
 * page only:
 *   brand #d23b72 · background #fafafa · foreground #161616 · card #ffffff
 *   muted fill #f0f0f0 (user pill, row hovers, secondary button)
 *   muted-foreground #5c5c5c · border #e6e6e6 · focus ring = brand
 * No CRM violet anywhere on this page.
 */
export default function AssistantClient({
  initialThreadId,
  initialMessages,
  initialLimit,
  initialRemaining,
}: {
  initialThreadId: string;
  initialMessages: SerializedMessage[];
  initialLimit: number;
  initialRemaining: number;
}) {
  const [threadId, setThreadId] = useState(initialThreadId);
  const [messages, setMessages] = useState<SerializedMessage[]>(initialMessages);
  const [limit, setLimit] = useState(initialLimit);
  const [remaining, setRemaining] = useState(initialRemaining);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const limited = remaining <= 0;
  const [loadingThread, setLoadingThread] = useState(false);
  const [view, setView] = useState<"chat" | "history">("chat");
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const empty = messages.length === 0;

  // The messages region scrolls internally (the composer is pinned by the
  // full-height flex layout, not by scrolling the page) — keep the latest
  // message in view by scrolling that region only.
  useEffect(() => {
    if (!empty && view === "chat") {
      const el = scrollRef.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages, sending, empty, view]);

  async function send(text: string) {
    const clean = text.trim();
    if (!clean || sending) return;
    setInput("");
    setSending(true);
    const optimistic: SerializedMessage = {
      id: `local-${Date.now()}`,
      role: "user",
      content: clean,
      narration: null,
      blocks: [],
      proposal: null,
      createdAt: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);
    try {
      const r = await sendAssistantMessageAction(threadId, clean);
      if (r.ok) {
        setThreadId(r.threadId);
        setMessages((m) => [...m.filter((x) => x.id !== optimistic.id), ...r.messages]);
        if (typeof r.limit === "number") setLimit(r.limit);
        if (typeof r.remaining === "number") setRemaining(r.remaining);
      } else {
        setMessages((m) => [
          ...m,
          errorMessage(r.error ?? "Something went wrong — please try again."),
        ]);
      }
    } catch {
      setMessages((m) => [...m, errorMessage("Something went wrong sending that — please try again.")]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function errorMessage(content: string): SerializedMessage {
    return {
      id: `local-err-${Date.now()}`,
      role: "assistant",
      content,
      narration: null,
      blocks: [],
      proposal: null,
      createdAt: new Date().toISOString(),
    };
  }

  function newChat() {
    if (sending) return;
    startTransition(async () => {
      const r = await newAssistantThreadAction();
      setThreadId(r.threadId);
      setMessages([]);
      setInput("");
      inputRef.current?.focus();
    });
  }

  async function openThread(id: string) {
    if (id === threadId || sending || loadingThread) return;
    setLoadingThread(true);
    try {
      const r = await loadAssistantThreadAction(id);
      if (r.ok) {
        setThreadId(id);
        setMessages(r.messages);
        setInput("");
      }
    } finally {
      setLoadingThread(false);
    }
  }

  // History view: the sidebar's single "Chat history" row dispatches
  // "assistant:open-history"; this client swaps the column to the thread
  // list (freshly loaded) and back. Ref keeps the listener on the latest
  // closure.
  async function openHistory() {
    setView("history");
    const r = await listAssistantThreadsAction().catch(() => null);
    if (r) setThreads(r.threads);
  }
  const openHistoryRef = useRef(openHistory);
  openHistoryRef.current = openHistory;
  useEffect(() => {
    const onOpen = () => void openHistoryRef.current();
    window.addEventListener("assistant:open-history", onOpen);
    return () => window.removeEventListener("assistant:open-history", onOpen);
  }, []);

  function pickThread(id: string) {
    setView("chat");
    void openThread(id);
  }

  function startNewChat() {
    setView("chat");
    newChat();
  }

  const composer = (atBottom: boolean) => (
    <div className={atBottom ? "shrink-0 bg-[#fafafa] pt-2 pb-5" : ""}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="rounded-2xl border border-[#e6e6e6] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-colors focus-within:border-[#d23b72]"
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(input);
            }
          }}
          rows={1}
          disabled={limited}
          placeholder={limited ? "Today's assistant limit reached" : "Ask anything or tell me what to do…"}
          style={{ boxShadow: "none" }}
          className="w-full resize-none border-0 bg-transparent px-4 pt-3.5 pb-1 text-[14px] text-[#161616] shadow-none outline-none placeholder:text-[#9a9a9a] focus:shadow-none disabled:cursor-not-allowed"
        />
        <div className="flex items-center px-3 pb-2.5">
          <span className="pl-1 text-[12px] text-[#5c5c5c]">
            Workspace data only — nothing sends without your approval
          </span>
          <button
            type="submit"
            aria-label="Send"
            disabled={sending || limited || !input.trim()}
            className="ml-auto flex size-9 shrink-0 items-center justify-center rounded-full bg-[#d23b72] text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            <I n="arrowR" size={16} className="-rotate-90" />
          </button>
        </div>
      </form>
      <p className={`mt-2 text-center text-[11.5px] ${limited ? "font-semibold text-red" : "text-[#5c5c5c]"}`}>
        {limited
          ? `0 of ${limit} left today — the limit resets tomorrow, or an admin can raise it in Settings → AI Preferences.`
          : `${remaining} of ${limit} left today`}
      </p>
    </div>
  );

  const threadTitle =
    messages.find((m) => m.role === "user")?.content ?? "AI Assistant";

  return (
    /* Full-height column: the root fills <main> exactly, the messages
       region scrolls internally, and the composer is always the last
       element at the bottom edge of the screen — even for a one-message
       conversation (Sujon's circled-screenshot correction). */
    <div className="flex h-full bg-[#fafafa] text-[#161616]">
      {/* ---- Chat column (history lives in the main sidebar) ---- */}
      <div className="mx-auto flex min-h-0 w-full max-w-[760px] min-w-0 flex-1 flex-col px-6 pt-6">
        {view === "history" ? (
          /* History view — a plain list in the same centered column:
             ← Back, a New chat row at the top, then the threads as plain
             text rows (title + date/time), hover fill only, no boxes. */
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="flex flex-col pb-8">
            <div className="flex items-center">
              <button
                onClick={() => setView("chat")}
                className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-[#d23b72] hover:underline"
              >
                <I n="arrowR" size={14} className="rotate-180" /> Back
              </button>
            </div>
            <h1 className="mt-5 text-[20px] font-semibold tracking-tight text-[#161616]">Chat history</h1>
            <div className="mt-4 flex flex-col">
              <button
                onClick={startNewChat}
                className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[14px] font-medium text-[#161616] transition-colors hover:bg-[#f0f0f0]"
              >
                <I n="plus" size={15} className="shrink-0 text-[#d23b72]" /> New chat
              </button>
              {threads.length === 0 && (
                <p className="px-3 py-3 text-[13.5px] text-[#5c5c5c]">
                  No conversations yet — your chats will appear here.
                </p>
              )}
              {threads.map((t) => (
                <button
                  key={t.threadId}
                  onClick={() => pickThread(t.threadId)}
                  className="rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-[#f0f0f0]"
                >
                  <span
                    className={`block truncate text-[14px] text-[#161616] ${t.threadId === threadId ? "font-semibold" : ""}`}
                  >
                    {t.title}
                  </span>
                  <span className="mt-0.5 block text-[12px] text-[#5c5c5c]">{formatWhen(t.updatedAt)}</span>
                </button>
              ))}
            </div>
            </div>
          </div>
        ) : empty ? (
          /* Welcome state — SPLIT layout (Sujon's final correction): the
             TEXT (sparkle + heading) stays vertically CENTERED in the
             middle of the page, and ONLY the composer sits pinned at the
             very bottom — the same composer(true) wrapper as the
             conversation state, so its bottom edge is flush with the
             main area's bottom and it never jumps on the first message.
             No sub-line, no suggestion cards. */
          <>
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
              <I n="sparkle" size={26} className="text-[#161616]" />
              <h1 className="mt-4 text-center text-[24px] font-semibold tracking-tight text-[#161616]">
                What should I do for your pipeline?
              </h1>
            </div>
            {composer(true)}
          </>
        ) : (
          <>
            {/* Conversation state — slim plain title row, then the messages
                in their own flex-1 scroll region; the composer below is the
                column's last child, pinned to the bottom edge by layout. */}
            <div className="flex items-center gap-2">
              <h1 className="min-w-0 truncate text-[15px] font-semibold text-[#161616]">{threadTitle}</h1>
            </div>

            <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
              <div className="flex flex-col gap-6 pt-6 pb-2">
              {messages.map((m) =>
                m.role === "user" ? (
                  <div key={m.id} className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl bg-[#f0f0f0] px-4 py-2.5 text-[14px] leading-relaxed whitespace-pre-wrap text-[#161616]">
                      {m.content}
                    </div>
                  </div>
                ) : (
                  <div key={m.id} className="text-[14px] leading-relaxed text-[#161616]">
                    {m.narration && (
                      <div className="mb-1.5 flex items-center gap-1.5 text-[13px] text-[#5c5c5c]">
                        <I n="sparkle" size={13} className="shrink-0 text-[#d23b72]" /> {m.narration}
                      </div>
                    )}
                    <div className="whitespace-pre-wrap">{m.content}</div>
                    {m.blocks.map((b, i) =>
                      b.kind === "deals" ? (
                        <div key={i} className="mt-2.5 flex flex-col gap-[7px]">
                          {b.rows.map((d) => (
                            <p key={d.name} className="text-[14px] leading-relaxed">
                              <span className="font-semibold text-[#161616]">{d.name}</span>
                              <span className="text-[#5c5c5c]">
                                {" — "}
                                {d.company ? `${d.company} · ` : ""}
                                {d.stage}
                                {d.amount != null ? ` · ${money(d.amount)}` : ""} · {d.daysSilent} days
                                silent ·{" "}
                              </span>
                              <span
                                className={`font-medium ${d.risk === "High" ? "text-red" : "text-amber"}`}
                              >
                                {d.risk} risk
                              </span>
                            </p>
                          ))}
                        </div>
                      ) : (
                        <Link
                          key={i}
                          href={b.href}
                          className="mt-2.5 inline-block text-[13.5px] font-medium text-[#d23b72] hover:underline"
                        >
                          {b.label}
                        </Link>
                      ),
                    )}
                    {m.proposal && (
                      <ProposalCard
                        card={m.proposal}
                        onStatus={(status) =>
                          setMessages((all) =>
                            all.map((x) =>
                              x.id === m.id && x.proposal ? { ...x, proposal: { ...x.proposal, status } } : x,
                            ),
                          )
                        }
                      />
                    )}
                  </div>
                ),
              )}
              {sending && (
                <div className="flex items-center gap-2 text-[13.5px] text-[#5c5c5c]">
                  <span className="animate-pulse text-[#d23b72]">✦</span>
                  Looking at your workspace data…
                </div>
              )}
              {loadingThread && <div className="text-[13.5px] text-[#5c5c5c]">Loading conversation…</div>}
              </div>
            </div>

            {composer(true)}
          </>
        )}
      </div>
    </div>
  );
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(d);
  const time = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(d);
  return `${date} · ${time}`;
}

function ProposalCard({
  card,
  onStatus,
}: {
  card: ProposalCardData;
  onStatus: (status: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = card.status === "pending";

  async function decide(kind: "approve" | "dismiss") {
    setBusy(true);
    setError(null);
    try {
      const r = (kind === "approve" ? await approveAction(card.id) : await rejectAction(card.id)) as {
        ok: boolean;
        error?: string;
      };
      if (r.ok) onStatus(kind === "approve" ? "applied" : "rejected");
      else setError(r.error ?? "That didn't go through — open it in Approvals to decide there.");
    } catch {
      setError("That didn't go through — open it in Approvals to decide there.");
    } finally {
      setBusy(false);
    }
  }

  const statusLine =
    card.status === "applied"
      ? "Proposal · Approved & applied"
      : card.status === "rejected"
        ? "Proposal · Dismissed"
        : card.status === "undone"
          ? "Proposal · Rolled back"
          : card.status === "failed"
            ? "Proposal · Failed"
            : "Proposal created — waiting for your approval";

  /* The ONLY card in the conversation — BuilderAI's created-agent card:
     one subtle border on white, title + muted status, actions on the right. */
  return (
    <div className="mt-3 rounded-xl border border-[#e6e6e6] bg-white px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1 basis-60">
          <div className="flex items-center gap-1.5 text-[14px] font-medium text-[#161616]">
            <I n="sparkle" size={14} className="shrink-0 text-[#d23b72]" />
            <span className="break-words">{card.title}</span>
          </div>
          <p className="mt-0.5 text-[12.5px] text-[#5c5c5c]">{statusLine}</p>
          <p className="mt-1 text-[13.5px] leading-relaxed text-[#3c3f4d]">{card.summary}</p>
        </div>
        {pending && card.canDecide && (
          <div className="ml-auto flex shrink-0 gap-2">
            <button
              onClick={() => void decide("dismiss")}
              disabled={busy}
              className="rounded-lg bg-[#f0f0f0] px-4 py-[7px] text-[13px] font-medium text-[#161616] transition-colors hover:bg-[#e6e6e6] disabled:opacity-50"
            >
              Dismiss
            </button>
            <button
              onClick={() => void decide("approve")}
              disabled={busy}
              className="rounded-lg bg-[#d23b72] px-4 py-[7px] text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "Working…" : "Approve"}
            </button>
          </div>
        )}
      </div>
      {pending && !card.canDecide && (
        <p className="mt-2 text-[12.5px] text-[#5c5c5c]">
          Your role can view this proposal but not decide it — an Owner, Admin or Manager can approve it in{" "}
          <Link href="/approvals" className="font-medium text-[#d23b72] hover:underline">
            Approvals
          </Link>
          .
        </p>
      )}
      {error && <p className="mt-2 text-[12.5px] text-red">{error}</p>}
    </div>
  );
}
