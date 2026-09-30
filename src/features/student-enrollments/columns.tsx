"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowRight, GraduationCap } from "lucide-react";

import { Badge } from "@/components/ui/badge";

import { StudentEnrollmentListItem } from "./types";
import { StudentEnrollmentActions } from "./components/StudentEnrollmentActions";

export const studentEnrollmentColumns: ColumnDef<StudentEnrollmentListItem>[] =
  [
    {
      accessorKey: "rollNo",
      header: "Roll No",
      cell: ({ row }) => row.original.rollNo ?? "—",
    },
    {
      id: "student",
      header: "Present Student",
      cell: ({ row }) => {
        const { studentName, admissionNo } = row.original;

        return (
          <div>
            <div className="font-semibold">{studentName}</div>
            <div className="text-xs text-muted-foreground">
              Admission No. {admissionNo}
            </div>
          </div>
        );
      },
    },
    {
      id: "currentPlacement",
      header: "Present Class",
      cell: ({ row }) => (
        <div>
          <div className="font-semibold">
            {row.original.className} · {row.original.sectionName}
          </div>
          <div className="text-xs text-muted-foreground">
            {row.original.academicYearName}
          </div>
        </div>
      ),
    },
    {
      id: "nextPlacement",
      header: "Next-Year Enrollment",
      cell: ({ row }) => {
        const item = row.original;

        if (item.nextEnrollmentStatus === "GRADUATING") {
          return (
            <div className="flex items-center gap-2 font-semibold text-violet-700">
              <GraduationCap className="size-4" />
              Completing final class
            </div>
          );
        }

        if (item.nextEnrollmentStatus === "NEXT_YEAR_MISSING") {
          return (
            <div className="flex items-center gap-3">
              <ArrowRight className="size-4 shrink-0 text-amber-600" />
              <div>
                <div className="font-semibold">
                  {item.nextClassName ?? "Class mapping needed"}
                  {item.nextSectionName ? ` · ${item.nextSectionName}` : ""}
                </div>
                <div className="text-xs font-medium text-amber-700">
                  Create the next academic year before enrolling
                </div>
              </div>
            </div>
          );
        }

        return (
          <div className="flex items-center gap-3">
            <ArrowRight className="size-4 shrink-0 text-primary" />
            <div>
              <div className="font-semibold">
                {item.nextClassName ?? "Class mapping needed"}
                {item.nextSectionName ? ` · ${item.nextSectionName}` : ""}
              </div>
              <div className="text-xs text-muted-foreground">
                {item.nextAcademicYearName}
                {!item.nextSectionName && " · Choose section"}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      id: "planningStatus",
      header: "Planning Status",
      cell: ({ row }) => {
        const status = row.original.nextEnrollmentStatus;
        const config = {
          READY: { label: "Ready to enroll", variant: "info" as const },
          ENROLLED: { label: "Already enrolled", variant: "success" as const },
          GRADUATING: { label: "Graduating", variant: "secondary" as const },
          NEEDS_SECTION: { label: "Needs mapping", variant: "warning" as const },
          NEXT_YEAR_MISSING: { label: "Year not created", variant: "warning" as const },
        }[status];

        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <StudentEnrollmentActions enrollmentId={row.original.id} />
      ),
    },
  ];
