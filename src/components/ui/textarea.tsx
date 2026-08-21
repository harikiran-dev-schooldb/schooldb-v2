import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-28 w-full resize-y rounded-xl border border-input bg-card px-3.5 py-3",
        "text-sm leading-6 text-foreground shadow-sm transition-all duration-200",
        "placeholder:text-muted-foreground/70",
        "hover:border-primary/25",
        "focus-visible:border-primary/50 focus-visible:ring-4 focus-visible:ring-primary/10",
        "outline-none",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
