"use client";

import { Badge } from "@/components/ui/badge";

type StudentProfileHeaderData = {
  fullName: string;
  admissionNo: string;
  status: string;
};

type Props = {
  student: StudentProfileHeaderData;
};

export function StudentProfileHeader({ student }: Props) {
  const initial = student.fullName?.charAt(0).toUpperCase() || "?";

  return (
    <div className="flex items-center gap-6 rounded-lg border p-6">
      <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-muted text-3xl font-bold">
        {initial}
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold">{student.fullName}</h2>

        <p className="text-sm text-muted-foreground">
          Admission No: {student.admissionNo}
        </p>

        <Badge>{student.status}</Badge>
      </div>
    </div>
  );
}
