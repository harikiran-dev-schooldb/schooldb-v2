import { ExamMarksPage } from "@/features/exams/components/ExamMarksPage";

type Props = {
  params: Promise<{
    schoolSlug: string;
    examId: string;
  }>;
};

export default async function ExamMarksRoute({ params }: Props) {
  const { schoolSlug, examId } = await params;

  return <ExamMarksPage schoolSlug={schoolSlug} examId={examId} />;
}
