"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { classSchema, ClassFormInput } from "../schemas/class.schema";

import { Input } from "@/components/ui/input";
import { FormField, SubmitButton } from "@/components/common/forms";
import { refreshTable } from "@/lib/table-event";

type Props = {
  mode: "create" | "edit";
  classId?: string;
  onSuccess: () => void;
};

const defaultValues: ClassFormInput = {
  name: "",
  code: "",
  description: "",
  displayOrder: 0,
};

export function ClassForm({ mode, classId, onSuccess }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<ClassFormInput>({
    resolver: zodResolver(classSchema),
    defaultValues,
  });

  useEffect(() => {
    if (mode !== "edit" || !classId) return;

    let cancelled = false;

    async function loadClass() {
      try {
        const res = await fetch(`/api/v1/classes/${classId}`, {
          cache: "no-store",
        });

        const result = await res.json();

        if (cancelled) return;

        if (!result.success) {
          toast.error(result.message || "Failed to load class.");
          return;
        }

        const item = result.data;

        form.reset({
          name: item.name ?? "",
          code: item.code ?? "",
          description: item.description ?? "",
          displayOrder: item.displayOrder ?? 0,
        });
      } catch {
        if (!cancelled) {
          toast.error("Failed to load class.");
        }
      }
    }

    void loadClass();

    return () => {
      cancelled = true;
    };
  }, [mode, classId, form]);

  async function onSubmit(values: ClassFormInput) {
    try {
      setLoading(true);

      const payload = classSchema.parse(values);

      const isCreate = mode === "create";

      const url = isCreate ? "/api/v1/classes" : `/api/v1/classes/${classId}`;

      const method = isCreate ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!result.success) {
        toast.error(result.message || "Failed to save class.");
        return;
      }

      toast.success(
        result.message ||
          (isCreate
            ? "Class created successfully."
            : "Class updated successfully."),
      );

      if (isCreate) {
        form.reset(defaultValues);
      }

      refreshTable("classes");

      onSuccess();
      router.refresh();
    } catch {
      toast.error("Something went wrong while saving the class.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      <section className="rounded-2xl border border-border/70 bg-muted/20 p-5 sm:p-6">
        <div className="mb-6">
          <p className="text-sm font-semibold text-foreground">
            Class information
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Configure the basic details used to identify and organize this
            class.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <FormField
            label="Class Name"
            required
            error={form.formState.errors.name?.message}
          >
            <Input
              placeholder="e.g. Class 10"
              className="h-11 bg-background"
              {...form.register("name")}
            />
          </FormField>

          <FormField
            label="Class Code"
            error={form.formState.errors.code?.message}
          >
            <Input
              placeholder="e.g. X"
              className="h-11 bg-background"
              {...form.register("code")}
            />
          </FormField>

          <div className="md:col-span-2">
            <FormField
              label="Description"
              error={form.formState.errors.description?.message}
            >
              <Input
                placeholder="Optional description for this class"
                className="h-11 bg-background"
                {...form.register("description")}
              />
            </FormField>
          </div>

          <FormField
            label="Display Order"
            error={form.formState.errors.displayOrder?.message}
          >
            <Input
              type="number"
              min="0"
              className="h-11 bg-background"
              {...form.register("displayOrder", {
                valueAsNumber: true,
              })}
            />
          </FormField>
        </div>
      </section>

      <div className="sticky bottom-0 -mx-6 -mb-6 border-t border-border/60 bg-card/95 px-6 py-4 backdrop-blur-xl sm:-mx-8 sm:-mb-8 sm:px-8">
        <SubmitButton
          loading={loading}
          mode={mode}
          createLabel="Create Class"
          updateLabel="Save Changes"
          className="h-11 w-full rounded-xl font-semibold shadow-lg shadow-primary/15"
        />
      </div>
    </form>
  );
}
