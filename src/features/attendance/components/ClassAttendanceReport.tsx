"use client";

import { useEffect, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  UserX,
} from "lucide-react";

import { toast } from "sonner";

import {
  AcademicYearSelect,
  ClassSelect,
  SectionSelect,
} from "@/components/common/select";

import { useRouter } from "next/navigation";

type Props = {
  schoolSlug: string;
};

type StudentReport = {
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
  summary: {
    totalStudents: number;
    totalSessions: number;
    present: number;
    absent: number;
    late: number;
    leave: number;
    attendancePercentage: number;
  };

  students: StudentReport[];
};

export function ClassAttendanceReport({ schoolSlug }: Props) {
  const router = useRouter();

  const [academicYearId, setAcademicYearId] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);

  const canLoadReport =
    Boolean(academicYearId) && Boolean(classId) && Boolean(sectionId);

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
          classId,
          sectionId,
        });

        if (fromDate) {
          params.set("fromDate", fromDate);
        }

        if (toDate) {
          params.set("toDate", toDate);
        }

        const response = await fetch(
          `/api/v1/attendance/reports/class?${params.toString()}`,
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
          toast.error("Failed to load class attendance report.");
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
  }, [canLoadReport, academicYearId, classId, sectionId, fromDate, toDate]);

  function openStudent(studentId: string) {
    router.push(
      `/${schoolSlug}/attendance/reports/student?studentId=${studentId}&academicYearId=${academicYearId}`,
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Class Attendance Report</h1>

        <p className="text-sm text-muted-foreground">
          View attendance performance for the entire class.
        </p>
      </div>

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

          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <input
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
                className="h-10 w-full rounded-md border bg-background pl-9 pr-2 text-sm"
              />
            </div>

            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <input
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
                className="h-10 w-full rounded-md border bg-background pl-9 pr-2 text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {!canLoadReport ? (
        <div className="rounded-xl border bg-card p-10 text-center">
          <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />

          <p className="font-medium">Select class and section</p>

          <p className="mt-1 text-sm text-muted-foreground">
            Select an academic year, class and section to view the report.
          </p>
        </div>
      ) : loading ? (
        <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
          Loading class attendance...
        </div>
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <SummaryCard
              label="Students"
              value={data.summary.totalStudents}
              icon={<FileText className="h-4 w-4" />}
            />

            <SummaryCard
              label="Present"
              value={data.summary.present}
              icon={<CheckCircle2 className="h-4 w-4" />}
              className="text-green-600"
            />

            <SummaryCard
              label="Absent"
              value={data.summary.absent}
              icon={<UserX className="h-4 w-4" />}
              className="text-red-600"
            />

            <SummaryCard
              label="Late"
              value={data.summary.late}
              icon={<Clock className="h-4 w-4" />}
              className="text-amber-600"
            />

            <SummaryCard
              label="Leave"
              value={data.summary.leave}
              icon={<FileText className="h-4 w-4" />}
              className="text-blue-600"
            />

            <SummaryCard
              label="Attendance"
              value={`${data.summary.attendancePercentage}%`}
              icon={<CheckCircle2 className="h-4 w-4" />}
            />
          </div>

          <div className="rounded-xl border bg-card">
            <div className="border-b p-4">
              <h2 className="font-semibold">Student Attendance</h2>

              <p className="text-sm text-muted-foreground">
                Attendance summary for each student.
              </p>
            </div>

            {data.students.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground">
                No students found.
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
                      <th className="px-4 py-3">%</th>
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
                            className="font-medium hover:underline"
                            onClick={() => openStudent(student.studentId)}
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

                        <td className="px-4 py-3 font-semibold">
                          {student.attendancePercentage}%
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

function SummaryCard({
  label,
  value,
  icon,
  className = "",
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={className}>{icon}</span>
      </div>

      <div className={`mt-2 text-2xl font-semibold ${className}`}>{value}</div>
    </div>
  );
}
