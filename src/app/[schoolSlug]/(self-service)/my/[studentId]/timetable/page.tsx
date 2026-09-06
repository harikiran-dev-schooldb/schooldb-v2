import { CalendarDays } from "lucide-react";

import { SelfServiceEmptyState, SelfServicePage } from "@/components/self-service/SelfServicePage";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { timetableService } from "@/features/timetable/services/timetable.service";
import { requireStudentAccess } from "@/lib/student-access";

const weekdays = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"] as const;

export default async function StudentTimetablePage({
  params,
}: {
  params: Promise<{ schoolSlug: string; studentId: string }>;
}) {
  const { schoolSlug, studentId } = await params;
  const { membership, enrollment } = await requireStudentAccess(schoolSlug, studentId);
  const entries = enrollment
    ? (
        await timetableService.classView(
          membership.schoolId,
          enrollment.academicYearId,
          enrollment.classId,
          enrollment.sectionId,
        )
      ).filter((entry) => entry.active && entry.teacherAllocation.active)
    : [];

  const periods = Array.from(
    new Map(entries.map((entry) => [entry.period.id, entry.period])).values(),
  ).sort((a, b) => a.displayOrder - b.displayOrder);
  const cellMap = new Map(entries.map((entry) => [`${entry.day}:${entry.periodId}`, entry]));

  return (
    <SelfServicePage title="Class timetable" description="The active weekly timetable for this class and section.">
      <Card className="overflow-hidden border-white/80 bg-white/90 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
        <CardContent className="p-0">
          {entries.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 z-10 bg-muted/95">Period</TableHead>
                  {weekdays.map((day) => (
                    <TableHead key={day}>{day.slice(0, 3)}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {periods.map((period) => (
                  <TableRow key={period.id}>
                    <TableCell className="sticky left-0 z-10 bg-white/95">
                      <p className="font-bold">{period.name}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {period.startTime} – {period.endTime}
                      </p>
                    </TableCell>
                    {weekdays.map((day) => {
                      const entry = cellMap.get(`${day}:${period.id}`);

                      return (
                        <TableCell key={day} className="min-w-36 align-top">
                          {entry ? (
                            <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-violet-50/80 p-3">
                              <p className="font-bold text-indigo-950">{entry.teacherAllocation.subject.name}</p>
                              <p className="mt-1 text-xs text-indigo-700/70">{entry.teacherAllocation.teacher.fullName}</p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground/50">—</span>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <SelfServiceEmptyState
              icon={CalendarDays}
              title="No timetable published"
              description="The class timetable will appear here after publication."
              className="min-h-56"
            />
          )}
        </CardContent>
      </Card>
    </SelfServicePage>
  );
}
