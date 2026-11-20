import { MarksEntryPage } from "@/features/exams/components/MarksEntryPage";
import { examScheduleService } from "@/features/exams/services/exam-schedule.service";
import { requireTenant } from "@/lib/auth";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{
    schoolSlug: string;
    examId: string;
    scheduleId: string;
  }>;
  searchParams: Promise<{ sectionId?: string | string[] }>;
};

export default async function Page({ params, searchParams }: Props) {
  const [{ schoolSlug, examId, scheduleId }, query] = await Promise.all([params, searchParams]);
  const { schoolId } = await requireTenant(schoolSlug);
  const schedule = await examScheduleService.getById(scheduleId, schoolId);
  if (!schedule || schedule.exam.id !== examId) notFound();

  const scheduledSectionId = schedule.section?.id;
  const initialSectionId = scheduledSectionId ?? (typeof query.sectionId === "string" ? query.sectionId : "");

  return (
    <MarksEntryPage
      key={`${scheduleId}:${initialSectionId}`}
      schoolSlug={schoolSlug}
      examId={examId}
      scheduleId={scheduleId}
      classId={schedule.class.id}
      academicYearId={schedule.exam.academicYearId}
      initialSectionId={initialSectionId}
      fixedSection={Boolean(scheduledSectionId)}
    />
  );
}
