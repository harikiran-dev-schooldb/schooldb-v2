"use client";

import { useState } from "react";

import { useForm } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";

import {
  createStudentSchema,
  StudentFormInput,
  StudentFormOutput,
} from "../schemas/student.schema";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import z from "zod";

type Props = {
  onSuccess: () => void;
};

export function StudentForm({ onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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
    },
  });

  async function onSubmit(values: StudentFormInput) {
    try {
      setLoading(true);

      const res = await fetch("/api/v1/students", {
        method: "POST",

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

      toast.success("Student created successfully");

      onSuccess();

      form.reset();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="grid grid-cols-2 gap-4"
    >
      <Input placeholder="Admission No" {...form.register("admissionNo")} />

      <Input placeholder="Student Name" {...form.register("fullName")} />

      <Input type="date" {...form.register("dob")} />

      <Input placeholder="Phone" {...form.register("phone")} />

      <Input placeholder="Email" {...form.register("email")} />

      <Button type="submit" disabled={loading} className="col-span-2">
        {loading ? "Saving..." : "Save Student"}
      </Button>
    </form>
  );
}
