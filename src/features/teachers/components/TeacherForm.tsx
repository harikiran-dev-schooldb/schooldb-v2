"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { GraduationCap, UserRound } from "lucide-react";

import { teacherSchema, TeacherFormInput } from "../schemas/teacher.schema";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";

import { GenderSelect } from "@/components/common/select/GenderSelect";
import { FormField, SubmitButton } from "@/components/common/forms";
import { refreshTable } from "@/lib/table-events";

type Props = {
  mode: "create" | "edit";
  teacherId?: string;
  onSuccess: () => void;
};

const defaultValues: TeacherFormInput = {
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
};

export function TeacherForm({ mode, teacherId, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);

  const form = useForm<TeacherFormInput>({
    resolver: zodResolver(teacherSchema),
    defaultValues,
  });

  const gender = useWatch({
    control: form.control,
    name: "gender",
  });

  useEffect(() => {
    if (mode !== "edit" || !teacherId) return;

    let cancelled = false;

    async function loadTeacher() {
      try {
        const res = await fetch(`/api/v1/teachers/${teacherId}`, {
          cache: "no-store",
        });

        const result = await res.json();

        if (cancelled) return;

        if (!result.success) {
          toast.error(result.message ?? "Failed to load teacher.");
          return;
        }

        const teacher = result.data;

        form.reset({
          employeeId: teacher.employeeId ?? "",
          fullName: teacher.fullName ?? "",
          gender: teacher.gender ?? "MALE",
          dob: teacher.dob ? teacher.dob.substring(0, 10) : "",
          joiningDate: teacher.joiningDate
            ? teacher.joiningDate.substring(0, 10)
            : "",
          phone: teacher.phone ?? "",
          email: teacher.email ?? "",
          qualification: teacher.qualification ?? "",
          designation: teacher.designation ?? "",
          active: teacher.active ?? true,
        });
      } catch {
        if (!cancelled) {
          toast.error("Failed to load teacher.");
        }
      }
    }

    void loadTeacher();

    return () => {
      cancelled = true;
    };
  }, [mode, teacherId, form]);

  async function onSubmit(values: TeacherFormInput) {
    try {
      setLoading(true);

      const payload = teacherSchema.parse(values);
      const isCreate = mode === "create";

      const url = isCreate
        ? "/api/v1/teachers"
        : `/api/v1/teachers/${teacherId}`;

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
        toast.error(
          result.message ||
            (isCreate
              ? "Failed to create teacher."
              : "Failed to update teacher."),
        );
        return;
      }

      toast.success(
        result.message ||
          (isCreate
            ? "Teacher created successfully."
            : "Teacher updated successfully."),
      );

      refreshTable("teachers");

      if (isCreate) {
        form.reset(defaultValues);
      }

      onSuccess();
    } catch {
      toast.error("Something went wrong while saving the teacher.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Personal information */}
      <div>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10">
            <UserRound className="size-4 text-primary" />
          </div>

          <div>
            <h3 className="text-sm font-bold text-foreground">
              Personal Information
            </h3>
            <p className="text-xs text-muted-foreground">
              Basic teacher identification and contact details
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            label="Employee ID"
            required
            error={form.formState.errors.employeeId?.message}
          >
            <Input
              placeholder="e.g. EMP-001"
              {...form.register("employeeId")}
            />
          </FormField>

          <FormField
            label="Teacher Name"
            required
            error={form.formState.errors.fullName?.message}
          >
            <Input placeholder="Full name" {...form.register("fullName")} />
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
            error={form.formState.errors.dob?.message}
          >
            <Input type="date" {...form.register("dob")} />
          </FormField>

          <FormField label="Phone" error={form.formState.errors.phone?.message}>
            <Input placeholder="Phone number" {...form.register("phone")} />
          </FormField>

          <FormField label="Email" error={form.formState.errors.email?.message}>
            <Input
              type="email"
              placeholder="teacher@example.com"
              {...form.register("email")}
            />
          </FormField>
        </div>
      </div>

      {/* Professional information */}
      <div className="border-t border-border pt-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-teal-500/10">
            <GraduationCap className="size-4 text-teal-600" />
          </div>

          <div>
            <h3 className="text-sm font-bold text-foreground">
              Professional Information
            </h3>
            <p className="text-xs text-muted-foreground">
              Employment and academic details
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            label="Joining Date"
            error={form.formState.errors.joiningDate?.message}
          >
            <Input type="date" {...form.register("joiningDate")} />
          </FormField>

          <FormField
            label="Designation"
            error={form.formState.errors.designation?.message}
          >
            <Input
              placeholder="e.g. Mathematics Teacher"
              {...form.register("designation")}
            />
          </FormField>

          <div className="md:col-span-2">
            <FormField
              label="Qualification"
              error={form.formState.errors.qualification?.message}
            >
              <Input
                placeholder="e.g. B.Sc, B.Ed"
                {...form.register("qualification")}
              />
            </FormField>
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="border-t border-border pt-5">
        <SubmitButton
          loading={loading}
          mode={mode}
          createLabel="Create Teacher"
          updateLabel="Update Teacher"
          className="w-full"
        />
      </div>
    </form>
  );
}
