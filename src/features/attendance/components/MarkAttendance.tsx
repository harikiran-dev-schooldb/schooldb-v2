"use client";

import { useEffect, useMemo, useState } from "react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { AttendanceSummary } from "./AttendanceSummary";
import { StudentAttendanceRow } from "./StudentAttendanceRow";

import { useAttendanceSession } from "../hooks/useAttendanceSession";
import { AttendanceHeader } from "./AttendanceHeader";

type Props = {
  sessionId: string;
};

type StudentAttendance = {
  studentId: string;
  rollNo: number;
  admissionNo: string;
  fullName: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "LEAVE";
  remarks?: string;
};

export function MarkAttendance({ sessionId }: Props) {
  const { loading, data } = useAttendanceSession(sessionId);

  const [students, setStudents] = useState<StudentAttendance[]>([]);

  useEffect(() => {
    if (data?.students) {
      setStudents(data.students);
    }
  }, [data]);

  const summary = useMemo(() => {
    return {
      present: students.filter((x) => x.status === "PRESENT").length,

      absent: students.filter((x) => x.status === "ABSENT").length,

      late: students.filter((x) => x.status === "LATE").length,

      leave: students.filter((x) => x.status === "LEAVE").length,
    };
  }, [students]);

  function updateStatus(
    studentId: string,
    status: StudentAttendance["status"],
  ) {
    setStudents((prev) =>
      prev.map((student) =>
        student.studentId === studentId
          ? {
              ...student,
              status,
            }
          : student,
      ),
    );
  }

  async function saveAttendance() {
    try {
      const response = await fetch("/api/v1/attendance", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          sessionId,

          attendance: students.map((student) => ({
            studentId: student.studentId,

            status: student.status,

            remarks: student.remarks,
          })),
        }),
      });

      const result = await response.json();

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success("Attendance saved successfully.");
    } catch {
      toast.error("Failed to save attendance.");
    }
  }

  if (loading) {
    return <div className="flex justify-center py-10">Loading...</div>;
  }

  if (!data) {
    return (
      <div className="py-10 text-center">Attendance session not found.</div>
    );
  }

  return (
    <div className="space-y-6">
      <AttendanceHeader
        className={data.session.class.name}
        section={data.session.section.name}
        subject={data.session.subject.name}
        teacher={data.session.teacher.fullName}
        period={data.session.period.name}
        date={new Date(data.session.attendanceDate).toLocaleDateString()}
      />

      <AttendanceSummary
        present={summary.present}
        absent={summary.absent}
        late={summary.late}
        leave={summary.leave}
      />

      <div className="space-y-2">
        {students.map((student) => (
          <StudentAttendanceRow
            key={student.studentId}
            rollNo={student.rollNo}
            admissionNo={student.admissionNo}
            fullName={student.fullName}
            value={student.status}
            onChange={(status) => updateStatus(student.studentId, status)}
          />
        ))}
      </div>

      <div className="sticky bottom-0 rounded-lg border bg-background p-4 shadow">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {students.length} Students
          </div>

          <Button size="lg" onClick={saveAttendance}>
            Save Attendance
          </Button>
        </div>
      </div>
    </div>
  );
}
