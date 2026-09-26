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
    <section className="space-y-6">
      <div className="relative overflow-hidden rounded-[26px] border border-border/60 bg-card/90 px-5 py-5 shadow-[0_16px_48px_rgba(15,23,42,0.05)] backdrop-blur-xl sm:px-6 print:hidden">
        <div className="pointer-events-none absolute -right-16 -top-20 size-40 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="relative flex items-start gap-4">
          <span className="mt-1 flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 shadow-[0_10px_24px_rgba(79,70,229,0.2)]">
            <span className="size-2 rounded-full bg-white" />
          </span>
          <div>
            <h2 className="text-2xl font-black tracking-[-0.035em] text-foreground">{title}</h2>
            <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{description}</p>
          </div>
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
    <Card className="rounded-[22px] border-border/60 bg-card/90 shadow-[0_14px_38px_rgba(15,23,42,0.05)]">
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
      <span className="flex size-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 ring-1 ring-indigo-500/10 dark:text-indigo-400">
        <Icon className="size-7" />
      </span>
      <p className="mt-4 font-semibold">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
