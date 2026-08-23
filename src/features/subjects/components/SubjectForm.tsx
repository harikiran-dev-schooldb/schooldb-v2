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
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FormField
            label="Subject Name"
            required
            error={form.formState.errors.name?.message}
          >
            <Input
              {...form.register("name")}
              placeholder="e.g. Mathematics"
              className="h-11 rounded-xl"
            />
          </FormField>
        </div>

        <FormField
          label="Subject Code"
          error={form.formState.errors.code?.message}
        >
          <Input
            {...form.register("code")}
            placeholder="e.g. MAT"
            className="h-11 rounded-xl uppercase"
          />
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
            className="h-11 rounded-xl"
          />
        </FormField>
      </div>

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
          <SelectTrigger className="h-11 rounded-xl">
            <SelectValue placeholder="Select Subject Type" />
          </SelectTrigger>

          <SelectContent className="rounded-xl">
            <SelectItem value="SCHOLASTIC">Scholastic</SelectItem>

            <SelectItem value="CO_SCHOLASTIC">Co-Scholastic</SelectItem>
          </SelectContent>
        </Select>
      </FormField>

      <FormField label="Availability">
        <div className="flex items-center justify-between rounded-xl border bg-muted/20 p-4">
          <div className="flex items-center gap-3">
            <div
              className={[
                "flex size-9 items-center justify-center rounded-lg",
                active
                  ? "bg-emerald-500/10 text-emerald-600"
                  : "bg-muted text-muted-foreground",
              ].join(" ")}
            >
              <span className="size-2 rounded-full bg-current" />
            </div>

            <div>
              <p className="text-sm font-medium">
                {active ? "Subject is active" : "Subject is inactive"}
              </p>

              <p className="text-xs text-muted-foreground">
                {active
                  ? "This subject is available for school operations."
                  : "This subject will be unavailable for new usage."}
              </p>
            </div>
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
      </FormField>

      <div className="border-t pt-5">
        <SubmitButton
          loading={loading}
          mode={mode}
          createLabel="Create Subject"
          updateLabel="Save Changes"
          className="h-11 w-full rounded-xl"
        />
      </div>
    </form>
  );
}
