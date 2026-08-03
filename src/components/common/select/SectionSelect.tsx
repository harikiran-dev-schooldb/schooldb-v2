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
  name: string;
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
      const res = await fetch(`/api/v1/classes/${classId}/sections`);

      const result = await res.json();

      if (result.success) {
        setSections(result.data);
      }
    }

    loadSections();
  }, [classId]);

  return (
    <Select
      value={value}
      onValueChange={onChange}
      disabled={disabled || !classId}
    >
      <SelectTrigger>
        <SelectValue placeholder="Select Section" />
      </SelectTrigger>

      <SelectContent>
        {sections.map((section) => (
          <SelectItem key={section.id} value={section.id}>
            {section.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
