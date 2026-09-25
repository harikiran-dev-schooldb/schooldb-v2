"use client";

import { useEffect } from "react";

import {
  RemoteCombobox,
  type RemoteComboboxOption,
} from "@/components/common/combobox/RemoteCombobox";

type AcademicYearOption = RemoteComboboxOption & {
  active?: boolean;
};

type Props = {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoSelectActive?: boolean;
};

export function AcademicYearSelect({
  value,
  onChange,
  disabled,
  autoSelectActive = true,
}: Props) {
  useEffect(() => {
    if (!autoSelectActive || value) return;

    let active = true;

    async function selectActiveYear() {
      try {
        const response = await fetch("/api/v1/academic-years/options", {
          cache: "no-store",
        });
        const result = await response.json();

        if (!active || !response.ok || !result.success) return;

        const options: AcademicYearOption[] = Array.isArray(result.data)
          ? result.data
          : [];
        const activeYear = options.find((option) => option.active);

        if (activeYear) {
          onChange(activeYear.id);
        }
      } catch {
        // Keep the selector empty when academic years cannot be loaded.
      }
    }

    void selectActiveYear();

    return () => {
      active = false;
    };
  }, [autoSelectActive, onChange, value]);

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
