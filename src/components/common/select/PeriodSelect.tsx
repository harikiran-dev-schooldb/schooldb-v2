"use client";

import { RemoteCombobox } from "@/components/common/combobox/RemoteCombobox";

type Props = {
  value?: string;

  onChange: (value: string) => void;

  disabled?: boolean;

  placeholder?: string;
};

export function PeriodSelect({
  value,
  onChange,
  disabled,
  placeholder = "Select Period",
}: Props) {
  return (
    <RemoteCombobox
      url="/api/v1/periods/options"
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder={placeholder}
    />
  );
}
