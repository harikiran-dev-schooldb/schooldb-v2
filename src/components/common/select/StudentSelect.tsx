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
  label: string;
};

type Props = {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function StudentSelect({ value, onChange, disabled }: Props) {
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);

        const res = await fetch("/api/v1/students/options");

        const result = await res.json();

        if (result.success) {
          setStudents(result.data);
        }
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return (
    <Select
      value={value || undefined}
      onValueChange={onChange}
      disabled={disabled || loading}
    >
      <SelectTrigger>
        <SelectValue
          placeholder={loading ? "Loading students..." : "Select Student"}
        />
      </SelectTrigger>

      <SelectContent>
        {students.map((student) => (
          <SelectItem key={student.id} value={student.id}>
            {student.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
