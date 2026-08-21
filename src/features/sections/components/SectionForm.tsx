"use client";

import { useEffect, useState } from "react";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { sectionSchema, SectionFormInput } from "../schemas/section.schema";

import { Input } from "@/components/ui/input";

import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { ClassSelect } from "@/components/common/select/ClassSelect";
import { FormField, SubmitButton } from "@/components/common/forms";

type Props = {
  mode: "create" | "edit";
  sectionId?: string;
  onSuccess: () => void;
};

const defaultValues: SectionFormInput = {
  classId: "",
  name: "",
  displayOrder: 0,
};

export function SectionForm({ mode, sectionId, onSuccess }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<SectionFormInput>({
    resolver: zodResolver(sectionSchema),
    defaultValues,
  });

  const classId = useWatch({
    control: form.control,
    name: "classId",
  });

  useEffect(() => {
    if (mode !== "edit" || !sectionId) return;

    let cancelled = false;

    async function loadSection() {
      try {
        const res = await fetch(`/api/v1/sections/${sectionId}`, {
          cache: "no-store",
        });

        const result = await res.json();

        if (cancelled) return;

        if (!res.ok || !result.success) {
          toast.error(result.message || "Failed to load section.");
          return;
        }

        const section = result.data;

        form.reset({
          classId: section.classId ?? "",
          name: section.name ?? "",
          displayOrder: section.displayOrder ?? 0,
        });
      } catch {
        if (!cancelled) {
          toast.error("Failed to load section.");
        }
      }
    }

    void loadSection();

    return () => {
      cancelled = true;
    };
  }, [mode, sectionId, form]);

  async function onSubmit(values: SectionFormInput) {
    try {
      setLoading(true);

      const payload = sectionSchema.parse(values);
      const isCreate = mode === "create";

      const url = isCreate
        ? "/api/v1/sections"
        : `/api/v1/sections/${sectionId}`;

      const method = isCreate ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        toast.error(result.message || "Failed to save section.");
        return;
      }

      toast.success(
        result.message ||
          (isCreate
            ? "Section created successfully."
            : "Section updated successfully."),
      );

      if (isCreate) {
        form.reset(defaultValues);
      }

      onSuccess();
      router.refresh();
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Failed to save section.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      <section className="rounded-2xl border border-border/70 bg-muted/20 p-5 sm:p-6">
        <div className="mb-6">
          <p className="text-sm font-semibold text-foreground">
            Section information
          </p>

          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Assign this section to a class and configure its display order.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <FormField
            label="Class"
            required
            error={form.formState.errors.classId?.message}
          >
            <ClassSelect
              value={classId}
              onChange={(value) =>
                form.setValue("classId", value, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            />
          </FormField>

          <FormField
            label="Section Name"
            required
            error={form.formState.errors.name?.message}
          >
            <Input
              placeholder="e.g. Section A"
              className="h-11 bg-background"
              {...form.register("name")}
            />
          </FormField>

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
          createLabel="Create Section"
          updateLabel="Save Changes"
          className="h-11 w-full rounded-xl font-semibold shadow-lg shadow-primary/15"
        />
      </div>
    </form>
  );
}
