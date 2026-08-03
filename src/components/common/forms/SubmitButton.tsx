"use client";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

type Props = {
  loading: boolean;

  mode: "create" | "edit";

  createText: string;

  updateText: string;

  className?: string;
};

export function SubmitButton({
  loading,
  mode,
  createText,
  updateText,
  className,
}: Props) {
  return (
    <Button type="submit" disabled={loading} className={className}>
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}

      {loading ? "Saving..." : mode === "create" ? createText : updateText}
    </Button>
  );
}
