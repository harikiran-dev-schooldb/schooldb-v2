import { ExamDetailsPage } from "@/features/exams/components/ExamDetailsPage";

type Props = {
  params: Promise<{
    schoolSlug: string;
    examId: string;
  }>;
};

export default async function Page({ params }: Props) {
  const { schoolSlug, examId } = await params;

  return <ExamDetailsPage schoolSlug={schoolSlug} examId={examId} />;
}
