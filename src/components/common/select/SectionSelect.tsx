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
  onChange: (value: string) => void;
};

export function SectionSelect({ classId, value, disabled, onChange }: Props) {
  const [sections, setSections] = useState<SectionOption[]>([]);

  useEffect(() => {
    if (!classId) {
      setSections([]);
      return;
    }

    async function loadSections() {
      try {
        const res = await fetch(`/api/v1/sections/options?classId=${classId}`);

        const result = await res.json();

        if (result.success) {
          setSections(result.data);
        }
      } catch {
        setSections([]);
      }
    }

    loadSections();
  }, [classId]);

  return (
    <Select
      value={value || undefined}
      onValueChange={(value) => onChange(value === "ALL" ? "" : value)}
      disabled={disabled || !classId}
    >
      <SelectTrigger>
        <SelectValue placeholder="Select Section" />
      </SelectTrigger>

      <SelectContent>
        <SelectItem value="ALL">All Sections</SelectItem>

        {sections.map((section) => (
          <SelectItem key={section.id} value={section.id}>
            {section.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
