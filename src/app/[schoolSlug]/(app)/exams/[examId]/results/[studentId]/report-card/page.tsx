import { StudentReportCardPage } from "@/features/exams/components/StudentReportCardPage";

type Props = {
  params: Promise<{
    schoolSlug: string;
    examId: string;
    studentId: string;
  }>;
};

export default async function Page({ params }: Props) {
  const { schoolSlug, examId, studentId } = await params;

  return (
    <StudentReportCardPage
      schoolSlug={schoolSlug}
      examId={examId}
      studentId={studentId}
    />
  );
}
