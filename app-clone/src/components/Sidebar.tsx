"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

export default function Sidebar({
  pendingCount,
  userName,
  userRole,
}: {
  pendingCount: number;
  userName: string;
  userRole: string;
}) {
  const path = usePathname();
  return (
    <aside className="flex h-screen w-[204px] shrink-0 flex-col border-r border-line bg-sidebar px-3.5 py-5">
      <div className="flex items-center gap-2.5 px-1.5">
        <LogoMark size={32} />
        <div className="leading-tight">
          <div className="text-[16px] font-bold tracking-tight">CleanPipe</div>
          <div className="text-[11px] text-muted">CRM Autopilot</div>
        </div>
      </div>

      <nav className="mt-7 flex flex-col gap-0.5">
        {NAV.slice(0, 6).map((item) => (
          <NavRow key={item.href} item={item} active={path === item.href} pendingCount={pendingCount} />
        ))}
        <div className="my-3.5 border-t border-line/70" />
        {NAV.slice(6).map((item) => (
          <NavRow key={item.href} item={item} active={path === item.href} pendingCount={pendingCount} />
        ))}
      </nav>

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
