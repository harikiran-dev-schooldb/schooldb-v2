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
import { refreshTable } from "@/lib/table-event";

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

      refreshTable("students");

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
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      {/* Student identity */}
      <section className="rounded-2xl border border-border/70 bg-muted/20 p-5 sm:p-6">
        <div className="mb-6">
          <p className="text-sm font-semibold text-foreground">
            Student identity
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Basic identification details for the student record.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <FormField
            label="Admission No"
            required
            error={form.formState.errors.admissionNo?.message}
          >
            <Input
              placeholder="e.g. ADM-2026-001"
              className="h-11 bg-background"
              {...form.register("admissionNo")}
            />
          </FormField>

          <FormField
            label="Student Name"
            required
            error={form.formState.errors.fullName?.message}
          >
            <Input
              placeholder="Enter full name"
              className="h-11 bg-background"
              {...form.register("fullName")}
            />
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
            <Input
              type="date"
              className="h-11 bg-background"
              {...form.register("dob")}
            />
          </FormField>
        </div>
      </section>

      {/* Contact details */}
      <section className="rounded-2xl border border-border/70 bg-muted/20 p-5 sm:p-6">
        <div className="mb-6">
          <p className="text-sm font-semibold text-foreground">
            Contact information
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Add contact details for communication and future notifications.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <FormField label="Phone" error={form.formState.errors.phone?.message}>
            <Input
              placeholder="Enter phone number"
              className="h-11 bg-background"
              {...form.register("phone")}
            />
          </FormField>

          <FormField label="Email" error={form.formState.errors.email?.message}>
            <Input
              type="email"
              placeholder="Enter email address"
              className="h-11 bg-background"
              {...form.register("email")}
            />
          </FormField>
        </div>
      </section>

      {/* Footer */}
      <div className="sticky bottom-0 -mx-6 -mb-6 border-t border-border/60 bg-card/95 px-6 py-4 backdrop-blur-xl sm:-mx-8 sm:-mb-8 sm:px-8">
        <SubmitButton
          loading={loading}
          mode={mode}
          createLabel="Create Student"
          updateLabel="Save Changes"
          className="h-11 w-full rounded-xl font-semibold shadow-lg shadow-primary/15"
        />
      </div>
    </form>
  );
}
