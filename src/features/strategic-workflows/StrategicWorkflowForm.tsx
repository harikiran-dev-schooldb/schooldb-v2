"use client";

import { Plus, X } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { createStrategicWorkflow } from "./actions";
import { WORKFLOW_PRIORITIES, WORKFLOW_TYPES, workflowLabel } from "./constants";

const field = "h-11 w-full rounded-xl border border-input bg-card px-3.5 text-sm shadow-sm outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10";

type Option = { value: string; label: string };

export function StrategicWorkflowForm({
  schoolSlug,
  staff,
  students,
  teachers,
}: {
  schoolSlug: string;
  staff: Option[];
  students: Option[];
  teachers: Option[];
}) {
  const ref = useRef<HTMLFormElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [state, action, pending] = useActionState(createStrategicWorkflow.bind(null, schoolSlug), { error: "", success: false });

  useEffect(() => {
    if (state.success) {
      toast.success(state.message || "Workflow created.");
      ref.current?.reset();
    }
  }, [state]);

  if (!expanded) {
    return (
      <section className="flex flex-col gap-4 rounded-3xl border border-indigo-200/70 bg-gradient-to-r from-indigo-50/75 via-card to-violet-50/60 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-indigo-500/20 dark:from-indigo-500/10 dark:to-violet-500/[0.06]">
        <div>
          <h2 className="font-bold">Start accountable work</h2>
          <p className="mt-1 text-sm text-muted-foreground">Assign an owner, deadline and linked student or teacher only when needed.</p>
        </div>
        <Button type="button" onClick={() => setExpanded(true)} className="shrink-0"><Plus className="size-4" />New workflow</Button>
      </section>
    );
  }

  return (
    <form ref={ref} action={action} className="space-y-5 rounded-3xl border border-border/70 bg-card p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold">Create workflow</h2>
          <p className="mt-1 text-sm text-muted-foreground">Start an accountable workflow with an owner, deadline and permanent history.</p>
        </div>
        <Button type="button" variant="ghost" size="icon" className="shrink-0 rounded-xl" onClick={() => setExpanded(false)} aria-label="Close workflow form"><X className="size-4" /></Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold">Workflow area
          <select name="type" className={field} defaultValue="EARLY_WARNING">
            {WORKFLOW_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold">Priority
          <select name="priority" className={field} defaultValue="NORMAL">
            {WORKFLOW_PRIORITIES.map((priority) => <option key={priority} value={priority}>{workflowLabel(priority)}</option>)}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold md:col-span-2">Title
          <Input name="title" required minLength={3} maxLength={180} placeholder="Agree a recovery plan for mathematics" />
        </label>
        <label className="grid gap-2 text-sm font-semibold md:col-span-2">Description
          <Textarea name="description" maxLength={5000} placeholder="Record the objective, context, expected result and next action." />
        </label>
        <label className="grid gap-2 text-sm font-semibold">Owner
          <select name="ownerUserId" className={field} defaultValue="">
            <option value="">Unassigned</option>
            {staff.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold">Student
          <select name="studentEnrollmentId" className={field} defaultValue="">
            <option value="">Not student-specific</option>
            {students.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold">Teacher
          <select name="teacherId" className={field} defaultValue="">
            <option value="">No teacher selected</option>
            {teachers.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold">Location
          <Input name="location" maxLength={180} placeholder="Room, route, office or online" />
        </label>
        <label className="grid gap-2 text-sm font-semibold">Starts
          <Input name="startsAt" type="datetime-local" />
        </label>
        <label className="grid gap-2 text-sm font-semibold">Due
          <Input name="dueAt" type="datetime-local" />
        </label>
        <label className="flex items-start gap-3 rounded-2xl border border-border/70 p-4 text-sm md:col-span-2">
          <input name="confidential" type="checkbox" className="mt-1 size-4 rounded border-input" />
          <span><strong className="block">Confidential record</strong><span className="text-muted-foreground">Restrict details to school administrators, the creator and the assigned owner.</span></span>
        </label>
      </div>
      {state.error && <p role="alert" className="text-sm font-medium text-destructive">{state.error}</p>}
      <Button disabled={pending}>{pending ? "Creating…" : "Create workflow"}</Button>
    </form>
  );
}
