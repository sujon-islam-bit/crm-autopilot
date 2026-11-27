"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { I, LogoMark } from "./icons";

const NAV: { href: string; label: string; icon: string; badge?: boolean }[] = [
  { href: "/dashboard", label: "Dashboard", icon: "home" },
  { href: "/approvals", label: "Approvals", icon: "inbox", badge: true },
  { href: "/pipeline", label: "Pipeline", icon: "chart" },
  { href: "/hygiene", label: "Data Cleanup", icon: "shield" },
  { href: "/deals", label: "Deals & Contacts", icon: "briefcase" },
  { href: "/activity", label: "History", icon: "sync" },
  { href: "/settings", label: "Settings", icon: "gear" },
  { href: "/connections", label: "Connections", icon: "plug" },
  { href: "/help", label: "Help", icon: "help" },
];

export function Avatar({ name, size = 34 }: { name: string; size?: number }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: "linear-gradient(135deg,#7aa5f8,#2b6bf0 55%,#7c5cf0)",
      }}
    >
      {initials}
    </span>
  );
}

const TOP_HREFS = ["/dashboard", "/approvals", "/pipeline", "/hygiene", "/deals", "/activity"];

export default function Sidebar({
  pendingCount,
  userName,
  userRole,
  hiddenHrefs = [],
}: {
  pendingCount: number;
  userName: string;
  userRole: string;
  /** Pages this role cannot see at all (page-visibility rules) — their
   *  links are not rendered. The pages also redirect server-side. */
  hiddenHrefs?: string[];
}) {
  const path = usePathname();
  const router = useRouter();
  // ⌘K / Ctrl+K jumps to the AI Assistant from anywhere in the app.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        router.push("/assistant");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  // While on /assistant, ONE extra row lives under the AI Assistant
  // button: "Chat history" (Sujon's reference). It is a plain nav-style
  // row — the thread list itself opens inside the assistant page, which
  // owns the conversation state; the click is handed over via a window
  // event. Nothing else in the sidebar changes.
  const onAssistant = path === "/assistant";
  const visible = NAV.filter((item) => !hiddenHrefs.includes(item.href));
  const top = visible.filter((item) => TOP_HREFS.includes(item.href));
  const bottom = visible.filter((item) => !TOP_HREFS.includes(item.href));
  return (
    <aside className="flex h-screen w-[204px] shrink-0 flex-col border-r border-line bg-sidebar px-3.5 py-5">
      <div className="flex items-center gap-2.5 px-1.5">
        <LogoMark size={32} />
        <div className="leading-tight">
          <div className="text-[16px] font-bold tracking-tight">Vouchso</div>
          <div className="text-[11px] text-muted">CRM Autopilot</div>
        </div>
      </div>

      {/* AI Assistant — visible to every role; a page, not a nav row. */}
      <Link
        href="/assistant"
        className={`mt-6 flex items-center gap-2.5 rounded-[10px] px-2.5 py-[9px] text-[13.5px] font-semibold text-white shadow-[0_4px_14px_rgba(210,59,114,0.25)] transition-colors ${
          path === "/assistant" ? "bg-[#bc3163]" : "bg-[#d23b72] hover:bg-[#bc3163]"
        }`}
      >
        <I n="sparkle" size={16} />
        <span className="flex-1">AI Assistant</span>
        <kbd className="rounded-[5px] bg-white/20 px-1.5 py-px text-[11px] font-semibold">⌘K</kbd>
      </Link>

      {/* Middle region (Chats + nav) scrolls if space ever gets tight —
          the logo, AI Assistant button, bottom card and user row above and
          below it never move, shrink or restyle. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {/* Chat history — a single quiet nav-style row, only on
            /assistant. Opens the thread list inside the assistant page. */}
        {onAssistant && (
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("assistant:open-history"))}
            className="mt-2 flex items-center gap-2.5 rounded-[10px] px-2.5 py-[7px] text-left text-[13.5px] font-medium text-ink2 transition-colors hover:bg-white/70 hover:text-ink"
          >
            <I n="clock" size={17} />
            <span className="flex-1">Chat history</span>
          </button>
        )}

        <nav className="mt-4 flex flex-col gap-0.5">
          {top.map((item) => (
            <NavRow key={item.href} item={item} active={path === item.href} pendingCount={pendingCount} />
          ))}
          <div className="my-3.5 border-t border-line/70" />
          {bottom.map((item) => (
            <NavRow key={item.href} item={item} active={path === item.href} pendingCount={pendingCount} />
          ))}
        </nav>
      </div>

      <div className="mt-auto">
        <div className="rounded-2xl bg-sidebar-card p-4">
          <p className="text-[12.5px] leading-snug text-ink2">
            AI is working for you
            <br />— not the other way.
          </p>
          <Link
            href="/help"
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-[12.5px] font-semibold text-primary shadow-sm"
          >
            Ask a Question <I n="arrowR" size={13} sw={2.2} />
          </Link>
        </div>
        <div className="mt-4 flex items-center gap-2.5 px-1.5">
          <Avatar name={userName} size={34} />
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-[13.5px] font-semibold">{userName}</div>
            <div className="text-[11.5px] text-muted">{userRole}</div>
          </div>
          <I n="chevD" size={15} className="text-faint" />
        </div>
      </div>
    </aside>
  );
}

function NavRow({
  item,
  active,
  pendingCount,
}: {
  item: (typeof NAV)[number];
  active: boolean;
  pendingCount: number;
}) {
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-2.5 rounded-[10px] px-2.5 py-[7px] text-[13.5px] transition-colors ${
        active
          ? "bg-primary-tint font-semibold text-primary"
          : "font-medium text-ink2 hover:bg-white/70 hover:text-ink"
      }`}
    >
      <I n={item.icon as never} size={17} sw={active ? 2.1 : 1.9} />
      <span className="flex-1">{item.label}</span>
      {item.badge && pendingCount > 0 && (
        <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red px-1 text-[10.5px] font-bold text-white">
          {pendingCount}
        </span>
      )}
    </Link>
  );
}
