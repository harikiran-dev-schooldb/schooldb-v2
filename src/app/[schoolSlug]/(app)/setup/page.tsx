import Link from "next/link";
import { ArrowRight, CheckCircle2, CircleDashed, RotateCw } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function SchoolSetupPage({ params }: { params: Promise<{ schoolSlug: string }> }) {
  const { schoolSlug } = await params;
  const member = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"], schoolSlug);
  const schoolId = member.schoolId;
  const year = await prisma.academicYear.findFirst({ where: { schoolId, active: true }, select: { id: true } });
  const [syllabi, classes, sections, subjects, mappings, periods, teachers, allocations, plans, timetable] = await Promise.all([
    prisma.syllabus.count({ where: { schoolId, active: true } }),
    prisma.class.count({ where: { schoolId, active: true } }),
    prisma.section.count({ where: { class: { schoolId }, active: true } }),
    prisma.subject.count({ where: { schoolId, active: true } }),
    year ? prisma.classSubject.count({ where: { schoolId, academicYearId: year.id, active: true } }) : 0,
    prisma.period.count({ where: { schoolId, active: true } }),
    prisma.teacher.count({ where: { schoolId, active: true } }),
    year ? prisma.teacherAllocation.count({ where: { schoolId, academicYearId: year.id, active: true } }) : 0,
    year ? prisma.feePlan.count({ where: { schoolId, academicYearId: year.id, active: true } }) : 0,
    year ? prisma.timetable.count({ where: { schoolId, academicYearId: year.id, active: true } }) : 0,
  ]);
  const steps = [
    ["Academic year", "Create and activate the current academic year.", "academic-year", Boolean(year)],
    ["Syllabus and branches", "Define curricula and academic divisions.", "setup/academic-structure", syllabi > 0],
    ["Classes and sections", "Build the teaching structure.", "classes", classes > 0 && sections > 0],
    ["Subjects", "Add the subjects taught by the school.", "subjects", subjects > 0],
    ["Class subjects", "Map subjects to classes for the active year.", "setup/class-subjects", mappings > 0],
    ["Periods", "Configure the daily period master.", "periods", periods > 0],
    ["Teachers", "Add active teaching staff.", "teachers", teachers > 0],
    ["Teacher allocations", "Assign teachers to class, section and subject.", "teacher-allocations", allocations > 0],
    ["Fee plans", "Prepare the active year's fee structure.", "fees/plans", plans > 0],
    ["Timetable", "Publish teaching slots for the active year.", "timetable", timetable > 0],
  ] as const;
  const complete = steps.filter((step) => step[3]).length;
  const percent = Math.round(complete / steps.length * 100);
  return <div className="space-y-6 p-4 pb-12 sm:p-6">
    <PageHeader eyebrow="Administration" title="Guided school setup" description="A live readiness checklist that takes you through setup in the right order." />
    <Card className="overflow-hidden rounded-3xl border-0 bg-primary text-primary-foreground"><CardContent className="p-6 sm:p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold opacity-80">Setup readiness</p><p className="mt-2 text-4xl font-black">{percent}%</p><p className="mt-2 text-sm opacity-80">{complete} of {steps.length} essentials are ready.</p></div><Link href={`/${schoolSlug}/bulk-operations/academic-year-rollover`} className="inline-flex h-11 items-center gap-2 rounded-xl bg-background px-4 text-sm font-bold text-foreground"><RotateCw className="size-4" />Academic-year rollover</Link></div>
      <div className="mt-6 h-2 overflow-hidden rounded-full bg-primary-foreground/20"><div className="h-full rounded-full bg-primary-foreground" style={{ width: `${percent}%` }} /></div>
    </CardContent></Card>
    <div className="grid gap-3 md:grid-cols-2">{steps.map(([title, description, href, ready], index) => <Link key={href} href={`/${schoolSlug}/${href}`} className="group"><Card className="h-full rounded-2xl border-border/60 transition hover:-translate-y-0.5 hover:shadow-md"><CardContent className="flex items-start gap-4 p-5"><div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-sm font-black">{String(index + 1).padStart(2, "0")}</div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h2 className="font-bold">{title}</h2><Badge variant={ready ? "success" : "secondary"}>{ready ? "Ready" : "To do"}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>{ready ? <CheckCircle2 className="mt-1 size-5 text-emerald-600" /> : <CircleDashed className="mt-1 size-5 text-muted-foreground" />}<ArrowRight className="mt-1 size-4 text-muted-foreground transition group-hover:translate-x-1" /></CardContent></Card></Link>)}</div>
  </div>;
}
