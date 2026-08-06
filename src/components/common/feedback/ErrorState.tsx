"use client";

import { TriangleAlert } from "lucide-react";

type Props = {
  message?: string;
};

export function ErrorState({ message = "Something went wrong." }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <TriangleAlert className="mb-4 h-10 w-10 text-destructive" />

      <h3 className="text-lg font-semibold">Error</h3>

      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
