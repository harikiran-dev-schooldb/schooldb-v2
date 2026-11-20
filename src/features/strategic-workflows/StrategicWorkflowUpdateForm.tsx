"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { updateStrategicWorkflow } from "./actions";
import { WORKFLOW_STATUSES, workflowLabel } from "./constants";

const field = "h-10 w-full rounded-xl border border-input bg-card px-3 text-sm outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10";

export function StrategicWorkflowUpdateForm({ schoolSlug, workflowId, status }: { schoolSlug: string; workflowId: string; status: string }) {
  const [state, action, pending] = useActionState(updateStrategicWorkflow.bind(null, schoolSlug, workflowId), { error: "", success: false });
  useEffect(() => {
    if (state.success) toast.success(state.message || "Workflow updated.");
  }, [state]);
  return (
    <form action={action} className="grid gap-3 border-t border-border/60 pt-4 sm:grid-cols-[180px_minmax(0,1fr)_auto] sm:items-end">
      <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status
        <select name="status" className={field} defaultValue={status}>
          {WORKFLOW_STATUSES.map((item) => <option key={item} value={item}>{workflowLabel(item)}</option>)}
        </select>
      </label>
      <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Progress note
        <Textarea name="comment" rows={1} className="min-h-10 py-2" maxLength={2000} placeholder="Outcome, blocker or next action…" />
      </label>
      <Button size="sm" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
      {state.error && <p role="alert" className="text-xs text-destructive sm:col-span-3">{state.error}</p>}
    </form>
  );
}
