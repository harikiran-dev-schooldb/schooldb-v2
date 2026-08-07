"use client";

type Props = {
  present: number;

  absent: number;

  late: number;

  leave: number;
};

export function AttendanceSummary({ present, absent, late, leave }: Props) {
  return (
    <div className="grid grid-cols-4 gap-4">
      <SummaryCard label="Present" value={present} />

      <SummaryCard label="Absent" value={absent} />

      <SummaryCard label="Late" value={late} />

      <SummaryCard label="Leave" value={leave} />
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-4 text-center">
      <div className="text-sm text-muted-foreground">{label}</div>

      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}
