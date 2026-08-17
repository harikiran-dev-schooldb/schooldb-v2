import { FeeCollectionContainer } from "@/features/student-fees/components/FeeCollectionContainer";

type Props = {
  params: Promise<{
    schoolSlug: string;
  }>;
};

export default async function FeeCollectionPage({ params }: Props) {
  const { schoolSlug } = await params;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Fee Collection</h1>

        <p className="text-sm text-muted-foreground">
          Search a student and collect pending fees.
        </p>
      </div>

      <FeeCollectionContainer schoolSlug={schoolSlug} />
    </div>
  );
}
