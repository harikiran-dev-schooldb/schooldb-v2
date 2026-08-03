"use client";

import { StudentStatus } from "@/generated/prisma/client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  value?: StudentStatus;
  onChange: (value: StudentStatus) => void;
  disabled?: boolean;
};

const options = [
  {
    value: StudentStatus.ACTIVE,
    label: "Active",
  },
  {
    value: StudentStatus.INACTIVE,
    label: "Inactive",
  },
  {
    value: StudentStatus.TC_ISSUED,
    label: "TC Issued",
  },
  {
    value: StudentStatus.DROPPED,
    label: "Dropped",
  },
  {
    value: StudentStatus.ALUMNI,
    label: "Alumni",
  },
  {
    value: StudentStatus.NOT_COMING,
    label: "Not Coming",
  },
];

export function StudentStatusSelect({ value, onChange, disabled }: Props) {
  return (
    <Select
      value={value}
      onValueChange={(value) => onChange(value as StudentStatus)}
      disabled={disabled}
    >
      <SelectTrigger>
        <SelectValue placeholder="Select Status" />
      </SelectTrigger>

      <SelectContent>
        {options.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
