import { StudentYearlyPerformanceReport } from "@/features/exams/components/StudentYearlyPerformanceReport";
import { getStudentYearlyPerformance } from "@/features/exams/services/student-yearly-performance.service";
import { publicSchoolLogoUrl } from "@/lib/school-branding";
import { requireStudentAccess } from "@/lib/student-access";

export default async function StudentReportCardPage({
  params,
  searchParams,
}: {
  params: Promise<{ schoolSlug: string; studentId: string }>;
  searchParams: Promise<{ academicYearId?: string }>;
}) {
  const [{ schoolSlug, studentId }, filters] = await Promise.all([params, searchParams]);
  const { membership } = await requireStudentAccess(schoolSlug, studentId);
  const data = await getStudentYearlyPerformance(
    membership.schoolId,
    studentId,
    filters.academicYearId,
  );

  if (!data) return null;

  return <StudentYearlyPerformanceReport data={data} logoUrl={publicSchoolLogoUrl(schoolSlug, data.student.school.logo, data.student.school.updatedAt)} backHref={`/${schoolSlug}/my/${studentId}`} />;
}
