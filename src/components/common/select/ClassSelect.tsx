"use client";

import { useEffect, useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ClassOption = {
  id: string;
  label: string;
};

type Props = {
  value?: string;
  disabled?: boolean;
  allowAll?: boolean;
  placeholder?: string;
  triggerClassName?: string;
  onChange: (value: string) => void;
};

export function ClassSelect({
  value,
  disabled,
  allowAll = false,
  placeholder = "Select Class",
  triggerClassName,
  onChange,
}: Props) {
  const [classes, setClasses] = useState<ClassOption[]>([]);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/v1/classes/options");

      const result = await res.json();

      if (result.success) {
        setClasses(result.data);
      }
    }

    load();
  }, []);

  return (
    <Select
      value={value ?? ""}
      disabled={disabled}
      onValueChange={(nextValue) =>
        onChange(nextValue === "ALL" ? "" : nextValue)
      }
    >
      <SelectTrigger className={triggerClassName}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>

      <SelectContent>
        {allowAll && <SelectItem value="ALL">All Classes</SelectItem>}

        {classes.map((item) => (
          <SelectItem key={item.id} value={item.id}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
