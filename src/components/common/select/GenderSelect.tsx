"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  value?: "MALE" | "FEMALE" | "OTHER";
  onChange: (value: "MALE" | "FEMALE" | "OTHER") => void;
};

export function GenderSelect({ value, onChange }: Props) {
  return (
    <Select
      value={value}
      onValueChange={(value) => onChange(value as "MALE" | "FEMALE" | "OTHER")}
    >
      <SelectTrigger>
        <SelectValue placeholder="Select Gender" />
      </SelectTrigger>

      <SelectContent>
        <SelectItem value="MALE">Male</SelectItem>

        <SelectItem value="FEMALE">Female</SelectItem>

        <SelectItem value="OTHER">Other</SelectItem>
      </SelectContent>
    </Select>
  );
}
