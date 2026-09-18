"use client";

import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";

type StudentProfileHeaderData = {
  fullName: string | null;
  admissionNo: string;
  status: string;
  enrollments: { houseAssignment: { house: { name: string; color: string | null; iconUrl: string | null } } | null }[];
};

type Props = {
  student: StudentProfileHeaderData;
};

export function StudentProfileHeader({ student }: Props) {
  const initial = student.fullName?.charAt(0).toUpperCase() || "?";
  const house = student.enrollments[0]?.houseAssignment?.house ?? null;

  return (
    <div className="flex items-center gap-6 rounded-lg border p-6">
      <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-muted text-3xl font-bold">
        {initial}
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold">
          {student.fullName || "Student name not provided"}
        </h2>

        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>Admission No: {student.admissionNo}</span>
          <span>·</span>
          {house ? <span className="inline-flex items-center gap-1.5 font-medium text-foreground">{house.iconUrl ? <img src={house.iconUrl} alt="" className="size-6 rounded object-contain" /> : <Shield className="size-5" style={{ color: house.color || "#64748b" }} />}{house.name}</span> : <span>—</span>}
        </div>

        <Badge>{student.status}</Badge>
      </div>
    </div>
  );
}
