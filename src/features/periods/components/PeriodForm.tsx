"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Clock3, ListOrdered, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  FormField,
  NumberInput,
  SubmitButton,
  TimeInput,
} from "@/components/common/forms";

import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

import { periodSchema, PeriodFormInput } from "../schemas/period.schema";

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
  const [initialLoading, setInitialLoading] = useState(mode === "edit");

  const form = useForm<PeriodFormInput>({
    resolver: zodResolver(periodSchema),
    defaultValues,
  });

  const active = useWatch({
    control: form.control,
    name: "active",
  });

  useEffect(() => {
    if (mode !== "edit" || !periodId) {
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/v1/periods/${periodId}`);

        const result = await res.json();

        if (cancelled) {
          return;
        }

        if (!res.ok || !result.success) {
          toast.error(result.message || "Failed to load period.");
          setInitialLoading(false);
          return;
        }

        form.reset({
          name: result.data.name,
          startTime: result.data.startTime,
          endTime: result.data.endTime,
          displayOrder: result.data.displayOrder,
          active: result.data.active,
        });

        setInitialLoading(false);
      } catch {
        if (!cancelled) {
          toast.error("Failed to load period.");
          setInitialLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
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

  if (initialLoading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center">
        <div className="flex flex-col items-center text-center">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Loader2 className="size-5 animate-spin" />
          </div>

          <p className="mt-4 text-sm font-semibold">Loading period</p>

          <p className="mt-1 text-xs text-muted-foreground">
            Preparing period details...
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Period details */}
      <section className="space-y-5">
        <SectionHeading
          icon={<Clock3 className="size-4" />}
          title="Period Details"
          description="Define the name and timing of this period."
        />

        <FormField
          label="Period Name"
          required
          error={form.formState.errors.name?.message}
        >
          <Input
            {...form.register("name")}
            placeholder="e.g. 1st Period"
            className="h-11"
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
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
      </section>

      {/* Ordering */}
      <section className="space-y-5 border-t pt-6">
        <SectionHeading
          icon={<ListOrdered className="size-4" />}
          title="Display Order"
          description="Control where this period appears in the timetable."
        />

        <FormField
          label="Display Order"
          error={form.formState.errors.displayOrder?.message}
        >
          <NumberInput
            {...form.register("displayOrder", {
              valueAsNumber: true,
            })}
            min={1}
            placeholder="1"
          />
        </FormField>
      </section>

      {/* Status */}
      <section className="space-y-5 border-t pt-6">
        <SectionHeading
          icon={<CheckCircle2 className="size-4" />}
          title="Availability"
          description="Control whether this period can be used in timetables."
        />

        <div className="flex items-center justify-between rounded-2xl border bg-muted/20 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="size-4" />
            </div>

            <div>
              <p className="text-sm font-semibold">Active period</p>

              <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                Available for timetable scheduling.
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
      </section>

      {/* Submit */}
      <div className="border-t pt-5">
        <SubmitButton
          loading={loading}
          mode={mode}
          createLabel="Create Period"
          updateLabel="Update Period"
          className="h-11 w-full"
        />
      </div>
    </form>
  );
}

function SectionHeading({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        {icon}
      </div>

      <div>
        <h3 className="text-sm font-semibold">{title}</h3>

        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}
