"use client";

import { useEffect, useState } from "react";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { subjectSchema, SubjectFormInput } from "../schemas/subject.schema";

import { FormField } from "@/components/common/forms/FormField";
import { SubmitButton } from "@/components/common/forms/SubmitButton";

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

  useEffect(() => {
    if (mode !== "edit" || !subjectId) return;

    async function loadSubject() {
      const res = await fetch(`/api/v1/subjects/${subjectId}`);

      const result = await res.json();

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      form.reset(result.data);
    }

    loadSubject();
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
        toast.error(result.message);
        return;
      }

      toast.success(
        mode === "create"
          ? "Subject created successfully."
          : "Subject updated successfully.",
      );

      form.reset(defaultValues);

      onSuccess();
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
          value={form.watch("type")}
          onValueChange={(value) =>
            form.setValue("type", value as SubjectFormInput["type"])
          }
        >
          <SelectTrigger>
            <SelectValue />
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
        <Switch
          checked={form.watch("active")}
          onCheckedChange={(checked) => form.setValue("active", checked)}
        />
      </FormField>

      <SubmitButton
        loading={loading}
        mode={mode}
        createText="Create Subject"
        updateText="Update Subject"
        className="w-full"
      />
    </form>
  );
}
