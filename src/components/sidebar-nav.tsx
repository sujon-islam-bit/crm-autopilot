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
                ? "bg-lime font-semibold text-stone-900"
                : "text-stone-500 hover:bg-white hover:text-stone-900"
            }`}
          >
            {item.label}
            {badge > 0 && (
              <span
                className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-bold leading-none ${
                  active ? "bg-pine text-white" : "bg-lime text-stone-900"
                }`}
              >
                {badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
