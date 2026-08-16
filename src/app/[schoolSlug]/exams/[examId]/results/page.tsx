import { ExamResultsPage } from "@/features/exams/components/ExamResultsPage";

type Props = {
  params: Promise<{
    schoolSlug: string;
    examId: string;
  }>;
};

export default async function Page({ params }: Props) {
  const { schoolSlug, examId } = await params;

  return <ExamResultsPage schoolSlug={schoolSlug} examId={examId} />;
}
