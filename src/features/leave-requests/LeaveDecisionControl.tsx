"use client";

import { useActionState, useRef, useState } from "react";
import { Check, X } from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";

import { decideLeaveRequest } from "./actions";

type Decision = "APPROVED" | "REJECTED";

export function LeaveDecisionControl({ schoolSlug, requestId, studentName }: { schoolSlug: string; requestId: string; studentName: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [state, action, pending] = useActionState(
    decideLeaveRequest.bind(null, schoolSlug, requestId),
    { error: "", success: false },
  );

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" type="button" onClick={() => setDecision("APPROVED")}><Check className="size-4" />Approve</Button>
        <Button size="sm" type="button" variant="destructive" onClick={() => setDecision("REJECTED")}><X className="size-4" />Reject</Button>
      </div>
      <AlertDialog open={decision !== null} onOpenChange={(open) => { if (!open && !pending) setDecision(null); }}>
        <AlertDialogContent>
          <form ref={formRef} action={action} onSubmit={() => setDecision(null)} className="grid gap-5">
            <input type="hidden" name="decision" value={decision ?? ""} />
            <AlertDialogHeader>
              <AlertDialogTitle>{decision === "APPROVED" ? "Approve" : "Reject"} {studentName}&apos;s leave?</AlertDialogTitle>
              <AlertDialogDescription>Add a note explaining the decision. The student or parent will see it immediately.</AlertDialogDescription>
            </AlertDialogHeader>
            <label className="grid gap-2 text-sm font-semibold">
              Decision note
              <Textarea name="decisionNote" required minLength={3} maxLength={1000} placeholder="Add the reason for this decision…" />
            </label>
            {state.error && <p role="alert" className="text-sm font-medium text-destructive">{state.error}</p>}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
              <Button
                type="button"
                variant={decision === "REJECTED" ? "destructive" : "default"}
                disabled={pending}
                onClick={() => formRef.current?.requestSubmit()}
              >
                {pending ? "Saving…" : decision === "APPROVED" ? "Confirm approval" : "Confirm rejection"}
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
