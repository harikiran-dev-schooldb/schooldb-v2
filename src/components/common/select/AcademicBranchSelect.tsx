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
  allowAll?: boolean;
  triggerClassName?: string;
  onChange: (value: string) => void;
};

export function AcademicBranchSelect({
  syllabusId,
  value,
  disabled,
  allowAll = false,
  triggerClassName,
  onChange,
}: Props) {
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
      value={syllabusId ? (value || (allowAll ? "ALL" : "")) : ""}
      disabled={disabled || !syllabusId}
      onValueChange={(nextValue) => onChange(nextValue === "ALL" ? "" : nextValue)}
    >
      <SelectTrigger className={triggerClassName ?? "h-11 bg-background"}>
        <SelectValue placeholder={syllabusId ? (allowAll ? "All branches" : "Select branch") : "Select syllabus first"} />
      </SelectTrigger>
      <SelectContent>
        {allowAll && syllabusId && <SelectItem value="ALL">All branches</SelectItem>}
        {(loadedFor === syllabusId ? options : []).map((option) => (
          <SelectItem key={option.id} value={option.id}>
            {option.name}{option.code ? ` (${option.code})` : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
