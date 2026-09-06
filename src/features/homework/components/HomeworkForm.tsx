"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarDays, GraduationCap, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { FormField } from "@/components/common/forms";
import { ClassSelect, SectionSelect } from "@/components/common/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { refreshTable } from "@/lib/table-event";

import { homeworkSchema, HomeworkFormInput } from "../schemas/homework.schema";

type Props = {
  mode: "create" | "edit";
  homeworkId?: string;
  onSuccess?: () => void;
};

const noop = () => {};

function inputDate(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().split("T")[0];
}

function createDefaults(): HomeworkFormInput {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return {
    classId: "",
    sectionId: "",
    title: "Today's Homework",
    description: "",
    assignedDate: inputDate(today),
    dueDate: inputDate(tomorrow),
    active: true,
  };
}

export function HomeworkForm({
  mode,
  homeworkId,
  onSuccess = noop,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [loadingHomework, setLoadingHomework] = useState(
    mode === "edit" && Boolean(homeworkId),
  );
  const [confirmationOpen, setConfirmationOpen] = useState(false);

  const form = useForm<HomeworkFormInput>({
    resolver: zodResolver(homeworkSchema),
    defaultValues: createDefaults(),
  });

  const classId = useWatch({ control: form.control, name: "classId" });
  const sectionId = useWatch({ control: form.control, name: "sectionId" });
  const active = useWatch({ control: form.control, name: "active" });
  const title = useWatch({ control: form.control, name: "title" });

  useEffect(() => {
    if (mode !== "edit" || !homeworkId) return;

    let cancelled = false;

    async function loadHomework() {
      try {
        setLoadingHomework(true);
        const response = await fetch(`/api/v1/homework/${homeworkId}`, {
          cache: "no-store",
        });
        const result = await response.json();

        if (cancelled) return;
        if (!response.ok || !result.success) {
          toast.error(result.message || "Failed to load homework.");
          return;
        }

        const item = result.data;
        form.reset({
          classId: item.classId,
          sectionId: item.sectionId ?? "",
          title: item.title,
          description: item.description ?? "",
          assignedDate: item.assignedDate.substring(0, 10),
          dueDate: item.dueDate ? item.dueDate.substring(0, 10) : "",
          active: item.active,
        });
      } catch {
        if (!cancelled) toast.error("Failed to load homework.");
      } finally {
        if (!cancelled) setLoadingHomework(false);
      }
    }

    void loadHomework();
    return () => {
      cancelled = true;
    };
  }, [form, homeworkId, mode]);

  async function save(values: HomeworkFormInput) {
    try {
      setSaving(true);
      const payload = homeworkSchema.parse(values);
      const url =
        mode === "create"
          ? "/api/v1/homework"
          : `/api/v1/homework/${homeworkId}`;
      const response = await fetch(url, {
        method: mode === "create" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.message || "Failed to save homework.");
        return;
      }

      toast.success(
        result.message ||
          (mode === "create"
            ? "Homework published successfully."
            : "Homework updated successfully."),
      );

      if (mode === "create") form.reset(createDefaults());
      refreshTable("homework");
      onSuccess();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save homework.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function requestConfirmation() {
    if (await form.trigger()) setConfirmationOpen(true);
  }

  if (loadingHomework) {
    return (
      <div className="flex min-h-72 items-center justify-center rounded-2xl border bg-card">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void requestConfirmation();
      }}
      className="space-y-5 rounded-2xl border bg-card p-5 shadow-sm sm:p-6"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Send className="size-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold">
            {mode === "create" ? "Create homework" : "Edit homework"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Share clear instructions with a class or a specific section.
          </p>
        </div>
      </div>

      <FormField
        label="Title"
        required
        error={form.formState.errors.title?.message}
      >
        <Input
          placeholder="What should students complete?"
          maxLength={200}
          {...form.register("title")}
        />
        <p className="mt-1 text-right text-xs text-muted-foreground">
          {title?.length ?? 0}/200
        </p>
      </FormField>

      <FormField
        label="Instructions"
        error={form.formState.errors.description?.message}
      >
        <Textarea
          rows={5}
          maxLength={2000}
          className="resize-y"
          placeholder="Write the homework instructions…"
          {...form.register("description")}
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Class"
          required
          error={form.formState.errors.classId?.message}
        >
          <ClassSelect
            value={classId}
            onChange={(value) => {
              form.setValue("classId", value, {
                shouldDirty: true,
                shouldValidate: true,
              });
              form.setValue("sectionId", "", {
                shouldDirty: true,
                shouldValidate: false,
              });
            }}
          />
        </FormField>

        <FormField
          label="Section (optional)"
          error={form.formState.errors.sectionId?.message}
        >
          {classId ? (
            <SectionSelect
              classId={classId}
              value={sectionId}
              onChange={(value) =>
                form.setValue("sectionId", value, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            />
          ) : (
            <div className="flex h-10 items-center rounded-xl border bg-muted/30 px-3 text-sm text-muted-foreground">
              Select a class first
            </div>
          )}
        </FormField>

        <FormField
          label="Assigned date"
          required
          error={form.formState.errors.assignedDate?.message}
        >
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="date"
              className="pl-9"
              {...form.register("assignedDate")}
            />
          </div>
        </FormField>

        <FormField
          label="Due date (optional)"
          error={form.formState.errors.dueDate?.message}
        >
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input type="date" className="pl-9" {...form.register("dueDate")} />
          </div>
        </FormField>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-xl border bg-muted/25 px-4 py-3">
        <div className="flex items-center gap-3">
          <GraduationCap className="size-4 text-primary" />
          <div>
            <p className="text-sm font-semibold">
              {active ? "Publish to students" : "Keep as draft"}
            </p>
            <p className="text-xs text-muted-foreground">
              {active
                ? "Students can see this homework immediately."
                : "This homework stays hidden until published."}
            </p>
          </div>
        </div>
        <Switch
          checked={active}
          aria-label="Publish homework to students"
          onCheckedChange={(checked) =>
            form.setValue("active", checked, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        />
      </div>

      <Button type="submit" disabled={saving || !classId}>
        {saving
          ? "Saving…"
          : mode === "edit"
            ? "Update homework"
            : active
              ? "Publish homework"
              : "Save draft"}
      </Button>

      <AlertDialog open={confirmationOpen} onOpenChange={setConfirmationOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {mode === "edit" ? "Update this homework?" : "Publish homework?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {active
                ? `“${title || "This homework"}” will be visible to the selected class${sectionId ? " and section" : ""}.`
                : `“${title || "This homework"}” will be saved as a draft and remain hidden from students.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={saving}
              onClick={(event) => {
                event.preventDefault();
                setConfirmationOpen(false);
                void form.handleSubmit(save)();
              }}
            >
              {active ? "Publish" : "Save draft"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
