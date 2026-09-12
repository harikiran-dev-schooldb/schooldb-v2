"use client";

import { useActionState, useEffect, useRef } from "react";
import { FileText, PlusCircle, ReceiptIndianRupee } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createExpense } from "@/features/expenses/actions";
import { EXPENSE_CATEGORIES, EXPENSE_PAYMENT_MODES } from "@/features/expenses/schema";

const fieldClass = "h-10 w-full rounded-xl border border-input bg-card px-3.5 text-sm shadow-sm outline-none transition-all hover:border-primary/25 focus:border-primary/50 focus:ring-4 focus:ring-primary/10";

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase());
}

export function ExpenseForm({ schoolSlug, defaultDate }: { schoolSlug: string; defaultDate: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(createExpense.bind(null, schoolSlug), { error: "", success: false });

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <Card className="overflow-hidden rounded-2xl border-border/60 shadow-sm">
      <CardHeader className="border-b bg-muted/20 px-5 py-5 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base">Record an expense</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Add a verified school payment to the financial ledger.</p>
          </div>
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10"><ReceiptIndianRupee className="size-5 text-primary" /></div>
        </div>
      </CardHeader>
      <CardContent className="p-5 sm:p-6">
        <form ref={formRef} action={action} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium">Date<Input name="expenseDate" type="date" defaultValue={defaultDate} required /></label>
            <label className="grid gap-2 text-sm font-medium">Category<select name="category" className={fieldClass} defaultValue="SUPPLIES">{EXPENSE_CATEGORIES.map((category) => <option key={category} value={category}>{label(category)}</option>)}</select></label>
            <label className="grid gap-2 text-sm font-medium">Amount (₹)<Input name="amount" type="number" min="0.01" max="99999999.99" step="0.01" required placeholder="0.00" /></label>
            <label className="grid gap-2 text-sm font-medium">Payment mode<select name="paymentMode" className={fieldClass} defaultValue="BANK_TRANSFER">{EXPENSE_PAYMENT_MODES.map((mode) => <option key={mode} value={mode}>{label(mode)}</option>)}</select></label>
          </div>

          <div className="border-t border-border/60 pt-5">
            <div className="mb-4 flex items-center gap-2"><FileText className="size-4 text-primary" /><p className="text-sm font-semibold">Expense details</p></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium sm:col-span-2">Description<Input name="description" minLength={3} maxLength={240} required placeholder="Electricity bill for August" /></label>
              <label className="grid gap-2 text-sm font-medium">Vendor (optional)<Input name="vendor" maxLength={160} placeholder="Vendor or payee" /></label>
              <label className="grid gap-2 text-sm font-medium">Reference number (optional)<Input name="referenceNo" maxLength={120} placeholder="Cheque, UTR, or invoice number" /></label>
              <label className="grid gap-2 text-sm font-medium sm:col-span-2">Remarks (optional)<Input name="remarks" maxLength={1000} placeholder="Additional context for the audit trail" /></label>
            </div>
          </div>

          {state.error ? <p role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">{state.error}</p> : null}
          {state.success ? <p role="status" className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-700">Expense recorded successfully.</p> : null}

          <div className="flex items-center justify-end border-t border-border/60 pt-5">
            <Button size="lg" disabled={pending}><PlusCircle className="size-4" />{pending ? "Recording…" : "Record expense"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
