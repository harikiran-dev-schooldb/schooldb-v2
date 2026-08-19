"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  createStudentSchema,
  StudentFormInput,
} from "../schemas/student.schema";

import { toast } from "sonner";

import { Input } from "@/components/ui/input";

import { GenderSelect } from "@/components/common/select/GenderSelect";
import { FormField, SubmitButton } from "@/components/common/forms";

type Props = {
  mode: "create" | "edit";
  studentId?: string;
  onSuccess: () => void;
};

const defaultValues: StudentFormInput = {
  admissionNo: "",
  fullName: "",
  gender: "MALE",
  dob: "",
  phone: "",
  email: "",
  status: "ACTIVE",
};

export function StudentForm({ mode, studentId, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);

  const form = useForm<StudentFormInput>({
    resolver: zodResolver(createStudentSchema),
    defaultValues,
  });

  const gender = useWatch({
    control: form.control,
    name: "gender",
  });

  useEffect(() => {
    if (mode !== "edit" || !studentId) {
      return;
    }

    let cancelled = false;

    async function loadStudent() {
      try {
        const res = await fetch(`/api/v1/students/${studentId}`, {
          cache: "no-store",
        });

        const result = await res.json();

        if (cancelled) {
          return;
        }

        if (!result.success) {
          toast.error(result.message || "Failed to load student.");
          return;
        }

        const student = result.data;

        form.reset({
          admissionNo: student.admissionNo ?? "",
          fullName: student.fullName ?? "",
          gender: student.gender,
          dob: student.dob ? student.dob.substring(0, 10) : "",
          phone: student.phone ?? "",
          email: student.email ?? "",
          status: student.status,
        });
      } catch {
        if (!cancelled) {
          toast.error("Failed to load student.");
        }
      }
    }

    void loadStudent();

    return () => {
      cancelled = true;
    };
  }, [mode, studentId, form]);

  async function onSubmit(values: StudentFormInput) {
    try {
      setLoading(true);

      const payload = createStudentSchema.parse(values);

      const isCreate = mode === "create";

      const url = isCreate
        ? "/api/v1/students"
        : `/api/v1/students/${studentId}`;

      const method = isCreate ? "POST" : "PUT";

      const res = await fetch(url, {
        method,

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!result.success) {
        toast.error(result.message || "Failed to save student.");
        return;
      }

      toast.success(
        result.message ||
          (isCreate
            ? "Student created successfully."
            : "Student updated successfully."),
      );

      if (isCreate) {
        form.reset(defaultValues);
      }

      onSuccess();
    } catch {
      toast.error("Something went wrong while saving the student.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="grid gap-4 md:grid-cols-2"
    >
      <FormField
        label="Admission No"
        required
        error={form.formState.errors.admissionNo?.message}
      >
        <Input placeholder="Admission No" {...form.register("admissionNo")} />
      </FormField>

      <FormField
        label="Student Name"
        required
        error={form.formState.errors.fullName?.message}
      >
        <Input placeholder="Student Name" {...form.register("fullName")} />
      </FormField>

      <FormField
        label="Gender"
        required
        error={form.formState.errors.gender?.message}
      >
        <GenderSelect
          value={gender}
          onChange={(value) =>
            form.setValue("gender", value, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        />
      </FormField>

      <FormField
        label="Date of Birth"
        required
        error={form.formState.errors.dob?.message}
      >
        <Input type="date" {...form.register("dob")} />
      </FormField>

      <FormField label="Phone" error={form.formState.errors.phone?.message}>
        <Input placeholder="Phone" {...form.register("phone")} />
      </FormField>

      <div className="md:col-span-2">
        <FormField label="Email" error={form.formState.errors.email?.message}>
          <Input type="email" placeholder="Email" {...form.register("email")} />
        </FormField>
      </div>

      <div className="md:col-span-2">
        <SubmitButton
          loading={loading}
          mode={mode}
          createLabel="Create Student"
          updateLabel="Update Student"
          className="w-full"
        />
      </div>
    </form>
  );
}
