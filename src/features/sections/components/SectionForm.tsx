"use client";

import { useEffect, useState } from "react";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  classSchema,
  ClassFormOutput,
  ClassFormInput,
} from "../schemas/section.schema";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type Props = {
  mode: "create" | "edit";
  classId?: string;
  onSuccess: () => void;
};

export function ClassForm({ mode, classId, onSuccess }: Props) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const form = useForm<ClassFormInput>({
    resolver: zodResolver(classSchema),

    defaultValues: {
      name: "",
      code: "",
      description: "",
      displayOrder: 0,
    },
  });

  useEffect(() => {
    if (mode !== "edit" || !classId) return;

    async function loadClass() {
      const res = await fetch(`/api/v1/classes/${classId}`);

      const result = await res.json();

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      const item = result.data;

      form.reset({
        name: item.name,
        code: item.code ?? "",
        description: item.description ?? "",
        displayOrder: item.displayOrder,
      });
    }

    loadClass();
  }, [mode, classId, form]);

  async function onSubmit(values: ClassFormInput) {
    try {
      setLoading(true);

      const payload = classSchema.parse(values);

      const url =
        mode === "create" ? "/api/v1/classes" : `/api/v1/classes/${classId}`;

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
          ? "Class created successfully."
          : "Class updated successfully.",
      );

      form.reset();

      onSuccess();

      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
      <Input placeholder="Class Name" {...form.register("name")} />

      <Input placeholder="Code" {...form.register("code")} />

      <Input placeholder="Description" {...form.register("description")} />

      <Input
        type="number"
        placeholder="Display Order"
        {...form.register("displayOrder", {
          valueAsNumber: true,
        })}
      />

      <Button type="submit" className="w-full" disabled={loading}>
        {loading
          ? "Saving..."
          : mode === "create"
            ? "Create Class"
            : "Update Class"}
      </Button>
    </form>
  );
}
