"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, CircleUserRound, Users } from "lucide-react";
import { useT } from "@/components/i18n/locale-provider";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useT();
  const tabs = [
    { href: "/groups", label: t("navGroups"), icon: Users },
    { href: "/alerts", label: t("navAlerts"), icon: Bell },
    { href: "/profile", label: t("navProfile"), icon: CircleUserRound },
  ];

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white/90 shadow-[0_-10px_30px_rgba(37,99,235,0.08)] backdrop-blur-md">
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
                  active ? "bg-primary/12 text-primary" : "bg-transparent",
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
