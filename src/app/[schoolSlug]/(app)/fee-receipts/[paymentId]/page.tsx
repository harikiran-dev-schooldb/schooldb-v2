import { permanentRedirect } from "next/navigation";

type Props = {
  params: Promise<{
    schoolSlug: string;
    paymentId: string;
  }>;
};

export default async function FeeReceiptPage({ params }: Props) {
  const { schoolSlug, paymentId } = await params;

  permanentRedirect(`/${schoolSlug}/fees/receipts/${paymentId}`);
}
