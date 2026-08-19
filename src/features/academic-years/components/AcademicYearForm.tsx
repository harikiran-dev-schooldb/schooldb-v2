"use client";

import { useEffect, useState } from "react";

import { useForm, useWatch } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";

import {
  academicYearSchema,
  AcademicYearFormInput,
} from "../schemas/academic-year.schema";

import { Input } from "@/components/ui/input";

import { Button } from "@/components/ui/button";

import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  mode: "create" | "edit";
  academicYearId?: string;
  onSuccess: () => void;
};

export function AcademicYearForm({ mode, academicYearId, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);

  const form = useForm<AcademicYearFormInput>({
    resolver: zodResolver(academicYearSchema),

    defaultValues: {
      name: "",
      startDate: "",
      endDate: "",
      attendanceMode: "ONCE_DAILY",
    },
  });

  const attendanceMode = useWatch({
    control: form.control,
    name: "attendanceMode",
  });

  useEffect(() => {
    if (mode !== "edit" || !academicYearId) return;

    async function load() {
      const res = await fetch(`/api/v1/academic-years/${academicYearId}`);

      const result = await res.json();

      if (!result.success) return;

      const year = result.data;

      form.reset({
        name: year.name,
        startDate: year.startDate.substring(0, 10),
        endDate: year.endDate.substring(0, 10),
        attendanceMode: year.attendanceMode ?? "ONCE_DAILY",
      });
    }

    load();
  }, [mode, academicYearId, form]);

  async function onSubmit(values: AcademicYearFormInput) {
    try {
      setLoading(true);

      const url =
        mode === "create"
          ? "/api/v1/academic-years"
          : `/api/v1/academic-years/${academicYearId}`;

      const method = mode === "create" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(values),
      });

      const result = await res.json();

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(
        mode === "create" ? "Academic year created." : "Academic year updated.",
      );

      onSuccess();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
      <Input placeholder="Academic Year" {...form.register("name")} />

      <Input type="date" {...form.register("startDate")} />

      <Input type="date" {...form.register("endDate")} />

      <div className="space-y-2">
        <label className="text-sm font-medium">Attendance Mode</label>

        <Select
          value={attendanceMode}
          onValueChange={(value) =>
            form.setValue(
              "attendanceMode",
              value as AcademicYearFormInput["attendanceMode"],
              {
                shouldDirty: true,
                shouldValidate: true,
              },
            )
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select attendance mode" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="ONCE_DAILY">Once Daily</SelectItem>

            <SelectItem value="MORNING_AFTERNOON">
              Morning + Afternoon
            </SelectItem>

            <SelectItem value="EVERY_PERIOD">Every Period</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button className="w-full" disabled={loading}>
        {loading
          ? "Saving..."
          : mode === "create"
            ? "Create Academic Year"
            : "Update Academic Year"}
      </Button>
    </form>
  );
}
