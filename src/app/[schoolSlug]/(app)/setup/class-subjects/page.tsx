import { ClassSubjectsPage } from "@/features/class-subjects/components/ClassSubjectsPage";
import { readSetupParam, type SetupSearchParams } from "@/features/school-setup/setup-readiness";

export default async function Page({ searchParams }: { searchParams: SetupSearchParams }) {
  const params = await searchParams;
  const academicYearId = readSetupParam(params, "academicYearId");
  const classId = academicYearId ? readSetupParam(params, "classId") : undefined;

  return (
    <ClassSubjectsPage
      key={`${academicYearId ?? ""}:${classId ?? ""}`}
      initialAcademicYearId={academicYearId}
      initialClassId={classId}
    />
  );
}
