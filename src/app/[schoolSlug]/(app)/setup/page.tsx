import Link from "next/link";
import { ArrowRight, CheckCircle2, CircleDashed, RotateCw } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  buildSetupReadiness,
  readSetupParam,
  type SetupSearchParams,
} from "@/features/school-setup/setup-readiness";
import { requireRole } from "@/lib/auth";
import { isMemberSchoolPathAllowed } from "@/lib/navigation-access";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{ schoolSlug: string }>;
  searchParams: SetupSearchParams;
};

export default async function SchoolSetupPage({ params, searchParams }: Props) {
  const [{ schoolSlug }, query] = await Promise.all([params, searchParams]);
  const member = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"], schoolSlug);
  const schoolId = member.schoolId;
  const years = await prisma.academicYear.findMany({
    where: { schoolId },
    select: { id: true, name: true, active: true },
    orderBy: { startDate: "desc" },
  });
  const requestedYearId = readSetupParam(query, "academicYearId");
  const activeYear = years.find((year) => year.active);
  const year = years.find((year) => year.id === requestedYearId) ?? activeYear;

  function canOpen(route: string) {
    return isMemberSchoolPathAllowed(member.school, member, `/${schoolSlug}/${route}`, schoolSlug);
  }

  function linkTo(route: string, filters?: Record<string, string>) {
    const path = `/${schoolSlug}/${route}`;
    return filters ? `${path}?${new URLSearchParams(filters)}` : path;
  }

  const canManageSections = canOpen("sections");
  const canMapSubjects = canOpen("setup/class-subjects");
  const canAllocateTeachers = canOpen("teacher-allocations");
  const canBuildTimetable = canOpen("timetable");
  const classCoverageVisible = canManageSections || canMapSubjects || canAllocateTeachers || canBuildTimetable;

  function yearScope(enabled: boolean) {
    return year && enabled ? { academicYearId: year.id } : { id: { in: [] } };
  }

  const [syllabi, subjects, periods, teachers, plans, classes] = await Promise.all([
    canOpen("setup/academic-structure") ? prisma.syllabus.count({ where: { schoolId, active: true } }) : 0,
    canOpen("subjects") ? prisma.subject.count({ where: { schoolId, active: true } }) : 0,
    canOpen("periods") ? prisma.period.count({ where: { schoolId, active: true } }) : 0,
    canOpen("teachers") ? prisma.teacher.count({ where: { schoolId, active: true } }) : 0,
    year && canOpen("fees/plans")
      ? prisma.feePlan.count({ where: { schoolId, academicYearId: year.id, active: true } })
      : 0,
    classCoverageVisible || canOpen("classes")
      ? prisma.class.findMany({
          where: {
            schoolId,
            active: true,
            branch: { schoolId, active: true, syllabus: { schoolId, active: true } },
          },
          orderBy: [{ displayOrder: "asc" }, { name: "asc" }, { id: "asc" }],
          select: {
            id: true,
            name: true,
            branch: { select: { name: true, syllabus: { select: { name: true } } } },
            sections: {
              where: { active: true },
              orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
              select: { id: true, name: true },
            },
            classSubjects: {
              where: {
                schoolId,
                ...yearScope(canMapSubjects || canAllocateTeachers || canBuildTimetable),
                active: true,
                subject: { schoolId, active: true },
              },
              orderBy: { subject: { name: "asc" } },
              select: { subject: { select: { id: true, name: true } } },
            },
            allocations: {
              where: {
                schoolId,
                ...yearScope(canAllocateTeachers || canBuildTimetable),
                active: true,
                section: { active: true },
                teacher: { schoolId, active: true },
                subject: { schoolId, active: true },
              },
              orderBy: { id: "asc" },
              select: {
                id: true,
                sectionId: true,
                subjectId: true,
                timetables: {
                  where: { schoolId, ...yearScope(canBuildTimetable), active: true, period: { schoolId, active: true } },
                  take: 1,
                  select: { id: true },
                },
              },
            },
          },
        })
      : [],
  ]);

  const coverage = buildSetupReadiness(classes);
  const classCount = coverage.rows.length;
  const { sectionCount } = coverage;

  const checks = [
    {
      label: "Active academic year", route: "academic-year", ready: Boolean(activeYear),
      detail: activeYear?.name ?? "Activate an academic year",
    },
    {
      label: "Syllabi and branches", route: "setup/academic-structure", ready: syllabi > 0,
      detail: `${syllabi} active ${syllabi === 1 ? "syllabus" : "syllabi"}`,
    },
    {
      label: "Classes", route: "classes", ready: classCount > 0,
      detail: `${classCount} active ${classCount === 1 ? "class" : "classes"}`,
    },
    {
      label: "Sections", route: "sections", ready: classCount > 0 && coverage.classesWithSections === classCount,
      detail: `${coverage.classesWithSections} of ${classCount} classes have an active section`,
    },
    {
      label: "Subjects", route: "subjects", ready: subjects > 0,
      detail: `${subjects} active ${subjects === 1 ? "subject" : "subjects"}`,
    },
    {
      label: "Class subjects", route: "setup/class-subjects", ready: classCount > 0 && coverage.classesWithSubjects === classCount,
      detail: year ? `${coverage.classesWithSubjects} of ${classCount} classes have mapped subjects` : "Choose an academic year",
    },
    {
      label: "Periods", route: "periods", ready: periods > 0,
      detail: `${periods} active ${periods === 1 ? "period" : "periods"}`,
    },
    {
      label: "Teachers", route: "teachers", ready: teachers > 0,
      detail: `${teachers} active ${teachers === 1 ? "teacher" : "teachers"}`,
    },
    {
      label: "Teacher allocations", route: "teacher-allocations", ready: sectionCount > 0 && coverage.sectionsWithTeachers === sectionCount,
      detail: year ? `${coverage.sectionsWithTeachers} of ${sectionCount} sections have teachers for every mapped subject` : "Choose an academic year",
    },
    {
      label: "Timetable", route: "timetable", ready: sectionCount > 0 && coverage.sectionsWithTimetables === sectionCount,
      detail: year ? `${coverage.sectionsWithTimetables} of ${sectionCount} sections have a slot for every mapped subject` : "Choose an academic year",
    },
    {
      label: "Fee plans", route: "fees/plans", ready: plans > 0,
      detail: year ? `${plans} active ${plans === 1 ? "plan" : "plans"} in ${year.name}` : "Choose an academic year",
    },
  ].filter((check) => canOpen(check.route));
  const completed = checks.filter((check) => check.ready).length;

  return (
    <div className="space-y-6 p-4 pb-12 sm:p-6">
      <PageHeader
        eyebrow="Administration"
        title="Guided school setup"
        description="Review setup coverage for an academic year and open the tools you need to fill the gaps."
        action={canOpen("bulk-operations/academic-year-rollover") ? (
          <Button asChild variant="outline">
            <Link href={linkTo("bulk-operations/academic-year-rollover")}>
              <RotateCw className="size-4" /> Academic-year rollover
            </Link>
          </Button>
        ) : undefined}
      />

      <Card>
        <CardContent className="flex flex-wrap items-end justify-between gap-4 p-5">
          <div>
            <h2 className="font-semibold">Setup checklist</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {checks.length ? `${completed} of ${checks.length} checks complete` : "No setup checks are available for your school."}
            </p>
          </div>
          {years.length > 0 && (
            <form className="flex flex-wrap items-end gap-2">
              <label className="grid gap-1 text-sm font-medium">
                Academic year
                <select name="academicYearId" defaultValue={year?.id ?? ""} required className="h-9 min-w-36 rounded-md border bg-background px-2">
                  <option value="" disabled>Select academic year</option>
                  {years.map((option) => (
                    <option key={option.id} value={option.id}>{option.name}{option.active ? " (active)" : ""}</option>
                  ))}
                </select>
              </label>
              <Button type="submit" variant="outline">View year</Button>
            </form>
          )}
        </CardContent>
      </Card>

      {checks.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {checks.map((check) => (
            <Link
              key={check.route}
              href={linkTo(check.route, year && check.route === "setup/class-subjects" ? { academicYearId: year.id } : undefined)}
              className="flex items-center gap-3 rounded-xl border bg-card p-4 hover:bg-muted/40"
            >
              {check.ready ? <CheckCircle2 className="size-5 shrink-0 text-emerald-600" /> : <CircleDashed className="size-5 shrink-0 text-muted-foreground" />}
              <div className="min-w-0 flex-1">
                <p className="font-medium">{check.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{check.detail}</p>
              </div>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}

      {classCoverageVisible && (
        <section aria-labelledby="class-coverage-heading" className="space-y-3">
          <div>
            <h2 id="class-coverage-heading" className="text-lg font-semibold">Class-by-class coverage{year ? ` · ${year.name}` : ""}</h2>
            <p className="text-sm text-muted-foreground">Check active sections, subject mappings, and teaching coverage.</p>
          </div>
          {!year && <p className="rounded-xl border p-4 text-sm">Select an academic year to review subject assignments and timetable coverage.</p>}
          {!classCount && <p className="rounded-xl border p-4 text-sm">Add an active class to review its setup.</p>}

          {coverage.rows.map((row) => {
            const filters = year ? { academicYearId: year.id, classId: row.id } : undefined;
            return (
              <Card key={row.id}>
                <CardContent className="space-y-3 p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="font-semibold">{row.name}</h3>
                      <p className="text-xs text-muted-foreground">{row.branch.syllabus.name} · {row.branch.name}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {canManageSections && <Badge variant={row.sections.length ? "secondary" : "warning"}>
                        {row.sections.length} active {row.sections.length === 1 ? "section" : "sections"}
                      </Badge>}
                      {year && canMapSubjects && <Badge variant={row.subjectCount ? "secondary" : "warning"}>
                        {row.subjectCount} mapped {row.subjectCount === 1 ? "subject" : "subjects"}
                      </Badge>}
                    </div>
                  </div>

                  {row.sections.length === 0 && canManageSections && (
                    <Button asChild size="sm" variant="outline">
                      <Link href={linkTo("sections", { classId: row.id })}>Add section</Link>
                    </Button>
                  )}
                  {filters && row.subjectCount === 0 && canMapSubjects && (
                    <Button asChild size="sm" variant="outline">
                      <Link href={linkTo("setup/class-subjects", filters)}>Map class subjects</Link>
                    </Button>
                  )}
                  {year && row.subjectCount === 0 && !canMapSubjects && (canAllocateTeachers || canBuildTimetable) && (
                    <p className="text-sm text-muted-foreground">Map subjects for this class before checking teaching coverage.</p>
                  )}

                  {filters && row.subjectCount > 0 && (canAllocateTeachers || canBuildTimetable) && row.sections.length > 0 && (
                    <ul className="divide-y rounded-lg border">
                      {row.sections.map((section) => (
                        <li key={section.id} className="grid gap-2 px-3 py-2.5 sm:grid-cols-[7rem_1fr]">
                          <p className="text-sm font-medium">Section {section.name}</p>
                          <div className="space-y-1.5 text-sm">
                            {section.missingTeachers.length > 0 && (
                              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                                <span className="text-muted-foreground">Teacher needed:</span>
                                {section.missingTeachers.map((subject) => canAllocateTeachers ? (
                                  <Link key={subject.id} className="rounded px-0.5 text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-current" href={linkTo("teacher-allocations", { ...filters, sectionId: section.id, subjectId: subject.id })}>
                                    {subject.name}
                                  </Link>
                                ) : <span key={subject.id}>{subject.name}</span>)}
                              </div>
                            )}
                            {canBuildTimetable && section.missingSlots.length > 0 && (
                              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                                <span className="text-muted-foreground">Timetable slot needed:</span>
                                {section.missingSlots.map((subject) => (
                                  <Link key={subject.id} className="rounded px-0.5 text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-current" href={linkTo("timetable", { ...filters, sectionId: section.id, teacherAllocationId: subject.allocationId })}>
                                    {subject.name}
                                  </Link>
                                ))}
                              </div>
                            )}
                            {section.missingTeachers.length === 0 && (!canBuildTimetable || section.missingSlots.length === 0) && (
                              <p className="text-emerald-700 dark:text-emerald-400">{canBuildTimetable ? "All mapped subjects scheduled" : "All mapped subjects have teachers"}</p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </section>
      )}
    </div>
  );
}
