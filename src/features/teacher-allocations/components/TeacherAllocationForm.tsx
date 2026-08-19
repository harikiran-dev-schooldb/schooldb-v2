"use client";

import { useEffect, useState } from "react";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  teacherAllocationSchema,
  TeacherAllocationFormInput,
} from "../schemas/teacher-allocation.schema";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

import { FormField } from "@/components/common/forms";
import { RemoteCombobox } from "@/components/common/combobox/RemoteCombobox";

type Props = {
  mode: "create" | "edit";
  allocationId?: string;
  onSuccess: () => void;
};

export function TeacherAllocationForm({
  mode,
  allocationId,
  onSuccess,
}: Props) {
  const [loading, setLoading] = useState(false);

  const form = useForm<TeacherAllocationFormInput>({
    resolver: zodResolver(teacherAllocationSchema),

    defaultValues: {
      academicYearId: "",
      teacherId: "",
      subjectId: "",
      classId: "",
      sectionId: "",
      remarks: "",
      active: true,
    },
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
    form.setValue("sectionId", "");
  }, [classId, form]);

  useEffect(() => {
    if (mode !== "edit" || !allocationId) {
      return;
    }

    let cancelled = false;

    async function loadAllocation() {
      try {
        const res = await fetch(`/api/v1/teacher-allocations/${allocationId}`);

        const result = await res.json();

        if (cancelled) {
          return;
        }

        if (!result.success) {
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

  async function onSubmit(values: TeacherAllocationFormInput) {
    try {
      setLoading(true);

      const payload = teacherAllocationSchema.parse(values);

      const url =
        mode === "create"
          ? "/api/v1/teacher-allocations"
          : `/api/v1/teacher-allocations/${allocationId}`;

      const method = mode === "create" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!result.success) {
        toast.error(result.message || "Failed to save teacher allocation.");
        return;
      }

      toast.success(
        mode === "create"
          ? "Teacher allocated successfully."
          : "Allocation updated successfully.",
      );

      form.reset();

      onSuccess();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Something went wrong.";

      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
      <FormField label="Academic Year" required>
        <RemoteCombobox
          url="/api/v1/academic-years/options"
          value={academicYearId}
          placeholder="Select Academic Year"
          onChange={(value) =>
            form.setValue("academicYearId", value, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        />
      </FormField>

      <FormField label="Teacher" required>
        <RemoteCombobox
          url="/api/v1/teachers/options"
          value={teacherId}
          placeholder="Select Teacher"
          onChange={(value) =>
            form.setValue("teacherId", value, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        />
      </FormField>

      <FormField label="Subject" required>
        <RemoteCombobox
          url="/api/v1/subjects/options"
          value={subjectId}
          placeholder="Select Subject"
          onChange={(value) =>
            form.setValue("subjectId", value, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        />
      </FormField>

      <FormField label="Class" required>
        <RemoteCombobox
          url="/api/v1/classes/options"
          value={classId}
          placeholder="Select Class"
          onChange={(value) =>
            form.setValue("classId", value, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        />
      </FormField>

      <FormField label="Section" required>
        <RemoteCombobox
          url={
            classId
              ? `/api/v1/sections/options?classId=${encodeURIComponent(
                  classId,
                )}`
              : "/api/v1/sections/options"
          }
          value={sectionId}
          disabled={!classId}
          placeholder="Select Section"
          onChange={(value) =>
            form.setValue("sectionId", value, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        />
      </FormField>

      <FormField label="Remarks">
        <Textarea rows={3} {...form.register("remarks")} />
      </FormField>

      <div className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <h4 className="font-medium">Active Allocation</h4>

          <p className="text-sm text-muted-foreground">
            Teacher can be used in Timetable, Attendance and Exams.
          </p>
        </div>

        <Switch
          checked={active}
          onCheckedChange={(checked) =>
            form.setValue("active", checked, {
              shouldDirty: true,
            })
          }
        />
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading
          ? "Saving..."
          : mode === "create"
            ? "Allocate Teacher"
            : "Update Allocation"}
      </Button>
    </form>
  );
}
