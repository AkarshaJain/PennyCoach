"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileUp,
  LayoutDashboard,
  Receipt,
  Sparkles,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/transactions", label: "Logs", icon: Receipt },
  { href: "/import", label: "Import", icon: FileUp },
  { href: "/budgets", label: "Budget", icon: Wallet },
  { href: "/insights", label: "Coach", icon: Sparkles },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="sticky bottom-0 z-30 flex border-t bg-card/90 backdrop-blur lg:hidden">
      {items.map((it) => {
        const active =
          pathname === it.href || (it.href !== "/dashboard" && pathname.startsWith(it.href));
        return (
          <Link
            key={it.href}
            href={it.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium",
              active ? "text-primary" : "text-muted-foreground",
            )}
          >
            <it.icon className="h-4 w-4" />
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
