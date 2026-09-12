"use server";

import { revalidatePath } from "next/cache";

import {
  expenseInputSchema,
  voidExpenseSchema,
} from "@/features/expenses/schema";
import { recordAuditLog } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type ExpenseActionState = {
  error: string;
  success: boolean;
};

export async function createExpense(
  schoolSlug: string,
  _previous: ExpenseActionState,
  formData: FormData,
): Promise<ExpenseActionState> {
  const membership = await requireRole(
    ["SUPER_ADMIN", "SCHOOL_ADMIN", "ACCOUNTANT"],
    schoolSlug,
  );
  const parsed = expenseInputSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message || "Check the expense details.",
      success: false,
    };
  }

  const input = parsed.data;
  const expense = await prisma.expense.create({
    data: {
      schoolId: membership.schoolId,
      category: input.category,
      description: input.description,
      vendor: input.vendor,
      amount: input.amount,
      expenseDate: new Date(`${input.expenseDate}T00:00:00.000Z`),
      paymentMode: input.paymentMode,
      referenceNo: input.referenceNo,
      remarks: input.remarks,
      recordedBy: membership.userId,
    },
    select: { id: true, amount: true, description: true, category: true },
  });

  await recordAuditLog({
    actor: membership,
    module: "FEES",
    action: "CREATE",
    entityType: "EXPENSE",
    entityId: expense.id,
    summary: `Recorded ₹${Number(expense.amount).toLocaleString("en-IN")} expense for ${expense.description}.`,
    metadata: { amount: Number(expense.amount), category: expense.category },
  });

  revalidatePath(`/${schoolSlug}/expenses`);
  return { error: "", success: true };
}

export async function voidExpense(
  schoolSlug: string,
  expenseId: string,
  _previous: ExpenseActionState,
  formData: FormData,
): Promise<ExpenseActionState> {
  const membership = await requireRole(
    ["SUPER_ADMIN", "SCHOOL_ADMIN", "ACCOUNTANT"],
    schoolSlug,
  );
  const parsed = voidExpenseSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      error: "Enter a reason before voiding this expense.",
      success: false,
    };
  }

  const result = await prisma.expense.updateMany({
    where: {
      id: expenseId,
      schoolId: membership.schoolId,
      status: "POSTED",
    },
    data: {
      status: "VOID",
      voidedAt: new Date(),
      voidedBy: membership.userId,
      voidReason: parsed.data.reason,
    },
  });

  if (result.count === 0) {
    return {
      error: "This expense was not found or is already void.",
      success: false,
    };
  }

  await recordAuditLog({
    actor: membership,
    module: "FEES",
    action: "VOID",
    entityType: "EXPENSE",
    entityId: expenseId,
    summary: `Voided an expense: ${parsed.data.reason}.`,
    metadata: { reason: parsed.data.reason },
  });

  revalidatePath(`/${schoolSlug}/expenses`);
  return { error: "", success: true };
}
