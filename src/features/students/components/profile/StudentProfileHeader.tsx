"use client";

import { Badge } from "@/components/ui/badge";

type Props = {
  student: any;
};

export function StudentProfileHeader({ student }: Props) {
  return (
    <div className="rounded-lg border p-6 flex items-center gap-6">
      <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center text-3xl font-bold">
        {student.fullName.charAt(0)}
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold">{student.fullName}</h2>

        <p>Admission No : {student.admissionNo}</p>

        <Badge>{student.status}</Badge>
      </div>
    </div>
  );
}
