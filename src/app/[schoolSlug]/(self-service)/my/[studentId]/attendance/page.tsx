import { CalendarCheck2 } from "lucide-react";

import {
  SelfServiceEmptyState,
  SelfServicePage,
  SelfServiceStatCard,
} from "@/components/self-service/SelfServicePage";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { attendanceService } from "@/features/attendance/services/attendance.service";
import { formatDate } from "@/lib/self-service-format";
import { requireStudentAccess } from "@/lib/student-access";

const statusVariant = {
  PRESENT: "success",
  ABSENT: "destructive",
  LATE: "warning",
  LEAVE: "info",
} as const;

export default async function StudentAttendancePage({
  params,
}: {
  params: Promise<{ schoolSlug: string; studentId: string }>;
}) {
  const { schoolSlug, studentId } = await params;
  const { membership, enrollment } = await requireStudentAccess(
    schoolSlug,
    studentId,
  );

  const report = enrollment
    ? await attendanceService.studentAttendanceReport(
        membership.schoolId,
        studentId,
        enrollment.academicYearId,
      )
    : null;

  return (
    <SelfServicePage
      title="Attendance"
      description="Attendance recorded for the active academic year."
    >
      {report ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              ["Attendance", `${report.summary.attendancePercentage}%`],
              ["Sessions", report.summary.total],
              ["Present", report.summary.present],
              ["Absent", report.summary.absent],
              ["Late", report.summary.late],
              ["Leave", report.summary.leave],
            ].map(([label, value]) => (
              <SelfServiceStatCard key={label} label={String(label)} value={value} />
            ))}
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Session</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.records.length ? (
                    report.records.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>{formatDate(record.session.attendanceDate)}</TableCell>
                        <TableCell>{record.session.sessionType || "Daily"}</TableCell>
                        <TableCell>{record.session.subject?.name || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant[record.status]}>{record.status}</Badge>
                        </TableCell>
                        <TableCell className="max-w-64 whitespace-normal text-muted-foreground">
                          {record.remarks || "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                        No attendance has been recorded yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="p-0">
            <SelfServiceEmptyState
              icon={CalendarCheck2}
              title="No active enrollment"
              description="Attendance becomes available after enrollment."
            />
          </CardContent>
        </Card>
      )}
    </SelfServicePage>
  );
}
