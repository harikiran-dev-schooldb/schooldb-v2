import { BulkExamMarksPage } from "@/features/exams/components/BulkExamMarksPage";

type Props = {
  params: Promise<{
    schoolSlug: string;
    examId: string;
  }>;
};

export default async function BulkExamMarksRoute({ params }: Props) {
  const { schoolSlug, examId } = await params;

  return <BulkExamMarksPage schoolSlug={schoolSlug} examId={examId} />;
}
