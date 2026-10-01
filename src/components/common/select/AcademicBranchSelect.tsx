"use client";

import { useEffect, useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Option = { id: string; name: string; code: string | null };

type Props = {
  syllabusId?: string;
  value?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
};

export function AcademicBranchSelect({ syllabusId, value, disabled, onChange }: Props) {
  const [options, setOptions] = useState<Option[]>([]);
  const [loadedFor, setLoadedFor] = useState("");

  useEffect(() => {
    let active = true;
    if (!syllabusId) {
      return;
    }
    void fetch(`/api/v1/academic-branches/options?syllabusId=${encodeURIComponent(syllabusId)}`, {
      cache: "no-store",
    })
      .then((response) => response.json())
      .then((result) => {
        if (active && result.success) {
          setOptions(result.data);
          setLoadedFor(syllabusId);
        }
      });
    return () => { active = false; };
  }, [syllabusId]);

  return (
    <Select
      value={value ?? ""}
      disabled={disabled || !syllabusId}
      onValueChange={onChange}
    >
      <SelectTrigger className="h-11 bg-background">
        <SelectValue placeholder={syllabusId ? "Select branch" : "Select syllabus first"} />
      </SelectTrigger>
      <SelectContent>
        {(loadedFor === syllabusId ? options : []).map((option) => (
          <SelectItem key={option.id} value={option.id}>
            {option.name}{option.code ? ` (${option.code})` : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
