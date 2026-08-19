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
  academicYearId?: string;
  disabled?: boolean;
};

export function StudentSelect({
  value,
  onChange,
  academicYearId,
  disabled,
}: Props) {
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!academicYearId) {
      return;
    }

    const selectedAcademicYearId = academicYearId;

    async function load() {
      try {
        setLoading(true);

        const params = new URLSearchParams();

        params.set("academicYearId", selectedAcademicYearId);

        const res = await fetch(
          `/api/v1/students/options?${params.toString()}`,
        );

        const result = await res.json();

        if (result.success) {
          setStudents(result.data);
        }
      } catch (error) {
        console.error("Failed to load students:", error);
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [academicYearId]);

  const visibleStudents = academicYearId ? students : [];

  return (
    <Select
      value={value || undefined}
      onValueChange={onChange}
      disabled={disabled || loading || !academicYearId}
    >
      <SelectTrigger>
        <SelectValue
          placeholder={
            !academicYearId
              ? "Select Academic Year first"
              : loading
                ? "Loading students..."
                : "Select Student"
          }
        />
      </SelectTrigger>

      <SelectContent>
        {visibleStudents.map((student) => (
          <SelectItem key={student.id} value={student.id}>
            {student.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
