import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

export function PageHeader({
  backHref,
  backLabel = "Back",
  kicker,
  title,
  subtitle,
  action,
}: {
  backHref?: string;
  backLabel?: string;
  kicker?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6">
      {backHref ? (
        <Link
          href={backHref}
          className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted-foreground"
        >
          <ArrowLeft className="size-4" /> {backLabel}
        </Link>
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <div>
          {kicker ? (
            <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
              {kicker}
            </p>
          ) : null}
          <h1 className="text-[1.9rem] leading-[1.15] font-bold tracking-tight">{title}</h1>
          {subtitle ? (
            <p className="mt-2 text-base leading-relaxed text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        {action}
      </div>
    </div>
  );
}
