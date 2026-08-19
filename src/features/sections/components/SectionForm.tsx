"use client";

import { useEffect, useState } from "react";

import { useForm, useWatch } from "react-hook-form";
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

    async function loadSection() {
      try {
        const res = await fetch(`/api/v1/sections/${sectionId}`);

        const result = await res.json();

        if (!res.ok || !result.success) {
          toast.error(result.message || "Failed to load section.");
          return;
        }

        const section = result.data;

        form.reset({
          classId: section.classId,
          name: section.name,
          displayOrder: section.displayOrder,
        });
      } catch {
        toast.error("Failed to load section.");
      }
    }

    void loadSection();
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

      if (!res.ok || !result.success) {
        toast.error(result.message || "Failed to save section.");
        return;
      }

      toast.success(
        result.message ||
          (mode === "create"
            ? "Section created successfully."
            : "Section updated successfully."),
      );

      form.reset(defaultValues);

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
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
      <ClassSelect
        value={classId}
        onChange={(value) =>
          form.setValue("classId", value, {
            shouldDirty: true,
            shouldValidate: true,
          })
        }
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
