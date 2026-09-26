import { CalendarCheck2, CheckCircle2, Clock3, ShieldCheck } from "lucide-react";

import {
  SelfServiceEmptyState,
  SelfServicePage,
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
          <section className="relative overflow-hidden rounded-[30px] bg-[#080b16] p-6 text-white shadow-[0_26px_70px_rgba(15,23,42,0.22)] sm:p-8">
            <div className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-emerald-500/20 blur-3xl" />
            <div className="relative grid gap-7 lg:grid-cols-[auto_1fr] lg:items-center">
              <div className="flex items-center gap-5">
                <div className="grid size-24 place-items-center rounded-full bg-[conic-gradient(#34d399_var(--attendance-angle),rgba(255,255,255,0.1)_0)] p-2" style={{ "--attendance-angle": `${Math.min(report.summary.attendancePercentage, 100) * 3.6}deg` } as CSSProperties}>
                  <div className="grid size-full place-items-center rounded-full bg-[#111525] text-2xl font-black">{report.summary.attendancePercentage}%</div>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">Academic year attendance</p>
                  <h3 className="mt-2 text-2xl font-black tracking-[-0.035em]">{report.summary.present} sessions present</h3>
                  <p className="mt-1 text-sm text-slate-400">Across {report.summary.total} recorded sessions</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "Present", value: report.summary.present, icon: CheckCircle2, color: "text-emerald-300" },
                  { label: "Absent", value: report.summary.absent, icon: CalendarCheck2, color: "text-rose-300" },
                  { label: "Late", value: report.summary.late, icon: Clock3, color: "text-amber-300" },
                  { label: "Leave", value: report.summary.leave, icon: ShieldCheck, color: "text-blue-300" },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-xl">
                    <Icon className={`size-4 ${color}`} />
                    <p className="mt-3 text-2xl font-black">{value}</p>
                    <p className="mt-1 text-xs text-slate-400">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <Card className="overflow-hidden rounded-[26px] border-border/60 bg-card/90 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
            <div className="border-b border-border/60 px-5 py-5 sm:px-6">
              <h3 className="font-black tracking-[-0.02em]">Attendance history</h3>
              <p className="mt-1 text-sm text-muted-foreground">Every recorded school session in the active academic year.</p>
            </div>
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
import type { CSSProperties } from "react";
