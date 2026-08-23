"use client";

import { BookOpen, UserRound } from "lucide-react";

type Props = {
  subject: string;
  teacher: string;
};

export function TimetableCell({ subject, teacher }: Props) {
  return (
    <div className="group relative min-h-[105px] overflow-hidden rounded-xl border bg-background p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
      <div className="absolute inset-y-0 left-0 w-1 bg-primary/70" />

      <div className="pl-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BookOpen className="size-3.5" />
          </div>
        </div>

        <p className="mt-3 line-clamp-2 text-sm font-semibold leading-tight">
          {subject}
        </p>

        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <UserRound className="size-3.5 shrink-0" />

          <span className="truncate">{teacher}</span>
        </div>
      </div>
    </div>
  );
}
