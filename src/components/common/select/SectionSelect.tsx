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
    if (!classId) return;

    let cancelled = false;

    async function loadSections() {
      try {
        const res = await fetch(`/api/v1/sections/options?classId=${classId}`);

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
  }, [classId]);

  const displaySections = classId ? sections : [];

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

        {displaySections.map((section) => (
          <SelectItem key={section.id} value={section.id}>
            {section.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
