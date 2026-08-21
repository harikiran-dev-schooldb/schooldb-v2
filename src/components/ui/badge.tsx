import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  [
    "inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1",
    "text-[11px] font-bold leading-none tracking-wide",
    "transition-colors",
  ].join(" "),
  {
    variants: {
      variant: {
        default: "border border-primary/15 bg-primary/10 text-primary",

        secondary:
          "border border-secondary/60 bg-secondary text-secondary-foreground",

        outline: "border border-border bg-transparent text-muted-foreground",

        destructive:
          "border border-destructive/15 bg-destructive/10 text-destructive",

        success:
          "border border-emerald-500/15 bg-emerald-500/10 text-emerald-700",

        warning: "border border-amber-500/15 bg-amber-500/10 text-amber-700",

        info: "border border-blue-500/15 bg-blue-500/10 text-blue-700",
      },
    },

    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
