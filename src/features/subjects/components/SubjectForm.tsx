"use client";

import { useEffect, useState } from "react";

import { useForm, useWatch } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";

import { subjectSchema, SubjectFormInput } from "../schemas/subject.schema";

import { FormField, SubmitButton } from "@/components/common/forms";

import { Input } from "@/components/ui/input";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Switch } from "@/components/ui/switch";

import { toast } from "sonner";

type Props = {
  mode: "create" | "edit";
  subjectId?: string;
  onSuccess: () => void;
};

const defaultValues: SubjectFormInput = {
  name: "",
  code: "",
  type: "SCHOLASTIC",
  displayOrder: 0,
  active: true,
};

export function SubjectForm({ mode, subjectId, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);

  const form = useForm<SubjectFormInput>({
    resolver: zodResolver(subjectSchema),
    defaultValues,
  });

  // Replace form.watch() with useWatch()
  const subjectType = useWatch({
    control: form.control,
    name: "type",
  });

  const active = useWatch({
    control: form.control,
    name: "active",
  });

  useEffect(() => {
    if (mode !== "edit" || !subjectId) return;

    let cancelled = false;

    async function loadSubject() {
      try {
        const res = await fetch(`/api/v1/subjects/${subjectId}`);

        const result = await res.json();

        if (cancelled) return;

        if (!result.success) {
          toast.error(result.message ?? "Failed to load subject.");
          return;
        }

        form.reset({
          name: result.data.name ?? "",
          code: result.data.code ?? "",
          type: result.data.type ?? "SCHOLASTIC",
          displayOrder: result.data.displayOrder ?? 0,
          active: result.data.active ?? true,
        });
      } catch {
        if (!cancelled) {
          toast.error("Failed to load subject.");
        }
      }
    }

    void loadSubject();

    return () => {
      cancelled = true;
    };
  }, [mode, subjectId, form]);

  async function onSubmit(values: SubjectFormInput) {
    try {
      setLoading(true);

      const payload = subjectSchema.parse(values);

      const url =
        mode === "create"
          ? "/api/v1/subjects"
          : `/api/v1/subjects/${subjectId}`;

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
        toast.error(result.message ?? "Failed to save subject.");
        return;
      }

      toast.success(
        result.message ??
          (mode === "create"
            ? "Subject created successfully."
            : "Subject updated successfully."),
      );

      form.reset(defaultValues);

      onSuccess();
    } catch {
      toast.error("Failed to save subject.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
      <FormField
        label="Subject Name"
        required
        error={form.formState.errors.name?.message}
      >
        <Input {...form.register("name")} />
      </FormField>

      <FormField
        label="Subject Code"
        error={form.formState.errors.code?.message}
      >
        <Input {...form.register("code")} />
      </FormField>

      <FormField label="Subject Type">
        <Select
          value={subjectType}
          onValueChange={(value) =>
            form.setValue("type", value as SubjectFormInput["type"], {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select Subject Type" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="SCHOLASTIC">Scholastic</SelectItem>

            <SelectItem value="CO_SCHOLASTIC">Co-Scholastic</SelectItem>
          </SelectContent>
        </Select>
      </FormField>

      <FormField
        label="Display Order"
        error={form.formState.errors.displayOrder?.message}
      >
        <Input
          type="number"
          {...form.register("displayOrder", {
            valueAsNumber: true,
          })}
        />
      </FormField>

      <FormField label="Active">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">
            Enable this subject for use in the school.
          </p>

          <Switch
            checked={active}
            onCheckedChange={(checked) =>
              form.setValue("active", checked, {
                shouldDirty: true,
              })
            }
          />
        </div>
      </FormField>

      <SubmitButton
        loading={loading}
        mode={mode}
        createLabel="Create Subject"
        updateLabel="Update Subject"
        className="w-full"
      />
    </form>
  );
}
