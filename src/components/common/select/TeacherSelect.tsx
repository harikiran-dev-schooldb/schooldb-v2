"use client";

import { RemoteCombobox } from "@/components/common/combobox/RemoteCombobox";

type Props = {
  value?: string;

  onChange: (value: string) => void;

  disabled?: boolean;

  placeholder?: string;
};

export function TeacherSelect({
  value,
  onChange,
  disabled,
  placeholder = "Select Teacher",
}: Props) {
  return (
    <RemoteCombobox
      url="/api/v1/teachers/options"
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder={placeholder}
    />
  );
}
