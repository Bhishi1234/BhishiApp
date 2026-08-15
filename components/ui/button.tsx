import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-base font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-white shadow-[0_8px_18px_rgba(37,99,235,0.28)] hover:bg-[#1d4ed8]",
        secondary: "bg-secondary text-foreground hover:bg-[#d7e8ff]",
        outline: "border border-border bg-white text-foreground hover:bg-muted",
        ghost: "hover:bg-muted text-foreground",
        accent: "bg-accent text-foreground hover:bg-[#cfe0ff]",
      },
      size: {
        default: "h-12 px-5",
        sm: "h-10 px-3 text-sm",
        lg: "h-14 px-6 text-lg",
        icon: "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}
