"use client";

import { useActionState, useState } from "react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { voidExpense } from "@/features/expenses/actions";

export function VoidExpenseButton({
  schoolSlug,
  expenseId,
}: {
  schoolSlug: string;
  expenseId: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(
    voidExpense.bind(null, schoolSlug, expenseId),
    { error: "", success: false },
  );

  if (state.success) return null;

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
      >
        Void
      </Button>
      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          if (!pending) setOpen(next);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Void this expense?</AlertDialogTitle>
            <AlertDialogDescription>
              The entry remains in the audit trail but is excluded from totals.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <form action={action} className="space-y-4">
            <label className="grid gap-2 text-sm font-medium">
              Reason
              <Input
                name="reason"
                minLength={3}
                maxLength={500}
                required
                placeholder="Why is this entry being voided?"
              />
            </label>
            {state.error && (
              <p role="alert" className="text-sm text-destructive">
                {state.error}
              </p>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
              <Button variant="destructive" disabled={pending}>
                {pending ? "Voiding…" : "Void expense"}
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
