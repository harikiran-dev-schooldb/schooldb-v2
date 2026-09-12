import { z } from "zod";

export const EXPENSE_CATEGORIES = [
  "SALARIES",
  "UTILITIES",
  "MAINTENANCE",
  "SUPPLIES",
  "TRANSPORT",
  "EVENTS",
  "TECHNOLOGY",
  "OTHER",
] as const;

export const EXPENSE_PAYMENT_MODES = [
  "CASH",
  "UPI",
  "CARD",
  "BANK_TRANSFER",
  "CHEQUE",
  "ONLINE",
] as const;

function isRealIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

const optionalText = (maximum: number) =>
  z
    .string()
    .trim()
    .max(maximum)
    .transform((value) => value || null);

export const expenseInputSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES),
  description: z.string().trim().min(3).max(240),
  vendor: optionalText(160),
  amount: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount with up to two decimals")
    .transform(Number)
    .refine(
      (amount) => amount > 0 && amount <= 99_999_999.99,
      "Enter an amount greater than zero",
    ),
  expenseDate: z.string().refine(isRealIsoDate, "Enter a valid expense date"),
  paymentMode: z.enum(EXPENSE_PAYMENT_MODES),
  referenceNo: optionalText(120),
  remarks: optionalText(1000),
});

export const voidExpenseSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});
