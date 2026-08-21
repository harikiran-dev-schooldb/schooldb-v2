import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

type Props = {
  title?: string;
  description?: string;
  action?: ReactNode;
};

export function DataGridEmpty({
  title = "No records found",
  description = "There are no records matching your current view.",
  action,
}: Props) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center px-6 py-10 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl border border-primary/10 bg-primary/[0.08] text-primary">
        <Inbox className="size-6" strokeWidth={1.8} />
      </div>

      <h3 className="mt-4 text-base font-bold tracking-tight text-foreground">
        {title}
      </h3>

      <p className="mt-1.5 max-w-sm text-sm leading-6 text-muted-foreground">
        {description}
      </p>

      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
