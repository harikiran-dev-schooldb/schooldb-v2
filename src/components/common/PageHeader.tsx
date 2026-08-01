import { ReactNode } from "react";

type Props = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export function PageHeader({ title, description, action }: Props) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="mb-2 text-[11px] font-semibold tracking-[0.16em] text-primary uppercase">School management</p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-[2rem]">{title}</h1>

        {description && (
          <p className="mt-2 text-sm text-muted-foreground md:text-base">{description}</p>
        )}
      </div>

      {action}
    </div>
  );
}
