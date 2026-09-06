import { BookOpenCheck, CalendarClock } from "lucide-react";

import { SelfServiceEmptyState, SelfServicePage } from "@/components/self-service/SelfServicePage";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { homeworkService } from "@/features/homework/services/homework.service";
import { formatDate } from "@/lib/self-service-format";
import { requireStudentAccess } from "@/lib/student-access";

export default async function StudentHomeworkPage({
  params,
}: {
  params: Promise<{ schoolSlug: string; studentId: string }>;
}) {
  const { schoolSlug, studentId } = await params;
  const { membership, enrollment } = await requireStudentAccess(schoolSlug, studentId);
  const homework = enrollment
    ? await homeworkService.studentList(membership.schoolId, enrollment)
    : [];
  const now = new Date();

  return (
    <SelfServicePage title="Homework" description="Active assignments for the student’s class and section.">
      {homework.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {homework.map((item) => {
            const overdue = item.dueDate ? item.dueDate.getTime() < now.getTime() : false;

            return (
              <Card key={item.id} className="border-white/80 bg-white/90 shadow-[0_16px_42px_rgba(15,23,42,0.05)]">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <span className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-100 text-indigo-600 ring-1 ring-indigo-100">
                      <BookOpenCheck className="size-5" />
                    </span>
                    <Badge variant={overdue ? "destructive" : item.dueDate ? "warning" : "outline"}>
                      {overdue ? "Past due" : item.dueDate ? "Due soon" : "No due date"}
                    </Badge>
                  </div>
                  <CardTitle className="mt-4 text-lg">{item.title}</CardTitle>
                  <p className="text-sm font-medium text-indigo-600">
                    {item.subject?.name || "General"}
                  </p>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                    {item.description || "No additional instructions."}
                  </p>
                  <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border/60 pt-4 text-xs text-muted-foreground">
                    <span>Assigned {formatDate(item.assignedDate)}</span>
                    <span className="inline-flex items-center gap-1.5 font-semibold">
                      <CalendarClock className="size-3.5" />
                      Due {formatDate(item.dueDate)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <SelfServiceEmptyState
              icon={BookOpenCheck}
              title="No active homework"
              description="New assignments will appear here."
              className="min-h-56"
            />
          </CardContent>
        </Card>
      )}
    </SelfServicePage>
  );
}
