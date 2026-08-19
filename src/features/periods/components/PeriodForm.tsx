"use client";

import { useEffect, useState } from "react";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { periodSchema, PeriodFormInput } from "../schemas/period.schema";

import { toast } from "sonner";

import {
  FormField,
  NumberInput,
  SubmitButton,
  TimeInput,
} from "@/components/common/forms";

import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

type Props = {
  mode: "create" | "edit";
  periodId?: string;
  onSuccess: () => void;
};

const defaultValues: PeriodFormInput = {
  name: "",
  startTime: "",
  endTime: "",
  displayOrder: 0,
  active: true,
};

export function PeriodForm({ mode, periodId, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);

  const form = useForm<PeriodFormInput>({
    resolver: zodResolver(periodSchema),
    defaultValues,
  });

  const active = useWatch({
    control: form.control,
    name: "active",
  });

  useEffect(() => {
    if (mode !== "edit" || !periodId) return;

    async function load() {
      try {
        const res = await fetch(`/api/v1/periods/${periodId}`);

        const result = await res.json();

        if (!res.ok || !result.success) {
          toast.error(result.message || "Failed to load period.");
          return;
        }

        form.reset({
          name: result.data.name,
          startTime: result.data.startTime,
          endTime: result.data.endTime,
          displayOrder: result.data.displayOrder,
          active: result.data.active,
        });
      } catch {
        toast.error("Failed to load period.");
      }
    }

    void load();
  }, [mode, periodId, form]);

  async function onSubmit(values: PeriodFormInput) {
    try {
      setLoading(true);

      const payload = periodSchema.parse(values);

      const url =
        mode === "create" ? "/api/v1/periods" : `/api/v1/periods/${periodId}`;

      const method = mode === "create" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        toast.error(result.message || "Failed to save period.");
        return;
      }

      toast.success(
        result.message ||
          (mode === "create"
            ? "Period created successfully."
            : "Period updated successfully."),
      );

      form.reset(defaultValues);

      onSuccess();
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Failed to save period.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
      <FormField
        label="Period Name"
        required
        error={form.formState.errors.name?.message}
      >
        <Input {...form.register("name")} />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="Start Time"
          required
          error={form.formState.errors.startTime?.message}
        >
          <TimeInput {...form.register("startTime")} />
        </FormField>

        <FormField
          label="End Time"
          required
          error={form.formState.errors.endTime?.message}
        >
          <TimeInput {...form.register("endTime")} />
        </FormField>
      </div>

      <FormField
        label="Display Order"
        error={form.formState.errors.displayOrder?.message}
      >
        <NumberInput
          {...form.register("displayOrder", {
            valueAsNumber: true,
          })}
        />
      </FormField>

      <div className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <h4 className="font-medium">Active</h4>

          <p className="text-sm text-muted-foreground">
            Period is available for timetable.
          </p>
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

      <SubmitButton
        loading={loading}
        mode={mode}
        createLabel="Create Period"
        updateLabel="Update Period"
        className="w-full"
      />
    </form>
  );
}
