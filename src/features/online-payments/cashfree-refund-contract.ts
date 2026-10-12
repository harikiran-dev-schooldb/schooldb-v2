export type CashfreeRefund = {
  cf_payment_id?: number | string;
  cf_refund_id?: string;
  refund_id: string;
  order_id: string;
  refund_amount: number;
  refund_status: "PENDING" | "SUCCESS" | "CANCELLED" | "FAILED" | string;
  refund_note?: string;
  status_description?: string;
  refund_arn?: string;
  processed_at?: string;
};

export function cashfreeRefundPath(orderId: string) {
  return `/orders/${encodeURIComponent(orderId)}/refunds`;
}

export function cashfreeRefundPayload(input: {
  refundId: string;
  amount: number;
  note: string;
}) {
  return {
    refund_id: input.refundId,
    refund_amount: input.amount,
    refund_note: input.note,
    refund_speed: "STANDARD",
  } as const;
}
