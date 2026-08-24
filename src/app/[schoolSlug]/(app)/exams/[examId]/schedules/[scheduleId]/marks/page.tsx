import { MarksEntryPage } from "@/features/exams/components/MarksEntryPage";

type Props = {
  params: Promise<{
    schoolSlug: string;
    examId: string;
    scheduleId: string;
  }>;
};

export default async function Page({ params }: Props) {
  const { schoolSlug, examId, scheduleId } = await params;

  return (
    <MarksEntryPage
      schoolSlug={schoolSlug}
      examId={examId}
      scheduleId={scheduleId}
    />
  );
}
