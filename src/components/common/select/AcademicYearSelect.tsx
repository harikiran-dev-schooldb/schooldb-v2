"use client";

import { RemoteCombobox } from "@/components/common/combobox/RemoteCombobox";

type Props = {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function AcademicYearSelect({ value, onChange, disabled }: Props) {
  return (
    <RemoteCombobox
      url="/api/v1/academic-years/options"
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder="Academic Year"
    />
  );
}
