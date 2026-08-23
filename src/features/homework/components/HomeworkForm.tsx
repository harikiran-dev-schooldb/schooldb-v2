"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CalendarDays,
  FileText,
  GraduationCap,
  ToggleRight,
} from "lucide-react";
import { toast } from "sonner";

import { ClassSelect, SectionSelect } from "@/components/common/select";
import { FormField, SubmitButton } from "@/components/common/forms";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

import { homeworkSchema, HomeworkFormInput } from "../schemas/homework.schema";

type Props = {
  mode: "create" | "edit";
  homeworkId?: string;
  onSuccess: () => void;
};

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function getTomorrow() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split("T")[0];
}

const defaultValues: HomeworkFormInput = {
  classId: "",
  sectionId: "",
  title: "Today's Homework",
  description: "",
  assignedDate: "",
  dueDate: "",
  active: true,
};

export function HomeworkForm({ mode, homeworkId, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [loadingHomework, setLoadingHomework] = useState(mode === "edit");

  const form = useForm<HomeworkFormInput>({
    resolver: zodResolver(homeworkSchema),
    defaultValues: {
      ...defaultValues,
      assignedDate: getToday(),
      dueDate: getTomorrow(),
    },
  });

  const classId = useWatch({
    control: form.control,
    name: "classId",
  });

  const sectionId = useWatch({
    control: form.control,
    name: "sectionId",
  });

  const active = useWatch({
    control: form.control,
    name: "active",
  });

  const title = useWatch({
    control: form.control,
    name: "title",
  });

  useEffect(() => {
    if (mode !== "edit" || !homeworkId) {
      setLoadingHomework(false);
      return;
    }

    async function loadHomework() {
      try {
        setLoadingHomework(true);

        const response = await fetch(`/api/v1/homework/${homeworkId}`, {
          cache: "no-store",
        });

        const result = await response.json();

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
          assignedDate: new Date(item.assignedDate).toISOString().split("T")[0],
          dueDate: item.dueDate
            ? new Date(item.dueDate).toISOString().split("T")[0]
            : "",
          active: item.active,
        });
      } catch {
        toast.error("Failed to load homework.");
      } finally {
        setLoadingHomework(false);
      }
    }

    void loadHomework();
  }, [mode, homeworkId, form]);

  async function onSubmit(values: HomeworkFormInput) {
    try {
      setLoading(true);

      const payload = homeworkSchema.parse(values);

      const url =
        mode === "create"
          ? "/api/v1/homework"
          : `/api/v1/homework/${homeworkId}`;

      const response = await fetch(url, {
        method: mode === "create" ? "POST" : "PUT",
        headers: {
          "Content-Type": "application/json",
        },
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
            ? "Homework created successfully."
            : "Homework updated successfully."),
      );

      if (mode === "create") {
        form.reset({
          ...defaultValues,
          assignedDate: getToday(),
          dueDate: getTomorrow(),
        });
      }

      onSuccess();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save homework.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (loadingHomework) {
    return (
      <div className="space-y-5">
        <div className="h-24 animate-pulse rounded-xl bg-muted" />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="h-20 animate-pulse rounded-xl bg-muted" />
          <div className="h-20 animate-pulse rounded-xl bg-muted" />
        </div>

        <div className="h-32 animate-pulse rounded-xl bg-muted" />

        <div className="h-24 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
      {/* ============================================================ */}
      {/* ASSIGNMENT SCOPE                                             */}
      {/* ============================================================ */}

      <div className="rounded-xl border bg-card">
        <div className="border-b px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <GraduationCap className="size-4" />
            </div>

            <div>
              <p className="text-sm font-semibold">Assignment Scope</p>

              <p className="text-xs text-muted-foreground">
                Select the class and section receiving this homework.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <FormField label="Class" required>
            <ClassSelect
              value={classId}
              onChange={(value) => {
                form.setValue("classId", value, {
                  shouldDirty: true,
                  shouldValidate: true,
                });

                form.setValue("sectionId", "", {
                  shouldDirty: true,
                  shouldValidate: true,
                });
              }}
            />
          </FormField>

          <FormField label="Section">
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
          </FormField>
        </div>

        {!classId && (
          <div className="border-t bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
            Select a class first to load its sections.
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* HOMEWORK DETAILS                                             */}
      {/* ============================================================ */}

      <div className="rounded-xl border bg-card">
        <div className="border-b px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="size-4" />
            </div>

            <div>
              <p className="text-sm font-semibold">Homework Details</p>

              <p className="text-xs text-muted-foreground">
                Give the assignment a clear title and instructions.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-4">
          <FormField label="Title" required>
            <Input
              placeholder="e.g. Complete Chapter 4 exercises"
              {...form.register("title")}
            />

            <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
              <span>Use a short, descriptive assignment title.</span>

              <span>{title?.length ?? 0}/100</span>
            </div>
          </FormField>

          <FormField label="Instructions">
            <Textarea
              placeholder="Write the homework instructions for students..."
              rows={5}
              className="resize-y"
              {...form.register("description")}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.stopPropagation();
                }
              }}
            />
          </FormField>
        </div>
      </div>

      {/* ============================================================ */}
      {/* SCHEDULE                                                      */}
      {/* ============================================================ */}

      <div className="rounded-xl border bg-card">
        <div className="border-b px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <CalendarDays className="size-4" />
            </div>

            <div>
              <p className="text-sm font-semibold">Schedule</p>

              <p className="text-xs text-muted-foreground">
                Set when the homework starts and when it is due.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <FormField label="Assigned Date" required>
            <Input type="date" {...form.register("assignedDate")} />
          </FormField>

          <FormField label="Due Date">
            <Input type="date" {...form.register("dueDate")} />
          </FormField>
        </div>
      </div>

      {/* ============================================================ */}
      {/* STATUS                                                        */}
      {/* ============================================================ */}

      <div className="flex items-center justify-between gap-4 rounded-xl border bg-card p-4">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ToggleRight className="size-4" />
          </div>

          <div>
            <p className="text-sm font-semibold">Homework Status</p>

            <p className="mt-0.5 text-xs text-muted-foreground">
              {active
                ? "Active — students can see this homework."
                : "Inactive — this homework is hidden."}
            </p>
          </div>
        </div>

        <Switch
          checked={active}
          onCheckedChange={(checked) =>
            form.setValue("active", checked, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        />
      </div>

      {/* ============================================================ */}
      {/* SUBMIT                                                        */}
      {/* ============================================================ */}

      <SubmitButton
        loading={loading}
        mode={mode}
        createLabel="Create Homework"
        updateLabel="Update Homework"
        className="w-full"
      />
    </form>
  );
}
