import { ReactNode } from "react";

type Props = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export function PageHeader({ title, description, action }: Props) {
  return (
    <div className="mb-9 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between md:mb-10">
      <div>
        <p className="mb-2 text-[10px] font-bold tracking-[0.18em] text-primary uppercase">School management</p>
        <h1 className="text-3xl font-bold tracking-[-0.04em] text-foreground md:text-[2.2rem]">{title}</h1>

        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">{description}</p>
        )}
      </div>

      {action}
    </div>
  );
}
