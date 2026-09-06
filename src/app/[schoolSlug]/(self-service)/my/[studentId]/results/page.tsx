import { Trophy } from "lucide-react";

import { SelfServiceEmptyState, SelfServicePage } from "@/components/self-service/SelfServicePage";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const resultVariant = {
  PASS: "success",
  FAIL: "destructive",
  PENDING: "warning",
  ABSENT: "destructive",
  EXEMPTED: "outline",
} as const;

export default async function StudentResultsPage({
  params,
}: {
  params: Promise<{ schoolSlug: string; studentId: string }>;
}) {
  const { schoolSlug, studentId } = await params;
  const { membership, enrollment } = await requireStudentAccess(schoolSlug, studentId);
  const results = enrollment
    ? await studentExamService.listResults(membership.schoolId, enrollment)
    : [];

  return (
    <SelfServicePage title="Results" description="Marks from completed examinations for the active enrollment.">
      {results.length ? (
        results.map((result) => (
          <Card key={result.id}>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <CardTitle>{result.name}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatDate(result.startDate)} – {formatDate(result.endDate)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{result.percentage}%</p>
                  <Badge variant={resultVariant[result.status]} className="mt-2">
                    {result.status}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Exam date</TableHead>
                    <TableHead>Marks</TableHead>
                    <TableHead>Pass mark</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.subjects.map((subject) => (
                    <TableRow key={subject.id}>
                      <TableCell className="font-semibold">{subject.subject.name}</TableCell>
                      <TableCell>{formatDate(subject.examDate)}</TableCell>
                      <TableCell>
                        {subject.marksObtained === null ? "—" : `${subject.marksObtained} / ${subject.maxMarks}`}
                      </TableCell>
                      <TableCell>{subject.passMarks ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={resultVariant[subject.status]}>{subject.status}</Badge>
                      </TableCell>
                      <TableCell className="max-w-64 whitespace-normal text-muted-foreground">
                        {subject.remarks || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-end border-t border-border/60 px-5 py-4 text-sm font-semibold">
                Total: {result.obtained} / {result.maximum}
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        <Card>
          <CardContent className="p-0">
            <SelfServiceEmptyState
              icon={Trophy}
              title="No completed results"
              description="Results will appear after an exam is completed."
            />
          </CardContent>
        </Card>
      )}
    </SelfServicePage>
  );
}
