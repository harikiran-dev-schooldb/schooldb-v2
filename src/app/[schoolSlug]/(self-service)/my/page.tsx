import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, GraduationCap, Sparkles, UserRound } from "lucide-react";

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
      <div className="relative overflow-hidden rounded-[32px] bg-[#080b16] p-7 text-white shadow-[0_28px_80px_rgba(15,23,42,0.22)] sm:p-9">
        <div className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-indigo-500/25 blur-3xl" />
        <div className="relative">
          <span className="flex size-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl">
            <GraduationCap className="size-6 text-indigo-200" />
          </span>
          <p className="mt-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-indigo-200"><Sparkles className="size-3.5" /> Student space</p>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.045em] sm:text-4xl">Choose a student</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
            Open the student dashboard for attendance, homework, fees, exams, results, and school updates.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {students.map((student) => {
          const enrollment = student.enrollments[0];

          return (
            <Link key={student.id} href={`/${schoolSlug}/my/${student.id}`}>
              <Card className="group h-full rounded-[26px] border-border/60 bg-card/90 shadow-[0_16px_48px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_22px_55px_rgba(79,70,229,0.1)]">
                <CardHeader>
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/10">
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
                  <ArrowRight className="size-5 text-primary transition group-hover:translate-x-1" />
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
