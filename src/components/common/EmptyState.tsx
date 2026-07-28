import { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
};

export function EmptyState({
  title,
  description,
  icon,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
      {icon}

      <h2 className="mt-4 text-xl font-semibold">{title}</h2>

      <p className="mt-2 max-w-md text-muted-foreground">{description}</p>

      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
