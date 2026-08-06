"use client";

type Props = {
  subject: string;
  teacher: string;
};

export function TimetableCell({ subject, teacher }: Props) {
  return (
    <div className="min-h-24 rounded-md border bg-muted/30 p-2">
      <div className="font-semibold text-sm">{subject}</div>

      <div className="mt-1 text-xs text-muted-foreground">{teacher}</div>
    </div>
  );
}
