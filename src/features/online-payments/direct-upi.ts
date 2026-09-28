const UPI_ID_PATTERN = /^[A-Za-z0-9._-]{2,256}@[A-Za-z0-9.-]{2,64}$/;

export function isValidUpiId(value: string) {
  return UPI_ID_PATTERN.test(value.trim());
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
