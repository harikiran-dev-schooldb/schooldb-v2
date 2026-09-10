import { ToppersPage } from "@/features/exams/components/ToppersPage";

type Props = {
  params: Promise<{ schoolSlug: string }>;
};

export default async function Page({ params }: Props) {
  const { schoolSlug } = await params;

  return <ToppersPage schoolSlug={schoolSlug} />;
}
