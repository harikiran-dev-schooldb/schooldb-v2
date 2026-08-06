"use client";

import { RemoteCombobox } from "@/components/common/combobox/RemoteCombobox";

type Props = {
  value?: string;

  onChange: (value: string) => void;

  disabled?: boolean;

  placeholder?: string;
};

export function SubjectSelect({
  value,
  onChange,
  disabled,
  placeholder = "Select Subject",
}: Props) {
  return (
    <RemoteCombobox
      url="/api/v1/subjects/options"
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder={placeholder}
    />
  );
}
