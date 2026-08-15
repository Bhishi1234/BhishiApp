import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ActionTile({
  href,
  onClick,
  icon,
  label,
  children,
}: {
  href?: string;
  onClick?: () => void;
  icon: ReactNode;
  label: string;
  children?: ReactNode;
}) {
  const className = cn(
    "flex min-h-[4.5rem] flex-col items-center justify-center gap-1.5 rounded-2xl bg-secondary/80 px-2 text-center text-sm font-semibold",
  );

  if (children) {
    return <div className={className}>{children}</div>;
  }

  if (href) {
    return (
      <Link href={href} className={className}>
        {icon}
        {label}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {icon}
      {label}
    </button>
  );
}
