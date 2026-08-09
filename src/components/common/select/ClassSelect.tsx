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
  onChange: (value: string) => void;
};

export function ClassSelect({ value, onChange }: Props) {
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
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Select Class" />
      </SelectTrigger>

      <SelectContent>
        {classes.map((item) => (
          <SelectItem key={item.id} value={item.id}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
