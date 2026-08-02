"use client";

import { useEffect, useState } from "react";

import { Student } from "@/generated/prisma/client";

type Props = {
  studentId: string;
};

export function StudentProfile({ studentId }: Props) {
  const [student, setStudent] = useState<Student | null>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/v1/students/${studentId}`);

      const result = await res.json();

      setStudent(result.data);
    }

    load();
  }, [studentId]);

  if (!student) {
    return <>Loading...</>;
  }

  return (
    <div>
      <h1>{student.fullName}</h1>

      <p>{student.admissionNo}</p>

      <p>{student.phone}</p>

      <p>{student.email}</p>
    </div>
  );
}
