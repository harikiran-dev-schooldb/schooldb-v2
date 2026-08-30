import { FeeReceiptsContainer } from "@/features/fee-receipts/components/FeeReceiptsContainer";
import { CreditCard, ReceiptText } from "lucide-react";

type Props = {
  params: Promise<{
    schoolSlug: string;
  }>;
};

export default async function ReceiptsPage({ params }: Props) {
  const { schoolSlug } = await params;

  return (
    <div className="space-y-8 pb-10">
      {/* ================================================================ */}
      {/* PAGE HEADER                                                       */}
      {/* ================================================================ */}

      <div className="flex flex-col gap-4 border-b border-border/60 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ReceiptText className="size-5" />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight">Fee Receipts</h1>

            <p className="mt-1 text-sm text-muted-foreground">
              View, search, and manage all fee payments and receipts.
            </p>
          </div>
        </div>

        <div className="flex w-fit items-center gap-2 rounded-xl border border-border/60 bg-card px-3 py-2 shadow-sm">
          <CreditCard className="size-4 text-primary" />

          <span className="text-xs font-medium text-muted-foreground">
            Payment History
          </span>
        </div>
      </div>

      {/* ================================================================ */}
      {/* RECEIPTS WORKSPACE                                                */}
      {/* ================================================================ */}

      <section className="premium-card overflow-hidden rounded-3xl">
        <div className="border-b border-border/60 bg-muted/20 px-5 py-5 md:px-7">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
              <ReceiptText className="size-4 text-primary" />
            </div>

            <div>
              <p className="text-sm font-bold tracking-tight">
                Receipt Directory
              </p>

              <p className="mt-0.5 text-xs text-muted-foreground">
                Search and filter fee payment records.
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 md:p-6">
          <FeeReceiptsContainer schoolSlug={schoolSlug} />
        </div>
      </section>
    </div>
  );
}
