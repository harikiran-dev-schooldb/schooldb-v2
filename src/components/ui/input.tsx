import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-10 w-full min-w-0 rounded-xl border border-input bg-card px-3.5 py-2",
        "text-sm text-foreground shadow-sm transition-all duration-200",
        "placeholder:text-muted-foreground/70",
        "hover:border-primary/25",
        "focus-visible:border-primary/50 focus-visible:ring-4 focus-visible:ring-primary/10",
        "outline-none",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
