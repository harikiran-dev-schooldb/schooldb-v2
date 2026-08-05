"use client";

import { Button } from "@/components/ui/button";

type Props = {
  loading: boolean;

  mode: "create" | "edit";

  createLabel: string;

  updateLabel: string;

  className?: string;
};

export function SubmitButton({
  loading,
  mode,
  createLabel,
  updateLabel,
  className,
}: Props) {
  return (
    <Button type="submit" disabled={loading} className={className}>
      {loading ? "Saving..." : mode === "create" ? createLabel : updateLabel}
    </Button>
  );
}
