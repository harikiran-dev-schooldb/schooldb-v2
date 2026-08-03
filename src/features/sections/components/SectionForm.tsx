"use client";

import { useEffect, useState } from "react";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { sectionSchema, SectionFormInput } from "../schemas/section.schema";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { ClassSelect } from "@/components/common/select/ClassSelect";

type Props = {
  mode: "create" | "edit";
  sectionId?: string;
  onSuccess: () => void;
};

export function SectionForm({ mode, sectionId, onSuccess }: Props) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const form = useForm<SectionFormInput>({
    resolver: zodResolver(sectionSchema),

    defaultValues: {
      classId: "",
      name: "",
      displayOrder: 0,
    },
  });

  useEffect(() => {
    if (mode !== "edit" || !sectionId) return;

    async function loadSection() {
      const res = await fetch(`/api/v1/sections/${sectionId}`);

      const result = await res.json();

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      const section = result.data;

      form.reset({
        classId: section.classId,
        name: section.name,
        displayOrder: section.displayOrder,
      });
    }

    loadSection();
  }, [mode, sectionId, form]);

  async function onSubmit(values: SectionFormInput) {
    try {
      setLoading(true);

      const payload = sectionSchema.parse(values);

      const url =
        mode === "create"
          ? "/api/v1/sections"
          : `/api/v1/sections/${sectionId}`;

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
          ? "Section created successfully."
          : "Section updated successfully.",
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
      <ClassSelect
        value={form.watch("classId")}
        onChange={(value) => form.setValue("classId", value)}
      />

      <Input placeholder="Section Name" {...form.register("name")} />

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
            ? "Create Section"
            : "Update Section"}
      </Button>
    </form>
  );
}
