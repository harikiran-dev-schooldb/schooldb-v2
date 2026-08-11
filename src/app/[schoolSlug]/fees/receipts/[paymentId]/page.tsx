import { FeeReceipt } from "@/features/student-fees/components/FeeReceipt";

type Props = {
  params: Promise<{
    schoolSlug: string;
    paymentId: string;
  }>;
};

export default async function FeeReceiptPage({ params }: Props) {
  const { paymentId } = await params;

  return <FeeReceipt paymentId={paymentId} />;
}
