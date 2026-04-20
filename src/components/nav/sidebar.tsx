"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Calendar,
  Coins,
  FileUp,
  LayoutDashboard,
  ListChecks,
  PiggyBank,
  Receipt,
  Settings,
  Sparkles,
  Target,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: Receipt },
  { href: "/import", label: "Import", icon: FileUp },
  { href: "/budgets", label: "Budgets", icon: Wallet },
  { href: "/plans", label: "Future plans", icon: Calendar },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/bills", label: "Recurring bills", icon: ListChecks },
  { href: "/insights", label: "Advisor", icon: Sparkles },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-60 shrink-0 border-r bg-card/40 lg:flex lg:flex-col">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <PiggyBank className="h-4 w-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold leading-none">Penny Coach</span>
          <span className="text-xs text-muted-foreground">Budget. Plan. Thrive.</span>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {items.map((it) => {
          const active =
            pathname === it.href || (it.href !== "/dashboard" && pathname.startsWith(it.href));
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <it.icon className="h-4 w-4" />
              {it.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2 rounded-md bg-accent/50 px-3 py-2">
          <Coins className="h-3.5 w-3.5" />
          Educational — not financial advice.
        </div>
      </div>
    </aside>
  );
}
