import { StudentResultDetailsPage } from "@/features/exams/components/StudentResultDetailsPage";

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
    <StudentResultDetailsPage
      schoolSlug={schoolSlug}
      examId={examId}
      studentId={studentId}
    />
  );
}
