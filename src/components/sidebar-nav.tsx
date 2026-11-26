"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/approvals", label: "Approvals", badgeKey: "approvals" as const },
  { href: "/pipeline", label: "Pipeline" },
  { href: "/activity", label: "Activity" },
  { href: "/connections", label: "Connections" },
  { href: "/settings", label: "Settings" },
];

export default function SidebarNav({ pendingApprovals }: { pendingApprovals: number }) {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
      {ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        const badge = item.badgeKey === "approvals" ? pendingApprovals : 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-[14.5px] font-medium transition duration-200 ${
              active
                ? "bg-white font-semibold text-brand shadow-[0_1px_3px_rgba(27,43,66,0.08),0_6px_16px_-8px_rgba(27,43,66,0.18)] ring-1 ring-line"
                : "text-neutral-500 hover:bg-white/70 hover:text-neutral-900"
            }`}
          >
            {item.label}
            {badge > 0 && (
              <span className="ml-auto rounded-full bg-brand px-2 py-0.5 text-[11px] font-bold leading-none text-white shadow-[0_3px_8px_-2px_rgba(62,124,177,0.6)]">
                {badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
