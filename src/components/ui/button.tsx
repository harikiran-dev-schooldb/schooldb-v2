import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap",
    "rounded-xl text-sm font-semibold transition-all duration-200",
    "outline-none",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
    "focus-visible:ring-4 focus-visible:ring-primary/15",
    "active:scale-[0.98]",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_8px_20px_rgb(15_118_110_/_0.18)] hover:bg-primary/90 hover:shadow-[0_10px_25px_rgb(15_118_110_/_0.24)]",

        destructive:
          "bg-destructive text-white shadow-sm hover:bg-destructive/90 hover:shadow-md",

        outline:
          "border border-border/80 bg-card text-foreground shadow-sm hover:border-primary/25 hover:bg-primary/[0.04] hover:text-primary",

        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",

        ghost:
          "text-muted-foreground hover:bg-primary/[0.07] hover:text-foreground",

        link: "h-auto rounded-none px-0 text-primary underline-offset-4 hover:underline",
      },

      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg px-3 text-xs",
        lg: "h-11 px-6 text-sm",
        xl: "h-12 px-7 text-base",
        icon: "size-10 p-0",
        "icon-sm": "size-9 rounded-lg p-0",
        "icon-lg": "size-11 p-0",
      },
    },

    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
