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
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/90 shadow-[0_-8px_24px_rgba(80,40,10,0.06)] backdrop-blur-md">
      <div className="mx-auto grid max-w-lg grid-cols-3">
        {tabs.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold tracking-wide uppercase",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "flex size-9 items-center justify-center rounded-full",
                  active ? "bg-primary/10" : "bg-transparent",
                )}
              >
                <Icon className="size-6" />
              </span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
