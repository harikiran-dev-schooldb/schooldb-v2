import { ClipboardList } from "lucide-react";

import { SelfServiceEmptyState, SelfServicePage } from "@/components/self-service/SelfServicePage";
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
import { studentExamService } from "@/features/exams/services/student-exam.service";
import { formatDate } from "@/lib/self-service-format";
import { requireStudentAccess } from "@/lib/student-access";

export default async function StudentExamsPage({
  params,
}: {
  params: Promise<{ schoolSlug: string; studentId: string }>;
}) {
  const { schoolSlug, studentId } = await params;
  const { membership, enrollment } = await requireStudentAccess(schoolSlug, studentId);
  const schedules = enrollment
    ? await studentExamService.listSchedule(membership.schoolId, enrollment)
    : [];

  return (
    <SelfServicePage
      title="Exams"
      description="Published and completed examination schedules for the active enrollment."
    >
      <Card>
        <CardContent className="p-0">
          {schedules.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Exam</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Maximum marks</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((schedule) => (
                  <TableRow key={schedule.id}>
                    <TableCell>{formatDate(schedule.examDate)}</TableCell>
                    <TableCell className="font-semibold">{schedule.exam.name}</TableCell>
                    <TableCell>
                      {schedule.subject.name}
                      {schedule.subject.code ? (
                        <span className="ml-2 text-xs text-muted-foreground">{schedule.subject.code}</span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {schedule.startTime || "—"}
                      {schedule.endTime ? ` – ${schedule.endTime}` : ""}
                    </TableCell>
                    <TableCell>{Number(schedule.maxMarks)}</TableCell>
                    <TableCell>
                      <Badge variant={schedule.exam.status === "COMPLETED" ? "success" : "info"}>
                        {schedule.exam.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <SelfServiceEmptyState
              icon={ClipboardList}
              title="No published exams"
              description="Exam schedules will appear here after publication."
            />
          )}
        </CardContent>
      </Card>
    </SelfServicePage>
  );
}
