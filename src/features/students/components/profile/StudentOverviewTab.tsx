"use client";

import {
  CalendarDays,
  Mail,
  Phone,
  UserRound,
  VenusAndMars,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Student = {
  admissionNo: string;
  fullName: string;
  gender: string;
  dob: string | null;
  phone: string | null;
  email: string | null;
};

type Props = {
  student: Student;
};

function formatDate(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "S"
  );
}

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="group rounded-2xl border bg-card p-4 transition-colors hover:bg-muted/30">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-4.5" />
        </div>

        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>

          <p className="mt-1 truncate font-semibold text-foreground">{value}</p>
        </div>
      </div>
    </div>
  );
}

export function StudentOverviewTab({ student }: Props) {
  const initials = getInitials(student.fullName);

  return (
    <div className="space-y-5">
      {/* Student identity */}

      <Card className="overflow-hidden rounded-2xl border shadow-sm">
        <div className="h-1 bg-primary" />

        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex size-20 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-2xl font-bold text-primary">
              {initials}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Student Information
              </p>

              <h2 className="mt-1 truncate text-xl font-bold tracking-tight">
                {student.fullName}
              </h2>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-lg border bg-muted/40 px-3 py-1.5 text-xs font-semibold">
                  Admission No: {student.admissionNo}
                </span>

                <span className="rounded-lg border bg-muted/40 px-3 py-1.5 text-xs font-semibold">
                  {student.gender}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal information */}

      <Card className="rounded-2xl border shadow-sm">
        <CardHeader className="border-b bg-muted/20">
          <CardTitle className="flex items-center gap-2 text-base">
            <UserRound className="size-5 text-primary" />
            Personal Information
          </CardTitle>

          <p className="text-sm text-muted-foreground">
            Basic personal details of the student.
          </p>
        </CardHeader>

        <CardContent className="p-5 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <InfoItem
              icon={UserRound}
              label="Admission Number"
              value={student.admissionNo || "—"}
            />

            <InfoItem
              icon={UserRound}
              label="Student Name"
              value={student.fullName || "—"}
            />

            <InfoItem
              icon={VenusAndMars}
              label="Gender"
              value={student.gender || "—"}
            />

            <InfoItem
              icon={CalendarDays}
              label="Date of Birth"
              value={formatDate(student.dob)}
            />

            <InfoItem icon={Phone} label="Phone" value={student.phone || "—"} />

            <InfoItem icon={Mail} label="Email" value={student.email || "—"} />
          </div>
        </CardContent>
      </Card>

      {/* Contact information */}

      <Card className="rounded-2xl border shadow-sm">
        <CardHeader className="border-b bg-muted/20">
          <CardTitle className="text-base">Contact Information</CardTitle>

          <p className="text-sm text-muted-foreground">
            Contact details available for this student.
          </p>
        </CardHeader>

        <CardContent className="p-5 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-4 rounded-2xl border p-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Phone className="size-5" />
              </div>

              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Phone</p>

                <p className="mt-1 truncate font-semibold">
                  {student.phone || "Not provided"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-2xl border p-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Mail className="size-5" />
              </div>

              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Email</p>

                <p className="mt-1 truncate font-semibold">
                  {student.email || "Not provided"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
