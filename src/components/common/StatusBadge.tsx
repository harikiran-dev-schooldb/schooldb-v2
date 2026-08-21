import type { StudentStatus } from "@/generated/prisma/client";

import { cn } from "@/lib/utils";

const statusConfig: Record<
  StudentStatus,
  {
    label: string;
    className: string;
    dotClassName: string;
  }
> = {
  ACTIVE: {
    label: "Active",
    className: "border-emerald-200/70 bg-emerald-50 text-emerald-700",
    dotClassName: "bg-emerald-500",
  },

  NOT_COMING: {
    label: "Not Coming",
    className: "border-amber-200/70 bg-amber-50 text-amber-700",
    dotClassName: "bg-amber-500",
  },

  INACTIVE: {
    label: "Inactive",
    className: "border-slate-200 bg-slate-100 text-slate-600",
    dotClassName: "bg-slate-400",
  },

  TC_ISSUED: {
    label: "TC Issued",
    className: "border-orange-200/70 bg-orange-50 text-orange-700",
    dotClassName: "bg-orange-500",
  },

  DROPPED: {
    label: "Dropped",
    className: "border-red-200/70 bg-red-50 text-red-700",
    dotClassName: "bg-red-500",
  },

  ALUMNI: {
    label: "Alumni",
    className: "border-blue-200/70 bg-blue-50 text-blue-700",
    dotClassName: "bg-blue-500",
  },
};

type Props = {
  status: StudentStatus;
  className?: string;
};

export function StatusBadge({ status, className }: Props) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap",
        config.className,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", config.dotClassName)} />

      {config.label}
    </span>
  );
}
