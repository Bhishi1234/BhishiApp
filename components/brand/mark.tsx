import Link from "next/link";
import { cn } from "@/lib/utils";

export function BrandMark({
  href,
  compact = false,
}: {
  href?: string;
  compact?: boolean;
}) {
  const inner = (
    <>
      <div
        className={cn(
          "flex items-center justify-center rounded-2xl bg-gradient-to-br from-[#60a5fa] to-[#2563eb] font-bold text-white shadow-[0_8px_18px_rgba(37,99,235,0.28)]",
          compact ? "size-9 text-base" : "size-11 text-lg",
        )}
      >
        भ
      </div>
      <div>
        <p className={cn("font-bold tracking-tight", compact ? "text-base" : "text-lg")}>Bhishi</p>
        {compact ? null : (
          <p className="text-sm text-muted-foreground">भिशी · कमेटी · बचत गट</p>
        )}
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className="mb-8 flex items-center gap-3">
        {inner}
      </Link>
    );
  }

  return <div className="flex items-center gap-3">{inner}</div>;
}
