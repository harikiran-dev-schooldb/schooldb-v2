import { ReactNode } from "react";

type Props = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export function PageHeader({ title, description, action }: Props) {
  return (
    <div className="mb-8 flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>

        {description && (
          <p className="mt-2 text-muted-foreground">{description}</p>
        )}
      </div>

      {action}
    </div>
  );
}
