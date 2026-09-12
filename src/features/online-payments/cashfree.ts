import { ApiError } from "@/lib/errors";

const CASHFREE_API_VERSION = "2025-01-01";

export type CashfreeMode = "sandbox" | "production";

type CashfreeOrder = {
  order_id: string;
  order_amount: number;
  order_status: "ACTIVE" | "PAID" | "EXPIRED" | "TERMINATED" | string;
  payment_session_id?: string;
};

type CashfreePayment = {
  cf_payment_id?: number | string;
  payment_status?: string;
};

function config() {
  const appId = process.env.CASHFREE_APP_ID?.trim();
  const secretKey = process.env.CASHFREE_SECRET_KEY?.trim();
  const mode: CashfreeMode =
    process.env.CASHFREE_ENV?.toLowerCase() === "production"
      ? "production"
      : "sandbox";

  if (!appId || !secretKey) {
    throw new ApiError(503, "Online payments are not configured yet.");
  }

  return {
    appId,
    secretKey,
    mode,
    baseUrl:
      mode === "production"
        ? "https://api.cashfree.com/pg"
        : "https://sandbox.cashfree.com/pg",
  };
}

async function cashfreeRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const { appId, secretKey, baseUrl } = config();
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-api-version": CASHFREE_API_VERSION,
      "x-client-id": appId,
      "x-client-secret": secretKey,
      ...init?.headers,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });

  const data = (await response.json().catch(() => null)) as
    | (T & { message?: string })
    | null;

  if (!response.ok || !data) {
    throw new ApiError(
      502,
      data?.message || "Cashfree could not process this request. Please try again.",
    );
  }

  return data;
}

export function getCashfreeMode() {
  return config().mode;
}

export function getCashfreeSecretKey() {
  return config().secretKey;
}

export async function createCashfreeProviderOrder(input: {
  orderId: string;
  amount: number;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  returnUrl: string;
  notifyUrl: string;
  idempotencyKey: string;
}) {
  return cashfreeRequest<CashfreeOrder>("/orders", {
    method: "POST",
    headers: { "x-idempotency-key": input.idempotencyKey },
    body: JSON.stringify({
      order_id: input.orderId,
      order_amount: input.amount,
      order_currency: "INR",
      customer_details: {
        customer_id: input.customerId,
        customer_name: input.customerName,
        customer_phone: input.customerPhone,
        ...(input.customerEmail ? { customer_email: input.customerEmail } : {}),
      },
      order_meta: {
        return_url: input.returnUrl,
        notify_url: input.notifyUrl,
      },
      order_note: "School fee payment",
      // Cashfree requires the expiry to be strictly more than 15 minutes away.
      order_expiry_time: new Date(Date.now() + 20 * 60 * 1_000).toISOString(),
    }),
  });
}

export function getCashfreeProviderOrder(orderId: string) {
  return cashfreeRequest<CashfreeOrder>(`/orders/${encodeURIComponent(orderId)}`);
}

export function getCashfreeOrderPayments(orderId: string) {
  return cashfreeRequest<CashfreePayment[]>(
    `/orders/${encodeURIComponent(orderId)}/payments`,
  );
}
