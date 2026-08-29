"use client";

import { useEffect, useState } from "react";

import { useForm, useWatch } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";

import {
  studentEnrollmentSchema,
  StudentEnrollmentFormInput,
} from "../schemas/student-enrollment.schema";

import { toast } from "sonner";

import { Input } from "@/components/ui/input";

import { RemoteCombobox } from "@/components/common/combobox/RemoteCombobox";

import {
  FormField,
  NumberInput,
  SubmitButton,
} from "@/components/common/forms";
import { refreshTable } from "@/lib/table-event";

type Props = {
  mode: "create" | "edit";
  enrollmentId?: string;
  onSuccess: () => void;
};

const defaultValues: StudentEnrollmentFormInput = {
  studentId: "",
  academicYearId: "",
  classId: "",
  sectionId: "",
  rollNo: undefined,
  admissionDate: "",
  active: true,
};

export function StudentEnrollmentForm({
  mode,
  enrollmentId,
  onSuccess,
}: Props) {
  const [loading, setLoading] = useState(false);

  const form = useForm<StudentEnrollmentFormInput>({
    resolver: zodResolver(studentEnrollmentSchema),
    defaultValues,
  });

  const studentId = useWatch({
    control: form.control,
    name: "studentId",
  });

  const academicYearId = useWatch({
    control: form.control,
    name: "academicYearId",
  });

  const classId = useWatch({
    control: form.control,
    name: "classId",
  });

  const sectionId = useWatch({
    control: form.control,
    name: "sectionId",
  });

  useEffect(() => {
    if (mode !== "edit" || !enrollmentId) {
      return;
    }

    async function loadEnrollment() {
      try {
        const res = await fetch(`/api/v1/student-enrollments/${enrollmentId}`);

        const result = await res.json();

        if (!res.ok || !result.success) {
          toast.error(result.message || "Failed to load enrollment.");

          return;
        }

        const item = result.data;

        form.reset({
          studentId: item.studentId,
          academicYearId: item.academicYearId,
          classId: item.classId,
          sectionId: item.sectionId,
          rollNo: item.rollNo ?? undefined,
          admissionDate: item.admissionDate
            ? item.admissionDate.substring(0, 10)
            : "",
          active: item.active,
        });
      } catch {
        toast.error("Failed to load enrollment.");
      }
    }

    void loadEnrollment();
  }, [mode, enrollmentId, form]);

  function handleStudentChange(value: string) {
    form.setValue("studentId", value, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  function handleAcademicYearChange(value: string) {
    form.setValue("academicYearId", value, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  function handleClassChange(value: string) {
    form.setValue("classId", value, {
      shouldDirty: true,
      shouldValidate: true,
    });

    // Clear the previous section without validating it yet.
    form.setValue("sectionId", "", {
      shouldDirty: true,
      shouldValidate: false,
    });
  }

  function handleSectionChange(value: string) {
    form.setValue("sectionId", value, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  async function onSubmit(values: StudentEnrollmentFormInput) {
    try {
      setLoading(true);

      const payload = studentEnrollmentSchema.parse(values);

      const url =
        mode === "create"
          ? "/api/v1/student-enrollments"
          : `/api/v1/student-enrollments/${enrollmentId}`;

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
        toast.error(result.message || "Failed to save enrollment.");

        return;
      }

      toast.success(
        mode === "create"
          ? "Student enrolled successfully."
          : "Enrollment updated successfully.",
      );

      form.reset(defaultValues);

      refreshTable("enrollments");

      onSuccess();
    } catch {
      toast.error("Failed to save enrollment.");
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
        label="Student"
        required
        error={form.formState.errors.studentId?.message}
      >
        <RemoteCombobox
          url="/api/v1/students/options"
          value={studentId ?? ""}
          placeholder="Select Student"
          onChange={handleStudentChange}
        />
      </FormField>

      <FormField
        label="Academic Year"
        required
        error={form.formState.errors.academicYearId?.message}
      >
        <RemoteCombobox
          url="/api/v1/academic-years/options"
          value={academicYearId ?? ""}
          placeholder="Select Academic Year"
          onChange={handleAcademicYearChange}
        />
      </FormField>

      <FormField
        label="Class"
        required
        error={form.formState.errors.classId?.message}
      >
        <RemoteCombobox
          url="/api/v1/classes/options"
          value={classId ?? ""}
          placeholder="Select Class"
          onChange={handleClassChange}
        />
      </FormField>

      <FormField
        label="Section"
        required
        error={form.formState.errors.sectionId?.message}
      >
        {classId ? (
          <RemoteCombobox
            url={`/api/v1/sections/options?classId=${encodeURIComponent(classId)}`}
            value={sectionId ?? ""}
            placeholder="Select Section"
            onChange={handleSectionChange}
          />
        ) : (
          <div className="flex h-10 w-full items-center rounded-xl border border-border bg-muted/30 px-3 text-sm text-muted-foreground">
            Select a class first
          </div>
        )}
      </FormField>

      <FormField label="Roll No" error={form.formState.errors.rollNo?.message}>
        <NumberInput
          placeholder="Roll No"
          {...form.register("rollNo", {
            valueAsNumber: true,
          })}
        />
      </FormField>

      <FormField
        label="Admission Date"
        error={form.formState.errors.admissionDate?.message}
      >
        <Input type="date" {...form.register("admissionDate")} />
      </FormField>

      <div className="md:col-span-2">
        <SubmitButton
          loading={loading}
          mode={mode}
          createLabel="Enroll Student"
          updateLabel="Update Enrollment"
          className="w-full"
        />
      </div>
    </form>
  );
}
