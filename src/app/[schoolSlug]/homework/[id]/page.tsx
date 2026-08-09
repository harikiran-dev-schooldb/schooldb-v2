import { HomeworkDetails } from "@/features/homework/components/HomeworkDetails";

type Props = {
  params: Promise<{
    schoolSlug: string;
    id: string;
  }>;
};

export default async function HomeworkDetailsPage({ params }: Props) {
  const { id } = await params;

  return (
    <div className="container mx-auto py-6">
      <HomeworkDetails homeworkId={id} />
    </div>
  );
}
