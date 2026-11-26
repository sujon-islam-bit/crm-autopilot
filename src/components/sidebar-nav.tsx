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
            className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-[14.5px] font-medium transition ${
              active
                ? "bg-brand-soft font-semibold text-brand"
                : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
            }`}
          >
            {item.label}
            {badge > 0 && (
              <span className="ml-auto rounded-full bg-brand px-2 py-0.5 text-[11px] font-bold leading-none text-white">
                {badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
