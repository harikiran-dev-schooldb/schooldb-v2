"use client";

import { useEffect, useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SectionOption = {
  id: string;
  label: string;
};

type Props = {
  classId?: string;
  value?: string;
  disabled?: boolean;
  allowAll?: boolean;
  placeholder?: string;
  triggerClassName?: string;
  academicYearId?: string;
  purpose?: "attendance";
  onChange: (value: string) => void;
};

export function SectionSelect({
  classId,
  value,
  disabled,
  allowAll = true,
  placeholder = "Select Section",
  triggerClassName,
  academicYearId,
  purpose,
  onChange,
}: Props) {
  const [sections, setSections] = useState<SectionOption[]>([]);

  useEffect(() => {
    if (!classId) return;
    const selectedClassId = classId;

    let cancelled = false;

    async function loadSections() {
      try {
        const params = new URLSearchParams({ classId: selectedClassId });
        if (academicYearId) params.set("academicYearId", academicYearId);
        if (purpose) params.set("purpose", purpose);
        const res = await fetch(`/api/v1/sections/options?${params}`);

        const result = await res.json();

        if (!cancelled && result.success) {
          setSections(result.data);
        }
      } catch {
        if (!cancelled) {
          setSections([]);
        }
      }
    }

    loadSections();

    return () => {
      cancelled = true;
    };
  }, [academicYearId, classId, purpose]);

  const displaySections = classId ? sections : [];

  return (
    <Select
      value={value ?? ""}
      onValueChange={(value) => onChange(value === "ALL" ? "" : value)}
      disabled={disabled || !classId}
    >
      <SelectTrigger className={triggerClassName}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>

      <SelectContent>
        {allowAll && <SelectItem value="ALL">All Sections</SelectItem>}

        {displaySections.map((section) => (
          <SelectItem key={section.id} value={section.id}>
            {section.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
