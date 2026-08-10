"use client";

import { useEffect, useState } from "react";

import { useForm } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";

import {
  feeCategorySchema,
  FeeCategoryInput,
} from "../schemas/fee-category.schema";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

import { toast } from "sonner";

type Props = {
  mode: "create" | "edit";
  feeCategoryId?: string;
  onSuccess: () => void;
};

export function FeeCategoryForm({ mode, feeCategoryId, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);

  const form = useForm<FeeCategoryInput>({
    resolver: zodResolver(feeCategorySchema),

    defaultValues: {
      name: "",
      code: "",
      description: "",
      active: true,
    },
  });

  useEffect(() => {
    if (mode !== "edit" || !feeCategoryId) {
      return;
    }

    async function load() {
      const response = await fetch(`/api/v1/fee-categories/${feeCategoryId}`);

      const result = await response.json();

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      const category = result.data;

      form.reset({
        name: category.name,
        code: category.code ?? "",
        description: category.description ?? "",
        active: category.active,
      });
    }

    load();
  }, [mode, feeCategoryId, form]);

  async function onSubmit(values: FeeCategoryInput) {
    try {
      setLoading(true);

      const url =
        mode === "create"
          ? "/api/v1/fee-categories"
          : `/api/v1/fee-categories/${feeCategoryId}`;

      const method = mode === "create" ? "POST" : "PATCH";

      const response = await fetch(url, {
        method,

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(values),
      });

      const result = await response.json();

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(
        mode === "create" ? "Fee category created." : "Fee category updated.",
      );

      onSuccess();
    } catch {
      toast.error("Failed to save fee category.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
      <Input placeholder="Fee Category" {...form.register("name")} />

      <Input placeholder="Code" {...form.register("code")} />

      <Textarea placeholder="Description" {...form.register("description")} />

      <Button className="w-full" disabled={loading}>
        {loading
          ? "Saving..."
          : mode === "create"
            ? "Create Fee Category"
            : "Update Fee Category"}
      </Button>
    </form>
  );
}
