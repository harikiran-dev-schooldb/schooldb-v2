import { OutstandingFeesContainer } from "@/features/student-fees/components/OutstandingFeesContainer";

type Props = {
  params: Promise<{
    schoolSlug: string;
  }>;
};

export default async function OutstandingFeesPage({ params }: Props) {
  const { schoolSlug } = await params;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Outstanding Fees</h1>

        <p className="text-sm text-muted-foreground">
          View and collect pending student fees
        </p>
      </div>

      <OutstandingFeesContainer schoolSlug={schoolSlug} />
    </div>
  );
}
