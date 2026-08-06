"use client";

import { useEffect, useState } from "react";

import { useForm } from "react-hook-form";
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

export function PeriodForm({ mode, periodId, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);

  const form = useForm<PeriodFormInput>({
    resolver: zodResolver(periodSchema),

    defaultValues: {
      name: "",
      startTime: "",
      endTime: "",
      displayOrder: 0,
      active: true,
    },
  });

  useEffect(() => {
    if (mode !== "edit" || !periodId) return;

    async function load() {
      const res = await fetch(`/api/v1/periods/${periodId}`);

      const result = await res.json();

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      form.reset(result.data);
    }

    load();
  }, [mode, periodId, form]);

  async function onSubmit(values: PeriodFormInput) {
    try {
      setLoading(true);

      const url =
        mode === "create" ? "/api/v1/periods" : `/api/v1/periods/${periodId}`;

      const method = mode === "create" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(values),
      });

      const result = await res.json();

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);

      form.reset();

      onSuccess();
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
          checked={form.watch("active")}
          onCheckedChange={(checked) => form.setValue("active", checked)}
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
