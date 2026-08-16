import * as React from "react";
import { cn } from "@/lib/utils";

export function Select({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "flex h-12 w-full appearance-none rounded-xl border border-input bg-white bg-[length:12px] bg-[right_1rem_center] bg-no-repeat px-4 pr-10 text-base text-foreground shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%228%22 viewBox=%220 0 12 8%22><path fill=%22%233d4f66%22 d=%22M1.2 1.4 6 6.2 10.8 1.4%22/></svg>')]",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
