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
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>

        <div className="rounded-lg bg-primary/10 p-2">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </CardHeader>

      <CardContent>
        <div className="text-3xl font-bold">{value}</div>

        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}

        {trend && (
          <p
            className={`mt-3 text-sm font-medium ${
              trend.positive ? "text-green-600" : "text-red-600"
            }`}
          >
            {trend.value}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
