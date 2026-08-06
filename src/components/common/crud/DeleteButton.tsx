"use client";

import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

type Props = {
  loading?: boolean;
  onClick: () => void;
};

export function DeleteButton({ loading, onClick }: Props) {
  return (
    <Button
      type="button"
      variant="destructive"
      disabled={loading}
      onClick={onClick}
    >
      <Trash2 className="mr-2 h-4 w-4" />
      Delete
    </Button>
  );
}
