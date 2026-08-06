"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  timetableSchema,
  TimetableFormInput,
} from "../schemas/timetable.schema";

import { toast } from "sonner";

import {
  AcademicYearSelect,
  PeriodSelect,
  TeacherAllocationSelect,
} from "@/components/common/select";

import { FormField, SubmitButton } from "@/components/common/forms";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Switch } from "@/components/ui/switch";

import { WEEKDAY_OPTIONS } from "../constants/weekdays";

type Props = {
  mode: "create" | "edit";

  timetableId?: string;

  onSuccess: () => void;
};

export function TimetableForm({ mode, timetableId, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);

  const form = useForm<TimetableFormInput>({
    resolver: zodResolver(timetableSchema),

    defaultValues: {
      academicYearId: "",
      teacherAllocationId: "",
      periodId: "",
      day: undefined,
      active: true,
    },
  });

  useEffect(() => {
    if (mode !== "edit" || !timetableId) return;

    async function load() {
      const res = await fetch(`/api/v1/timetables/${timetableId}`);

      const result = await res.json();

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      form.reset({
        academicYearId: result.data.academicYearId,

        teacherAllocationId: result.data.teacherAllocationId,

        periodId: result.data.periodId,

        day: result.data.day,

        active: result.data.active,
      });
    }

    load();
  }, [mode, timetableId, form]);

  async function onSubmit(values: TimetableFormInput) {
    setLoading(true);

    try {
      const url =
        mode === "create"
          ? "/api/v1/timetables"
          : `/api/v1/timetables/${timetableId}`;

      const method = mode === "create" ? "POST" : "PUT";

      const response = await fetch(url, {
        method,

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(values),
      });

      const result = await response.json();

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);

      onSuccess();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
      <FormField label="Academic Year" required>
        <AcademicYearSelect
          value={form.watch("academicYearId")}
          onChange={(value) =>
            form.setValue("academicYearId", value, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        />
      </FormField>

      <FormField label="Teacher Allocation" required>
        <TeacherAllocationSelect
          value={form.watch("teacherAllocationId")}
          onChange={(value) =>
            form.setValue("teacherAllocationId", value, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        />
      </FormField>

      <FormField label="Period" required>
        <PeriodSelect
          value={form.watch("periodId")}
          onChange={(value) =>
            form.setValue("periodId", value, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        />
      </FormField>

      <FormField label="Week Day" required>
        <Select
          value={form.watch("day")}
          onValueChange={(value) => form.setValue("day", value as any)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select Day" />
          </SelectTrigger>

          <SelectContent>
            {WEEKDAY_OPTIONS.map((day) => (
              <SelectItem key={day.value} value={day.value}>
                {day.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <div className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <h4 className="font-medium">Active</h4>

          <p className="text-sm text-muted-foreground">
            Enable this timetable entry.
          </p>
        </div>

        <Switch
          checked={form.watch("active")}
          onCheckedChange={(checked) => form.setValue("active", checked)}
        />
      </div>

      <SubmitButton
        loading={loading}
        mode={mode}
        createLabel="Create Timetable"
        updateLabel="Update Timetable"
        className="w-full"
      />
    </form>
  );
}
