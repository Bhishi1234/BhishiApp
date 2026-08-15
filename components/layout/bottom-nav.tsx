"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, CircleUserRound, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/groups", label: "Groups", icon: Users },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/profile", label: "Profile", icon: CircleUserRound },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur">
      <div className="mx-auto grid max-w-lg grid-cols-3">
        {tabs.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-semibold",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="size-6" />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
