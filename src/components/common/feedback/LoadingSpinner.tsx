"use client";

import { Loader2 } from "lucide-react";

type Props = {
  text?: string;
};

export function LoadingSpinner({ text = "Loading..." }: Props) {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
      <span>{text}</span>
    </div>
  );
}
