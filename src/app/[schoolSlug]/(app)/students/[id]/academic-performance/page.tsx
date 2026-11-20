import { notFound } from "next/navigation";

import { StudentYearlyPerformanceReport } from "@/features/exams/components/StudentYearlyPerformanceReport";
import { getStudentYearlyPerformance } from "@/features/exams/services/student-yearly-performance.service";
import {
  requirePermission,
  requireTeacherFeatureAccess,
  requireTeacherStudent,
  requireTenant,
} from "@/lib/auth";
import { PERMISSIONS } from "@/lib/access-control";
import { publicSchoolLogoUrl } from "@/lib/school-branding";

type Props = {
  params: Promise<{ schoolSlug: string; id: string }>;
  searchParams: Promise<{ academicYearId?: string }>;
};

export default async function StudentAcademicPerformancePage({ params, searchParams }: Props) {
  const [{ schoolSlug, id }, filters] = await Promise.all([params, searchParams]);
  const tenant = await requireTenant(schoolSlug);

  if (tenant.role === "TEACHER") {
    await requireTeacherFeatureAccess("RESULTS", schoolSlug);
    await requireTeacherStudent(id, filters.academicYearId, schoolSlug);
  } else {
    await requirePermission(PERMISSIONS.STUDENT_PRIVATE_READ, schoolSlug);
  }

  const data = await getStudentYearlyPerformance(
    tenant.schoolId,
    id,
    filters.academicYearId,
  );
  if (!data) notFound();

  return (
    <StudentYearlyPerformanceReport
      data={data}
      logoUrl={publicSchoolLogoUrl(
        schoolSlug,
        data.student.school.logo,
        data.student.school.updatedAt,
      )}
      backHref={`/${schoolSlug}/students/${id}?tab=results`}
    />
  );
}
