import { SubjectPerformancePage } from "@/features/exams/components/SubjectPerformancePage";

type Props = { params: Promise<{ schoolSlug: string }> };

export default async function Page({ params }: Props) {
  const { schoolSlug } = await params;
  return <SubjectPerformancePage schoolSlug={schoolSlug} />;
}
