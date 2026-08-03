"use client";

import { useEffect, useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type StudentOption = {
  id: string;
  admissionNo: string;
  fullName: string;
};

type Props = {
  value?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
};

export function StudentSelect({ value, disabled, onChange }: Props) {
  const [students, setStudents] = useState<StudentOption[]>([]);

  useEffect(() => {
    async function loadStudents() {
      const res = await fetch("/api/v1/students/options");

      const result = await res.json();

      if (result.success) {
        setStudents(result.data);
      }
    }

    loadStudents();
  }, []);

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder="Select Student" />
      </SelectTrigger>

      <SelectContent>
        {students.map((student) => (
          <SelectItem key={student.id} value={student.id}>
            {student.admissionNo} - {student.fullName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
