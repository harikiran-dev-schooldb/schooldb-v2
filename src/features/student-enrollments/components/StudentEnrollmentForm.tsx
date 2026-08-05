"use client";

import { useEffect, useRef, useState } from "react";

import { useForm } from "react-hook-form";
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

  const classId = form.watch("classId");

  const previousClass = useRef(classId);

  useEffect(() => {
    if (previousClass.current && previousClass.current !== classId) {
      form.setValue("sectionId", "");
    }

    previousClass.current = classId;
  }, [classId, form]);

  useEffect(() => {
    if (mode !== "edit" || !enrollmentId) return;

    async function loadEnrollment() {
      const res = await fetch(`/api/v1/student-enrollments/${enrollmentId}`);

      const result = await res.json();

      if (!result.success) {
        toast.error(result.message);
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
    }

    loadEnrollment();
  }, [mode, enrollmentId, form]);

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

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(
        mode === "create"
          ? "Student enrolled successfully."
          : "Enrollment updated successfully.",
      );

      form.reset(defaultValues);

      onSuccess();
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
          value={form.watch("studentId")}
          placeholder="Select Student"
          onChange={(value) =>
            form.setValue("studentId", value, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        />
      </FormField>

      <FormField
        label="Academic Year"
        required
        error={form.formState.errors.academicYearId?.message}
      >
        <RemoteCombobox
          url="/api/v1/academic-years/options"
          value={form.watch("academicYearId")}
          placeholder="Select Academic Year"
          onChange={(value) =>
            form.setValue("academicYearId", value, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        />
      </FormField>

      <FormField
        label="Class"
        required
        error={form.formState.errors.classId?.message}
      >
        <RemoteCombobox
          url="/api/v1/classes/options"
          value={classId}
          placeholder="Select Class"
          onChange={(value) =>
            form.setValue("classId", value, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        />
      </FormField>

      <FormField
        label="Section"
        required
        error={form.formState.errors.sectionId?.message}
      >
        <RemoteCombobox
          url={`/api/v1/sections/options?classId=${classId}`}
          value={form.watch("sectionId")}
          placeholder="Select Section"
          disabled={!classId}
          onChange={(value) =>
            form.setValue("sectionId", value, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        />
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
