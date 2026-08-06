"use client";

import { RemoteCombobox } from "@/components/common/combobox/RemoteCombobox";

type Props = {
  value?: string;

  onChange: (value: string) => void;

  disabled?: boolean;

  placeholder?: string;
};

export function TeacherAllocationSelect({
  value,
  onChange,
  disabled,
  placeholder = "Select Teacher Allocation",
}: Props) {
  return (
    <RemoteCombobox
      url="/api/v1/teacher-allocations/options"
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder={placeholder}
    />
  );
}
