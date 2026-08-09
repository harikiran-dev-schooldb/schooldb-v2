"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Eye,
  Users,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  AcademicYearSelect,
  ClassSelect,
  SectionSelect,
} from "@/components/common/select";

import { useAttendanceHistory } from "../hooks/useAttendanceHistory";

type Props = {
  schoolSlug: string;
};

export function AttendanceHistory({ schoolSlug }: Props) {
  const router = useRouter();

  const [academicYearId, setAcademicYearId] = useState("");

  const [classId, setClassId] = useState("");

  const [sectionId, setSectionId] = useState("");

  const [date, setDate] = useState("");

  const { data, loading } = useAttendanceHistory({
    academicYearId,
    classId,
    sectionId,
    date,
  });

  function changeClass(value: string) {
    setClassId(value);
    setSectionId("");
  }

  function openSession(sessionId: string) {
    router.push(`/${schoolSlug}/attendance/session/${sessionId}`);
  }

  function getSessionLabel(type: string) {
    switch (type) {
      case "DAILY":
        return "Daily";

      case "MORNING":
        return "Morning";

      case "AFTERNOON":
        return "Afternoon";

      case "PERIOD":
        return "Period";

      default:
        return type;
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Attendance History</h1>

        <p className="text-sm text-muted-foreground">
          View and manage previously recorded attendance sessions.
        </p>
      </div>

      {/* Filters */}
      <div className="rounded-xl border bg-card p-4">
        <div className="grid gap-4 md:grid-cols-4">
          <AcademicYearSelect
            value={academicYearId}
            onChange={setAcademicYearId}
          />

          <ClassSelect value={classId} onChange={changeClass} />

          <SectionSelect
            classId={classId}
            value={sectionId}
            onChange={setSectionId}
          />

          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
          Loading attendance history...
        </div>
      )}

      {/* Empty */}
      {!loading && data?.data.length === 0 && (
        <div className="rounded-xl border bg-card p-10 text-center">
          <CalendarDays className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />

          <p className="font-medium">No attendance records found</p>

          <p className="mt-1 text-sm text-muted-foreground">
            Try changing your filters.
          </p>
        </div>
      )}

      {/* History */}
      {!loading && data && data.data.length > 0 && (
        <div className="space-y-3">
          {data.data.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border bg-card p-4 shadow-sm transition hover:shadow-md"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                {/* Main */}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">
                      {item.className} - {item.sectionName}
                    </h3>

                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                      {getSessionLabel(item.sessionType)}
                    </span>

                    {item.completed ? (
                      <span className="flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-600">
                        <CheckCircle2 className="h-3 w-3" />
                        Completed
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600">
                        <Clock className="h-3 w-3" />
                        Not Marked
                      </span>
                    )}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span>
                      {new Date(item.attendanceDate).toLocaleDateString()}
                    </span>

                    {item.subjectName && <span>{item.subjectName}</span>}

                    {item.periodName && <span>{item.periodName}</span>}

                    {item.teacherName && <span>{item.teacherName}</span>}
                  </div>
                </div>

                {/* Statistics */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 rounded-lg bg-muted px-3 py-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    {item.totalStudents}
                  </div>

                  <div className="flex items-center gap-1 rounded-lg bg-green-500/10 px-3 py-2 text-sm text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    {item.present}
                  </div>

                  <div className="flex items-center gap-1 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">
                    <XCircle className="h-4 w-4" />
                    {item.absent}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openSession(item.id)}
                    className="gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    View
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
