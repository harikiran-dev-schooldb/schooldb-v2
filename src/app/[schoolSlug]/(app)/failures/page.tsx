import { FailuresPage } from "@/features/exams/components/FailuresPage";

type Props = {
  params: Promise<{ schoolSlug: string }>;
};

export default async function Page({ params }: Props) {
  const { schoolSlug } = await params;

  return <FailuresPage schoolSlug={schoolSlug} />;
}
