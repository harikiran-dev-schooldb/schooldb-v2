"use client";

import { useEffect, useRef, useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Option = { id: string; name: string; code: string | null };

type Props = {
  value?: string;
  disabled?: boolean;
  allowAll?: boolean;
  triggerClassName?: string;
  onChange: (value: string) => void;
};

export function SyllabusSelect({
  value,
  disabled,
  allowAll = false,
  triggerClassName,
  onChange,
}: Props) {
  const [options, setOptions] = useState<Option[]>([]);
  const hasAppliedDefault = useRef(false);

  useEffect(() => {
    let active = true;
    void fetch("/api/v1/syllabi/options", { cache: "no-store" })
      .then((response) => response.json())
      .then((result) => {
        if (active && result.success) setOptions(result.data);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (options.length !== 1 || hasAppliedDefault.current) {
      return;
    }

    hasAppliedDefault.current = true;
    if (!value) {
      onChange(options[0].id);
    }
  }, [onChange, options, value]);

  return (
    <Select
      value={value || (allowAll ? "ALL" : "")}
      disabled={disabled}
      onValueChange={(nextValue) => onChange(nextValue === "ALL" ? "" : nextValue)}
    >
      <SelectTrigger className={triggerClassName ?? "h-11 bg-background"}>
        <SelectValue placeholder={allowAll ? "All syllabi" : "Select syllabus"} />
      </SelectTrigger>
      <SelectContent>
        {allowAll && <SelectItem value="ALL">All syllabi</SelectItem>}
        {options.map((option) => (
          <SelectItem key={option.id} value={option.id}>
            {option.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
