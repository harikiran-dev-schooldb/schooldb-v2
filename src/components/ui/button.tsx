import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-xl border border-transparent bg-clip-padding text-sm font-semibold whitespace-nowrap shadow-sm transition-all duration-200 outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-b from-primary to-primary/90 text-primary-foreground shadow-primary/20 ring-1 ring-inset ring-white/15 hover:shadow-md hover:from-primary/90 hover:to-primary",
        outline:
          "border-slate-200/60 bg-white/50 backdrop-blur-sm text-slate-700 hover:border-slate-300 hover:bg-white hover:text-slate-900 hover:shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-300",
        secondary:
          "bg-slate-100/80 text-slate-900 ring-1 ring-inset ring-slate-200/50 hover:bg-slate-200/80",
        ghost:
          "shadow-none hover:bg-slate-100/80 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white",
        destructive:
          "bg-gradient-to-b from-red-500 to-red-600 text-white shadow-red-500/20 ring-1 ring-inset ring-white/15 hover:from-red-600 hover:to-red-700 hover:shadow-md",
        link: "text-primary underline-offset-4 shadow-none hover:underline",
      },
      size: {
        default: "h-9 gap-2 px-4",
        xs: "h-6 gap-1 rounded-lg px-2 text-xs",
        sm: "h-8 gap-1.5 rounded-lg px-3 text-xs",
        lg: "h-10 gap-2 rounded-xl px-6 text-base",
        icon: "size-9",
        "icon-xs": "size-6 rounded-lg",
        "icon-sm": "size-8 rounded-lg",
        "icon-lg": "size-10 rounded-xl",
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
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
