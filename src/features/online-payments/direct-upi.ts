const UPI_ID_PATTERN = /^[A-Za-z0-9._-]{2,256}@[A-Za-z0-9.-]{2,64}$/;
const UPI_REFERENCE_PATTERN = /^[A-Z0-9/_-]{6,80}$/;

export function isValidUpiId(value: string) {
  return UPI_ID_PATTERN.test(value.trim());
}

export function normalizeUpiReference(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

export function isValidUpiReference(value: string) {
  return UPI_REFERENCE_PATTERN.test(normalizeUpiReference(value));
}

export function buildDirectUpiUri({
  upiId,
  payeeName,
  amount,
  note,
}: {
  upiId: string;
  payeeName: string;
  amount: number;
  note: string;
}) {
  if (!isValidUpiId(upiId)) {
    throw new Error("Invalid UPI ID.");
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Payment amount must be greater than zero.");
  }

  const params = new URLSearchParams({
    pa: upiId.trim(),
    pn: payeeName.trim().slice(0, 80),
    am: amount.toFixed(2),
    cu: "INR",
    tn: note.trim().slice(0, 80),
  });

  return `upi://pay?${params.toString()}`;
}
