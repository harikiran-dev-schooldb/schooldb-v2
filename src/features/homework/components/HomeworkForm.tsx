"use client";

import { useEffect, useState } from "react";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { toast } from "sonner";

import { ClassSelect, SectionSelect } from "@/components/common/select";

import { FormField, SubmitButton } from "@/components/common/forms";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

import { homeworkSchema, HomeworkFormInput } from "../schemas/homework.schema";

type Props = {
  mode: "create" | "edit";
  homeworkId?: string;
  onSuccess: () => void;
};

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function getTomorrow() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  return tomorrow.toISOString().split("T")[0];
}

const defaultValues: HomeworkFormInput = {
  classId: "",
  sectionId: "",
  title: "Today's Homework",
  description: "",
  assignedDate: "",
  dueDate: "",
  active: true,
};

export function HomeworkForm({ mode, homeworkId, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);

  const form = useForm<HomeworkFormInput>({
    resolver: zodResolver(homeworkSchema),
    defaultValues: {
      ...defaultValues,
      assignedDate: getToday(),
      dueDate: getTomorrow(),
    },
  });

  const classId = useWatch({
    control: form.control,
    name: "classId",
  });

  const sectionId = useWatch({
    control: form.control,
    name: "sectionId",
  });

  const active = useWatch({
    control: form.control,
    name: "active",
  });

  useEffect(() => {
    if (mode !== "edit" || !homeworkId) {
      return;
    }

    async function load() {
      try {
        const response = await fetch(`/api/v1/homework/${homeworkId}`);

        const result = await response.json();

        if (!response.ok || !result.success) {
          toast.error(result.message || "Failed to load homework.");
          return;
        }

        const item = result.data;

        form.reset({
          classId: item.classId,
          sectionId: item.sectionId ?? "",
          title: item.title,
          description: item.description ?? "",
          assignedDate: new Date(item.assignedDate).toISOString().split("T")[0],
          dueDate: item.dueDate
            ? new Date(item.dueDate).toISOString().split("T")[0]
            : "",
          active: item.active,
        });
      } catch {
        toast.error("Failed to load homework.");
      }
    }

    void load();
  }, [mode, homeworkId, form]);

  async function onSubmit(values: HomeworkFormInput) {
    try {
      setLoading(true);

      const payload = homeworkSchema.parse(values);

      const url =
        mode === "create"
          ? "/api/v1/homework"
          : `/api/v1/homework/${homeworkId}`;

      const method = mode === "create" ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.message || "Failed to save homework.");
        return;
      }

      toast.success(
        result.message ||
          (mode === "create"
            ? "Homework created successfully."
            : "Homework updated successfully."),
      );

      if (mode === "create") {
        form.reset({
          ...defaultValues,
          assignedDate: getToday(),
          dueDate: getTomorrow(),
        });
      }

      onSuccess();
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Failed to save homework.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
      <FormField label="Class" required>
        <ClassSelect
          value={classId}
          onChange={(value) => {
            form.setValue("classId", value, {
              shouldDirty: true,
              shouldValidate: true,
            });

            form.setValue("sectionId", "", {
              shouldDirty: true,
              shouldValidate: true,
            });
          }}
        />
      </FormField>

      <FormField label="Section">
        <SectionSelect
          classId={classId}
          value={sectionId}
          onChange={(value) =>
            form.setValue("sectionId", value, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        />
      </FormField>

      <FormField label="Title" required>
        <Input placeholder="Enter homework title" {...form.register("title")} />
      </FormField>

      <FormField label="Description">
        <Textarea
          placeholder="Enter homework..."
          rows={5}
          {...form.register("description")}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.stopPropagation();
            }
          }}
        />
      </FormField>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField label="Due Date">
          <Input type="date" {...form.register("dueDate")} />
        </FormField>
      </div>

      <div className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <h4 className="font-medium">Active</h4>

          <p className="text-sm text-muted-foreground">Enable this homework.</p>
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

      <SubmitButton
        loading={loading}
        mode={mode}
        createLabel="Create Homework"
        updateLabel="Update Homework"
        className="w-full"
      />
    </form>
  );
}
