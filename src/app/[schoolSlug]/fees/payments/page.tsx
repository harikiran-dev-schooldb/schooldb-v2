import { PaymentHistoryContainer } from "@/features/fee-payments/containers/PaymentHistoryContainer";

type Props = {
  params: Promise<{
    schoolSlug: string;
  }>;
};

export default function PaymentHistoryPage({ params }: Props) {
  return <PaymentHistoryContainer params={params} />;
}
