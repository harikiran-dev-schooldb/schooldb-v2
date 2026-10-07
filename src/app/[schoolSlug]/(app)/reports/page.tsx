import { CalendarCheck2 } from "lucide-react";

import { PageContainer, PageHeader } from "@/components/common/layout";
import { Card, CardContent } from "@/components/ui/card";
import { ReportExportCenter } from "@/features/reports/ReportExportCenter";
import { ReportExportHistory } from "@/features/reports/ReportExportHistory";
import { ReportsFilters } from "@/features/reports/ReportsFilters";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{ schoolSlug: string }>;
  searchParams: Promise<{
    academicYearId?: string;
    classId?: string;
    sectionId?: string;
    from?: string;
    to?: string;
  }>;
};

function dateKey(value: Date) {
  return [
    value.getUTCFullYear(),
    String(value.getUTCMonth() + 1).padStart(2, "0"),
    String(value.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function validDate(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || dateKey(date) !== value ? undefined : value;
}

export default async function ReportsPage({ params, searchParams }: Props) {
  const [{ schoolSlug }, requested] = await Promise.all([params, searchParams]);
  const membership = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"], schoolSlug);

  const [academicYear, selectedClass, selectedSection] = await Promise.all([
    prisma.academicYear.findFirst({
      where: {
        schoolId: membership.schoolId,
        ...(requested.academicYearId ? { id: requested.academicYearId } : { active: true }),
      },
      orderBy: [{ active: "desc" }, { startDate: "desc" }],
      select: { id: true, startDate: true, endDate: true },
    }),
    requested.classId
      ? prisma.class.findFirst({
          where: { id: requested.classId, schoolId: membership.schoolId, active: true },
          select: { id: true },
        })
      : null,
    requested.classId && requested.sectionId
      ? prisma.section.findFirst({
          where: {
            id: requested.sectionId,
            classId: requested.classId,
            active: true,
            class: { schoolId: membership.schoolId },
          },
          select: { id: true },
        })
      : null,
  ]);

  if (!academicYear) {
    return (
      <PageContainer>
        <PageHeader
          title="Reports"
          description="Download school records and operational reports from one place."
        />
        <Card>
          <CardContent className="flex min-h-64 flex-col items-center justify-center text-center">
            <CalendarCheck2 className="size-10 text-muted-foreground" />
            <h2 className="mt-4 text-lg font-bold">No academic year available</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Add and activate an academic year to enable academic and fee report filters.
            </p>
          </CardContent>
        </Card>
        <ReportExportCenter
          schoolSlug={schoolSlug}
          filters={{ academicYearId: "", classId: "", sectionId: "", from: "", to: "" }}
          exams={[]}
        />
      </PageContainer>
    );
  }

  const defaultTo = new Date();
  if (defaultTo < academicYear.startDate) defaultTo.setTime(academicYear.startDate.getTime());
  if (defaultTo > academicYear.endDate) defaultTo.setTime(academicYear.endDate.getTime());
  const defaultFrom = new Date(defaultTo);
  defaultFrom.setUTCDate(defaultFrom.getUTCDate() - 29);
  if (defaultFrom < academicYear.startDate) defaultFrom.setTime(academicYear.startDate.getTime());

  const scope = {
    academicYearId: academicYear.id,
    classId: selectedClass?.id ?? "",
    sectionId: selectedSection?.id ?? "",
    from: validDate(requested.from) ?? dateKey(defaultFrom),
    to: validDate(requested.to) ?? dateKey(defaultTo),
  };
  const exams = await prisma.exam.findMany({
    where: {
      schoolId: membership.schoolId,
      academicYearId: academicYear.id,
      active: true,
    },
    orderBy: [{ startDate: "desc" }, { name: "asc" }],
    select: { id: true, name: true },
  });

  return (
    <PageContainer>
      <PageHeader
        title="Reports"
        description="Download student, academic, finance, staff, library, transport and operational reports from one page."
      />
      <ReportsFilters
        key={`${scope.academicYearId}:${scope.classId}:${scope.sectionId}:${scope.from}:${scope.to}`}
        schoolSlug={schoolSlug}
        initial={scope}
      />
      <ReportExportCenter schoolSlug={schoolSlug} filters={scope} exams={exams} />
      <ReportExportHistory />
    </PageContainer>
  );
}
