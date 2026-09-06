import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

export function SelfServicePage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-5">
      <div className="flex items-start gap-3 print:hidden">
        <span className="mt-2 size-2 shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 shadow-[0_0_0_5px_rgba(99,102,241,0.10)]" />
        <div>
          <h2 className="text-xl font-bold tracking-[-0.025em]">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

export function SelfServiceStatCard({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <Card className="border-white/80 bg-white/90 shadow-[0_14px_38px_rgba(15,23,42,0.05)]">
      <CardContent className="p-5">
        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-bold tracking-[-0.025em]">{value}</p>
      </CardContent>
    </Card>
  );
}

export function SelfServiceEmptyState({
  icon: Icon,
  title,
  description,
  className = "min-h-48",
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <div className={`flex ${className} flex-col items-center justify-center p-6 text-center`}>
      <span className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-100 text-indigo-600 ring-1 ring-indigo-100">
        <Icon className="size-7" />
      </span>
      <p className="mt-4 font-semibold">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
