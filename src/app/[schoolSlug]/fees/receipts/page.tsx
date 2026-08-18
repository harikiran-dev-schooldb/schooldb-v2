import { FeeReceiptsContainer } from "@/features/fee-receipts/components/FeeReceiptsContainer";

type Props = {
  params: Promise<{
    schoolSlug: string;
  }>;
};

export default async function ReceiptsPage({ params }: Props) {
  const { schoolSlug } = await params;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Fee Receipts</h1>

        <p className="text-sm text-muted-foreground">
          View all fee payments and receipts.
        </p>
      </div>

      <FeeReceiptsContainer schoolSlug={schoolSlug} />
    </div>
  );
}
