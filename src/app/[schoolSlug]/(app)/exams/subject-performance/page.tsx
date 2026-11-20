import { SubjectPerformancePage } from "@/features/exams/components/SubjectPerformancePage";
import { ResultsAnalyticsNav } from "@/features/exams/components/ResultsAnalyticsNav";

type Props = { params: Promise<{ schoolSlug: string }> };

export default async function Page({ params }: Props) {
  const { schoolSlug } = await params;
  return <div className="space-y-6"><ResultsAnalyticsNav schoolSlug={schoolSlug} current="subject-performance" /><SubjectPerformancePage schoolSlug={schoolSlug} /></div>;
}
