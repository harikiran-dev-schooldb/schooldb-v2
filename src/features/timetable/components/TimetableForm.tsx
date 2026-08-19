"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import {
  timetableSchema,
  TimetableFormInput,
} from "../schemas/timetable.schema";

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

  const academicYearId = useWatch({
    control: form.control,
    name: "academicYearId",
  });

  const teacherAllocationId = useWatch({
    control: form.control,
    name: "teacherAllocationId",
  });

  const periodId = useWatch({
    control: form.control,
    name: "periodId",
  });

  const selectedDay = useWatch({
    control: form.control,
    name: "day",
  });

  const active = useWatch({
    control: form.control,
    name: "active",
  });

  useEffect(() => {
    if (mode !== "edit" || !timetableId) {
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/v1/timetables/${timetableId}`);

        const result = await res.json();

        if (cancelled) {
          return;
        }

        if (!result.success) {
          toast.error(result.message || "Failed to load timetable.");
          return;
        }

        form.reset({
          academicYearId: result.data.academicYearId,

          teacherAllocationId: result.data.teacherAllocationId,

          periodId: result.data.periodId,

          day: result.data.day,

          active: result.data.active,
        });
      } catch {
        if (!cancelled) {
          toast.error("Failed to load timetable.");
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [mode, timetableId, form]);

  async function onSubmit(values: TimetableFormInput) {
    try {
      setLoading(true);

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
        toast.error(result.message || "Failed to save timetable.");
        return;
      }

      toast.success(result.message || "Timetable saved successfully.");

      onSuccess();
    } catch {
      toast.error("Something went wrong while saving the timetable.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
      <FormField label="Academic Year" required>
        <AcademicYearSelect
          value={academicYearId}
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
          value={teacherAllocationId}
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
          value={periodId}
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
          value={selectedDay}
          onValueChange={(value) => {
            const day = WEEKDAY_OPTIONS.find(
              (option) => option.value === value,
            );

            if (!day) {
              return;
            }

            form.setValue("day", day.value, {
              shouldDirty: true,
              shouldValidate: true,
            });
          }}
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
          checked={active}
          onCheckedChange={(checked) =>
            form.setValue("active", checked, {
              shouldDirty: true,
            })
          }
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
