import { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type StatCardProps = {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: string;
    positive?: boolean;
  };
};

export function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
}: StatCardProps) {
  return (
    <Card className="premium-card transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_42px_rgb(15_23_42/0.1)]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>

        <div className="rounded-xl bg-primary/10 p-2.5 ring-1 ring-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </CardHeader>

      <CardContent>
        <div className="text-3xl font-bold tracking-[-0.04em]">{value}</div>

        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}

        {trend && (
          <p
            className={`mt-3 text-xs font-semibold ${
              trend.positive ? "text-primary" : "text-destructive"
            }`}
          >
            {trend.value}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
