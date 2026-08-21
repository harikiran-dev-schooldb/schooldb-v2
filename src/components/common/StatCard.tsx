import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: string;
    positive: boolean;
  };
  className?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  className,
}: StatCardProps) {
  const TrendIcon = trend?.positive ? ArrowUpRight : ArrowDownRight;

  return (
    <Card
      className={cn(
        "premium-card group relative overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/[0.07]",
        className,
      )}
    >
      {/* Subtle premium accent */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <CardContent className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              {title}
            </p>

            <p className="mt-3 truncate text-3xl font-bold tracking-[-0.04em] text-foreground">
              {value}
            </p>
          </div>

          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-primary/10 bg-primary/[0.08] text-primary transition-transform duration-300 group-hover:scale-110">
            <Icon className="size-5" strokeWidth={2} />
          </div>
        </div>

        {(description || trend) && (
          <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            {trend && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-1 font-semibold",
                  trend.positive
                    ? "bg-emerald-500/10 text-emerald-700"
                    : "bg-destructive/10 text-destructive",
                )}
              >
                <TrendIcon className="size-3" />
                {trend.value}
              </span>
            )}

            {description && (
              <span className="text-muted-foreground">{description}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
