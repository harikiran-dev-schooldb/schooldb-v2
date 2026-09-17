import { ExamTimetablePage } from "@/features/exams/components/ExamTimetablePage";

type Props = {
  params: Promise<{
    schoolSlug: string;
    examId: string;
  }>;
};

export default async function ExamTimetableRoute({ params }: Props) {
  const { schoolSlug, examId } = await params;

  return <ExamTimetablePage schoolSlug={schoolSlug} examId={examId} />;
}
