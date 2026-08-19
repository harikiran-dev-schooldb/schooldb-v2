"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, AlertTriangle, FileText } from "lucide-react";
import { toast } from "sonner";

import {
  AcademicYearSelect,
  ClassSelect,
  SectionSelect,
} from "@/components/common/select";

type Props = {
  schoolSlug: string;
};

type Student = {
  studentId: string;
  rollNo: number | null;
  admissionNo: string;
  fullName: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  leave: number;
  attendancePercentage: number;
};

type ReportData = {
  threshold: number;
  totalStudents: number;
  lowAttendanceCount: number;
  students: Student[];
};

export function LowAttendanceReport({ schoolSlug }: Props) {
  const router = useRouter();

  const [academicYearId, setAcademicYearId] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [threshold, setThreshold] = useState("75");

  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);

  const canLoadReport = Boolean(academicYearId);

  function changeClass(value: string) {
    setClassId(value);
    setSectionId("");
    setData(null);
  }

  useEffect(() => {
    if (!canLoadReport) return;

    let cancelled = false;

    async function loadReport() {
      try {
        setLoading(true);

        const params = new URLSearchParams({
          academicYearId,
          threshold,
        });

        if (classId) {
          params.set("classId", classId);
        }

        if (sectionId) {
          params.set("sectionId", sectionId);
        }

        if (fromDate) {
          params.set("fromDate", fromDate);
        }

        if (toDate) {
          params.set("toDate", toDate);
        }

        const response = await fetch(
          `/api/v1/attendance/reports/low?${params.toString()}`,
        );

        const result = await response.json();

        if (cancelled) return;

        if (!result.success) {
          toast.error(result.message);
          return;
        }

        setData(result.data);
      } catch {
        if (!cancelled) {
          toast.error("Failed to load low attendance report.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadReport();

    return () => {
      cancelled = true;
    };
  }, [
    canLoadReport,
    academicYearId,
    classId,
    sectionId,
    fromDate,
    toDate,
    threshold,
  ]);

  function openStudent(studentId: string) {
    router.push(
      `/${schoolSlug}/attendance/reports/student?studentId=${studentId}&academicYearId=${academicYearId}`,
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Low Attendance</h1>

        <p className="text-sm text-muted-foreground">
          Students whose attendance is below the selected threshold.
        </p>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
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
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm"
            />
          </div>

          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm"
            />
          </div>

          <div>
            <input
              type="number"
              min={0}
              max={100}
              value={threshold}
              onChange={(event) => setThreshold(event.target.value)}
              placeholder="Threshold %"
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            />
          </div>
        </div>
      </div>

      {!canLoadReport ? (
        <div className="rounded-xl border bg-card p-10 text-center">
          <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />

          <p className="font-medium">Select an academic year</p>

          <p className="mt-1 text-sm text-muted-foreground">
            Select an academic year to view low-attendance students.
          </p>
        </div>
      ) : loading ? (
        <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
          Loading report...
        </div>
      ) : data ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border bg-card p-5">
              <p className="text-sm text-muted-foreground">Total Students</p>
              <p className="mt-2 text-3xl font-semibold">
                {data.totalStudents}
              </p>
            </div>

            <div className="rounded-xl border bg-card p-5">
              <p className="text-sm text-muted-foreground">Below Threshold</p>
              <p className="mt-2 text-3xl font-semibold text-red-600">
                {data.lowAttendanceCount}
              </p>
            </div>

            <div className="rounded-xl border bg-card p-5">
              <p className="text-sm text-muted-foreground">Threshold</p>
              <p className="mt-2 text-3xl font-semibold">{data.threshold}%</p>
            </div>
          </div>

          <div className="rounded-xl border bg-card">
            <div className="flex items-center gap-3 border-b p-4">
              <AlertTriangle className="h-5 w-5 text-red-600" />

              <div>
                <h2 className="font-semibold">
                  Students Below {data.threshold}%
                </h2>

                <p className="text-sm text-muted-foreground">
                  Attendance requiring attention.
                </p>
              </div>
            </div>

            {data.students.length === 0 ? (
              <div className="p-10 text-center">
                <p className="font-medium">No low-attendance students</p>

                <p className="mt-1 text-sm text-muted-foreground">
                  All students are above the selected threshold.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left">
                      <th className="px-4 py-3">Roll No</th>
                      <th className="px-4 py-3">Admission No</th>
                      <th className="px-4 py-3">Student</th>
                      <th className="px-4 py-3">Total</th>
                      <th className="px-4 py-3">Present</th>
                      <th className="px-4 py-3">Absent</th>
                      <th className="px-4 py-3">Late</th>
                      <th className="px-4 py-3">Leave</th>
                      <th className="px-4 py-3">Attendance</th>
                    </tr>
                  </thead>

                  <tbody>
                    {data.students.map((student) => (
                      <tr
                        key={student.studentId}
                        className="border-b last:border-0 hover:bg-muted/30"
                      >
                        <td className="px-4 py-3">{student.rollNo ?? "-"}</td>
                        <td className="px-4 py-3">{student.admissionNo}</td>

                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => openStudent(student.studentId)}
                            className="font-medium hover:underline"
                          >
                            {student.fullName}
                          </button>
                        </td>

                        <td className="px-4 py-3">{student.total}</td>

                        <td className="px-4 py-3 text-green-600">
                          {student.present}
                        </td>

                        <td className="px-4 py-3 text-red-600">
                          {student.absent}
                        </td>

                        <td className="px-4 py-3 text-amber-600">
                          {student.late}
                        </td>

                        <td className="px-4 py-3 text-blue-600">
                          {student.leave}
                        </td>

                        <td className="px-4 py-3">
                          <span className="rounded-full bg-red-500/10 px-2.5 py-1 font-semibold text-red-600">
                            {student.attendancePercentage}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
