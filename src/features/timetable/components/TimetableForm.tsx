"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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
  const [initialLoading, setInitialLoading] = useState(mode === "edit");

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
        setInitialLoading(true);

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
      } finally {
        if (!cancelled) {
          setInitialLoading(false);
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

  if (initialLoading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Loader2 className="size-5 animate-spin" />
          </div>

          <div>
            <p className="text-sm font-semibold">Loading timetable</p>

            <p className="mt-1 text-xs text-muted-foreground">
              Preparing the timetable details...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Academic Configuration */}
      <div className="space-y-5">
        <div>
          <h3 className="text-sm font-semibold">Academic Configuration</h3>

          <p className="mt-1 text-xs text-muted-foreground">
            Choose where this timetable entry belongs.
          </p>
        </div>

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
      </div>

      {/* Schedule */}
      <div className="space-y-5 border-t pt-5">
        <div>
          <h3 className="text-sm font-semibold">Schedule</h3>

          <p className="mt-1 text-xs text-muted-foreground">
            Assign the period and weekday.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
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

          <FormField label="Weekday" required>
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
                <SelectValue placeholder="Select weekday" />
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
        </div>
      </div>

      {/* Status */}
      <div className="space-y-5 border-t pt-5">
        <div>
          <h3 className="text-sm font-semibold">Status</h3>

          <p className="mt-1 text-xs text-muted-foreground">
            Control whether this timetable entry is active.
          </p>
        </div>

        <div className="flex items-center justify-between rounded-xl border bg-muted/20 p-4">
          <div>
            <h4 className="text-sm font-medium">Timetable entry active</h4>

            <p className="mt-1 text-xs text-muted-foreground">
              This entry will appear in timetable views.
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
      </div>

      {/* Submit */}
      <div className="border-t pt-5">
        <SubmitButton
          loading={loading}
          mode={mode}
          createLabel="Create Timetable"
          updateLabel="Update Timetable"
          className="h-11 w-full"
        />
      </div>
    </form>
  );
}
