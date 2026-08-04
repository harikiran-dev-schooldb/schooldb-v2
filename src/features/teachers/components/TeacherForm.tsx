"use client";

import { useEffect, useState } from "react";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { teacherSchema, TeacherFormInput } from "../schemas/teacher.schema";

import { toast } from "sonner";

import { Input } from "@/components/ui/input";

import { Button } from "@/components/ui/button";

import { GenderSelect } from "@/components/common/select/GenderSelect";

import { FormField } from "@/components/common/forms/FormField";

type Props = {
  mode: "create" | "edit";
  teacherId?: string;
  onSuccess: () => void;
};

export function TeacherForm({ mode, teacherId, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);

  const form = useForm<TeacherFormInput>({
    resolver: zodResolver(teacherSchema),

    defaultValues: {
      employeeId: "",
      fullName: "",
      gender: "MALE",
      dob: "",
      joiningDate: "",
      phone: "",
      email: "",
      qualification: "",
      designation: "",
      active: true,
    },
  });

  useEffect(() => {
    if (mode !== "edit" || !teacherId) return;

    async function loadTeacher() {
      const res = await fetch(`/api/v1/teachers/${teacherId}`);

      const result = await res.json();

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      const teacher = result.data;

      form.reset({
        employeeId: teacher.employeeId,
        fullName: teacher.fullName,
        gender: teacher.gender,
        dob: teacher.dob ? teacher.dob.substring(0, 10) : "",
        joiningDate: teacher.joiningDate
          ? teacher.joiningDate.substring(0, 10)
          : "",
        phone: teacher.phone ?? "",
        email: teacher.email ?? "",
        qualification: teacher.qualification ?? "",
        designation: teacher.designation ?? "",
        active: teacher.active,
      });
    }

    loadTeacher();
  }, [mode, teacherId, form]);

  async function onSubmit(values: TeacherFormInput) {
    try {
      setLoading(true);

      const payload = teacherSchema.parse(values);

      const url =
        mode === "create"
          ? "/api/v1/teachers"
          : `/api/v1/teachers/${teacherId}`;

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
          ? "Teacher created successfully."
          : "Teacher updated successfully.",
      );

      form.reset();

      onSuccess();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="grid grid-cols-2 gap-4"
    >
      <FormField
        label="Employee ID"
        required
        error={form.formState.errors.employeeId?.message}
      >
        <Input {...form.register("employeeId")} />
      </FormField>

      <FormField
        label="Teacher Name"
        required
        error={form.formState.errors.fullName?.message}
      >
        <Input {...form.register("fullName")} />
      </FormField>

      <GenderSelect
        value={form.watch("gender")}
        onChange={(value) => form.setValue("gender", value)}
      />

      <FormField
        label="Date of Birth"
        error={form.formState.errors.dob?.message}
      >
        <Input type="date" {...form.register("dob")} />
      </FormField>

      <FormField label="Joining Date">
        <Input type="date" {...form.register("joiningDate")} />
      </FormField>

      <FormField label="Phone" error={form.formState.errors.phone?.message}>
        <Input {...form.register("phone")} />
      </FormField>

      <FormField label="Email" error={form.formState.errors.email?.message}>
        <Input type="email" {...form.register("email")} />
      </FormField>

      <FormField label="Qualification">
        <Input {...form.register("qualification")} />
      </FormField>

      <FormField label="Designation">
        <Input {...form.register("designation")} />
      </FormField>

      <Button type="submit" disabled={loading} className="col-span-2">
        {loading
          ? "Saving..."
          : mode === "create"
            ? "Create Teacher"
            : "Update Teacher"}
      </Button>
    </form>
  );
}
