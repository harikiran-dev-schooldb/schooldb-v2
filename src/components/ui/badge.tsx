import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "group/badge inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-full border border-transparent px-2.5 py-0.5 text-[11px] font-bold tracking-wide uppercase whitespace-nowrap transition-all focus-visible:ring-3 focus-visible:ring-ring/50 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-600/20",
        secondary:
          "bg-slate-100/80 text-slate-600 ring-1 ring-inset ring-slate-500/15",
        destructive: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20",
        warning:
          "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20",
        outline: "border-slate-200 text-slate-700 bg-white/50 backdrop-blur-sm",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span";

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
