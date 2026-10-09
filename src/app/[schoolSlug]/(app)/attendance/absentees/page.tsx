import { notFound } from "next/navigation";

import { AbsenteeSelectionPage } from "@/features/attendance/components/AbsenteeSelectionPage";
import { requireTenant } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type AttendanceMode = "ONCE_DAILY" | "MORNING_AFTERNOON" | "EVERY_PERIOD";
type Scope = "SCHOOL" | "SYLLABUS" | "BRANCH" | "CLASS" | "SECTION";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const scopes = new Set<Scope>([
  "SCHOOL",
  "SYLLABUS",
  "BRANCH",
  "CLASS",
  "SECTION",
]);

function valueOf(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

export default async function AttendanceAbsenteesPage({ searchParams }: Props) {
  const tenant = await requireTenant();
  const query = await searchParams;
  const academicYearId = valueOf(query.academicYearId);
  const attendanceDate = valueOf(query.attendanceDate);
  const scope = valueOf(query.scope) as Scope;

  if (
    !academicYearId ||
    !/^\d{4}-\d{2}-\d{2}$/.test(attendanceDate) ||
    !scopes.has(scope)
  ) {
    notFound();
  }

  const syllabusId = valueOf(query.syllabusId);
  const branchId = valueOf(query.branchId);
  const classId = valueOf(query.classId);
  const sectionId = valueOf(query.sectionId);
  const draftDate = new Date(`${attendanceDate}T00:00:00.000Z`);

  if (
    Number.isNaN(draftDate.getTime()) ||
    draftDate.toISOString().slice(0, 10) !== attendanceDate ||
    (scope !== "SCHOOL" && !syllabusId) ||
    (["BRANCH", "CLASS", "SECTION"].includes(scope) && !branchId) ||
    (["CLASS", "SECTION"].includes(scope) && !classId) ||
    (scope === "SECTION" && !sectionId)
  ) {
    notFound();
  }

  const academicYear = await prisma.academicYear.findFirst({
    where: { id: academicYearId, schoolId: tenant.schoolId },
    select: { attendanceMode: true },
  });

  if (!academicYear) notFound();

  const preparedSession = await prisma.attendanceSession.findFirst({
    where: {
      schoolId: tenant.schoolId,
      academicYearId,
      attendanceDate: draftDate,
      locked: false,
      ...(scope !== "SCHOOL" && syllabusId
        ? { class: { branch: { syllabusId } } }
        : {}),
      ...(["BRANCH", "CLASS", "SECTION"].includes(scope) && branchId
        ? { class: { branchId } }
        : {}),
      ...(["CLASS", "SECTION"].includes(scope) && classId ? { classId } : {}),
      ...(scope === "SECTION" && sectionId ? { sectionId } : {}),
    },
    select: { id: true },
  });

  if (!preparedSession) notFound();

  return (
    <AbsenteeSelectionPage
      academicYearId={academicYearId}
      attendanceDate={attendanceDate}
      attendanceMode={academicYear.attendanceMode as AttendanceMode}
      scope={scope}
      syllabusId={syllabusId}
      branchId={branchId}
      classId={classId}
      sectionId={sectionId}
      academicPathLabel={valueOf(query.academicPathLabel) || "Prepared student scope"}
    />
  );
}
