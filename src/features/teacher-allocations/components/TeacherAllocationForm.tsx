"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  GraduationCap,
  MessageSquare,
  UserRound,
  CalendarDays,
  ToggleRight,
} from "lucide-react";
import { toast } from "sonner";

import { FormField, SubmitButton } from "@/components/common/forms";
import { RemoteCombobox } from "@/components/common/combobox/RemoteCombobox";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { refreshTable } from "@/lib/table-event";

import {
  teacherAllocationSchema,
  TeacherAllocationFormInput,
} from "../schemas/teacher-allocation.schema";

type Props = {
  mode: "create" | "edit";
  allocationId?: string;
  onSuccess: () => void;
};

const defaultValues: TeacherAllocationFormInput = {
  academicYearId: "",
  teacherId: "",
  subjectId: "",
  classId: "",
  sectionId: "",
  remarks: "",
  active: true,
};

export function TeacherAllocationForm({
  mode,
  allocationId,
  onSuccess,
}: Props) {
  const [loading, setLoading] = useState(false);

  const form = useForm<TeacherAllocationFormInput>({
    resolver: zodResolver(teacherAllocationSchema),
    defaultValues,
  });

  const academicYearId = useWatch({
    control: form.control,
    name: "academicYearId",
  });
  const teacherId = useWatch({
    control: form.control,
    name: "teacherId",
  });
  const subjectId = useWatch({
    control: form.control,
    name: "subjectId",
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

  useEffect(() => {
    if (mode !== "edit" || !allocationId) return;

    let cancelled = false;

    async function loadAllocation() {
      try {
        const response = await fetch(
          `/api/v1/teacher-allocations/${allocationId}`,
        );
        const result = await response.json();

        if (cancelled) return;

        if (!response.ok || !result.success) {
          toast.error(result.message || "Failed to load teacher allocation.");
          return;
        }

        const allocation = result.data;

        form.reset({
          academicYearId: allocation.academicYearId,
          teacherId: allocation.teacherId,
          subjectId: allocation.subjectId,
          classId: allocation.classId,
          sectionId: allocation.sectionId,
          remarks: allocation.remarks ?? "",
          active: allocation.active,
        });
      } catch {
        if (!cancelled) {
          toast.error("Failed to load teacher allocation.");
        }
      }
    }

    void loadAllocation();

    return () => {
      cancelled = true;
    };
  }, [mode, allocationId, form]);

  function handleClassChange(value: string) {
    form.setValue("classId", value, {
      shouldDirty: true,
      shouldValidate: true,
    });

    form.setValue("sectionId", "", {
      shouldDirty: true,
      shouldValidate: false,
    });
  }

  async function onSubmit(values: TeacherAllocationFormInput) {
    try {
      setLoading(true);

      const payload = teacherAllocationSchema.parse(values);

      const url =
        mode === "create"
          ? "/api/v1/teacher-allocations"
          : `/api/v1/teacher-allocations/${allocationId}`;

      const response = await fetch(url, {
        method: mode === "create" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.message || "Failed to save teacher allocation.");
        return;
      }

      toast.success(
        result.message ||
          (mode === "create"
            ? "Teacher allocated successfully."
            : "Allocation updated successfully."),
      );

      if (mode === "create") {
        form.reset(defaultValues);
      }

      refreshTable("teacher-allocations");
      onSuccess();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to save teacher allocation.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="max-h-[75vh] space-y-5 overflow-y-auto pr-1"
    >
      <div className="rounded-xl border bg-muted/20 p-4">
        <div className="mb-4 flex items-center gap-3">
          <CalendarDays className="size-5 text-primary" />
          <div>
            <p className="text-sm font-semibold">Academic Year</p>
            <p className="text-xs text-muted-foreground">
              Select the academic year for this allocation.
            </p>
          </div>
        </div>

        <FormField label="Academic Year" required error={form.formState.errors.academicYearId?.message}>
          <RemoteCombobox
            url="/api/v1/academic-years/options"
            value={academicYearId}
            placeholder="Select academic year"
            onChange={(value) =>
              form.setValue("academicYearId", value, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
          />
        </FormField>
      </div>

      <div className="rounded-xl border bg-muted/20 p-4">
        <div className="mb-4 flex items-center gap-3">
          <UserRound className="size-5 text-primary" />
          <div>
            <p className="text-sm font-semibold">Teacher & Subject</p>
            <p className="text-xs text-muted-foreground">
              Define who teaches which subject.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Teacher" required error={form.formState.errors.teacherId?.message}>
            <RemoteCombobox
              url="/api/v1/teachers/options"
              value={teacherId}
              placeholder="Select teacher"
              onChange={(value) =>
                form.setValue("teacherId", value, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            />
          </FormField>

          <FormField label="Subject" required error={form.formState.errors.subjectId?.message}>
            <RemoteCombobox
              url="/api/v1/subjects/options"
              value={subjectId}
              placeholder="Select subject"
              onChange={(value) =>
                form.setValue("subjectId", value, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            />
          </FormField>
        </div>
      </div>

      <div className="rounded-xl border bg-muted/20 p-4">
        <div className="mb-4 flex items-center gap-3">
          <GraduationCap className="size-5 text-primary" />
          <div>
            <p className="text-sm font-semibold">Class Assignment</p>
            <p className="text-xs text-muted-foreground">
              Select the class and section where the teacher is assigned.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Class" required error={form.formState.errors.classId?.message}>
            <RemoteCombobox
              url="/api/v1/classes/options"
              value={classId}
              placeholder="Select class"
              onChange={handleClassChange}
            />
          </FormField>

          <FormField label="Section" required error={form.formState.errors.sectionId?.message}>
            {classId ? (
              <RemoteCombobox
                url={`/api/v1/sections/options?classId=${encodeURIComponent(classId)}`}
                value={sectionId}
                placeholder="Select section"
                onChange={(value) =>
                  form.setValue("sectionId", value, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
              />
            ) : (
              <div className="flex h-10 w-full items-center rounded-xl border border-border bg-muted/30 px-3 text-sm text-muted-foreground">
                Select a class first
              </div>
            )}
          </FormField>
        </div>
      </div>

      <div className="rounded-xl border bg-muted/20 p-4">
        <div className="mb-4 flex items-center gap-3">
          <MessageSquare className="size-5 text-primary" />
          <div>
            <p className="text-sm font-semibold">Additional Details</p>
            <p className="text-xs text-muted-foreground">
              Add optional notes and control the allocation status.
            </p>
          </div>
        </div>

        <FormField label="Remarks" error={form.formState.errors.remarks?.message}>
          <Textarea
            rows={3}
            placeholder="Add notes about this allocation..."
            {...form.register("remarks")}
          />
        </FormField>

        <div className="mt-4 flex items-center justify-between rounded-lg border bg-background p-4">
          <div className="flex items-start gap-3">
            <ToggleRight className="mt-0.5 size-4 text-primary" />
            <div>
              <p className="text-sm font-medium">Active Allocation</p>
              <p className="text-xs text-muted-foreground">
                {active
                  ? "Available for timetable, attendance and exams."
                  : "This allocation is currently inactive."}
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
      </div>

      <SubmitButton
        loading={loading}
        mode={mode}
        createLabel="Allocate Teacher"
        updateLabel="Update Allocation"
        className="w-full"
      />
    </form>
  );
}
