import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, UserRound } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listAccessibleStudents } from "@/lib/student-access";

export default async function StudentPickerPage({
  params,
}: {
  params: Promise<{ schoolSlug: string }>;
}) {
  const { schoolSlug } = await params;
  const { students } = await listAccessibleStudents(schoolSlug);

  if (students.length === 1) {
    redirect(`/${schoolSlug}/my/${students[0].id}`);
  }

  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Your family</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Choose a student</h1>
        <p className="mt-2 text-muted-foreground">
          Attendance, fees, exams, and results are always shown for the selected student.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {students.map((student) => {
          const enrollment = student.enrollments[0];

          return (
            <Link key={student.id} href={`/${schoolSlug}/my/${student.id}`}>
              <Card className="h-full hover:border-primary/30">
                <CardHeader>
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <UserRound className="size-5" />
                  </div>
                  <CardTitle className="mt-3">{student.fullName || "Student"}</CardTitle>
                </CardHeader>
                <CardContent className="flex items-end justify-between gap-4 pt-3">
                  <div className="text-sm text-muted-foreground">
                    <p>{student.admissionNo}</p>
                    <p className="mt-1">
                      {enrollment
                        ? `${enrollment.class.name} ${enrollment.section.name}`
                        : "No active enrollment"}
                    </p>
                  </div>
                  <ArrowRight className="size-5 text-primary" />
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
