"use client";

import { useEffect, useState } from "react";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  createStudentSchema,
  StudentFormInput,
} from "../schemas/student.schema";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { toast } from "sonner";

import { ClassSelect } from "@/components/common/select/ClassSelect";
import { SectionSelect } from "@/components/common/select/SectionSelect";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GenderSelect } from "@/components/common/select/GenderSelect";

type Props = {
  mode: "create" | "edit";
  studentId?: string;
  onSuccess: () => void;
};

export function StudentForm({ mode, studentId, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);

  const form = useForm<StudentFormInput>({
    resolver: zodResolver(createStudentSchema),

    defaultValues: {
      admissionNo: "",
      fullName: "",
      gender: "MALE",
      dob: "",
      phone: "",
      email: "",
      status: "ACTIVE",

      classId: "",
      sectionId: "",
      rollNo: undefined,
    },
  });

  const classId = form.watch("classId");

  useEffect(() => {
    form.setValue("sectionId", "");
  }, [classId, form]);

  useEffect(() => {
    if (mode !== "edit" || !studentId) return;

    async function loadStudent() {
      const res = await fetch(`/api/v1/students/${studentId}`);

      const result = await res.json();

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      const student = result.data;

      form.reset({
        admissionNo: student.admissionNo,
        fullName: student.fullName,
        gender: student.gender,
        dob: student.dob.substring(0, 10),
        phone: student.phone ?? "",
        email: student.email ?? "",
        status: student.status,

        classId: student.classId ?? "",
        sectionId: student.sectionId ?? "",
        rollNo: student.rollNo ?? undefined,
      });
    }

    loadStudent();
  }, [mode, studentId, form]);

  async function onSubmit(values: StudentFormInput) {
    try {
      setLoading(true);

      const payload = createStudentSchema.parse(values);

      const url =
        mode === "create"
          ? "/api/v1/students"
          : `/api/v1/students/${studentId}`;

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
          ? "Student created successfully."
          : "Student updated successfully.",
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
      <ClassSelect
        value={classId}
        onChange={(value) => form.setValue("classId", value)}
      />

      <SectionSelect
        classId={classId}
        value={form.watch("sectionId")}
        onChange={(value) => form.setValue("sectionId", value)}
      />

      <Input
        placeholder="Roll No"
        type="number"
        {...form.register("rollNo", {
          valueAsNumber: true,
        })}
      />

      <Input placeholder="Admission No" {...form.register("admissionNo")} />

      <Input placeholder="Student Name" {...form.register("fullName")} />

      <GenderSelect
        value={form.watch("gender")}
        onChange={(value) => form.setValue("gender", value)}
      />

      <Input type="date" {...form.register("dob")} />

      <Input placeholder="Phone" {...form.register("phone")} />

      <Input
        placeholder="Email"
        {...form.register("email")}
        className="col-span-2"
      />

      <Button type="submit" disabled={loading} className="col-span-2">
        {loading
          ? "Saving..."
          : mode === "create"
            ? "Create Student"
            : "Update Student"}
      </Button>
    </form>
  );
}
