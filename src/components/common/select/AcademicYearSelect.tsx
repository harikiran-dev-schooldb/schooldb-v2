"use client";

import { useEffect, useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type AcademicYearOption = {
  id: string;
  name: string;
};

type Props = {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function AcademicYearSelect({ value, onChange, disabled }: Props) {
  const [years, setYears] = useState<AcademicYearOption[]>([]);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/v1/academic-years/options");

      const result = await res.json();

      if (result.success) {
        setYears(result.data);
      }
    }

    load();
  }, []);

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder="Academic Year" />
      </SelectTrigger>

      <SelectContent>
        {years.map((year) => (
          <SelectItem key={year.id} value={year.id}>
            {year.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
