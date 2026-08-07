"use client";

type Props = {
  className: string;
  section: string;
  subject: string;
  teacher: string;
  period: string;
  date: string;
};

export function AttendanceHeader({
  className,
  section,
  subject,
  teacher,
  period,
  date,
}: Props) {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">
            {className} - {section}
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Attendance Register
          </p>
        </div>

        <div className="text-sm text-muted-foreground">
          <span className="font-medium">Date:</span> {date}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard label="Teacher" value={teacher} />

        <InfoCard label="Subject" value={subject} />

        <InfoCard label="Period" value={period} />

        <InfoCard label="Class" value={`${className} - ${section}`} />
      </div>
    </div>
  );
}

type InfoCardProps = {
  label: string;
  value: string;
};

function InfoCard({ label, value }: InfoCardProps) {
  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>

      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}
