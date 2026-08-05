"use client";

import { ReactNode } from "react";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

type Props = {
  label: string;

  onClick: () => void;

  icon?: ReactNode;
};

export function CreateButton({ label, onClick, icon }: Props) {
  return (
    <Button onClick={onClick}>
      {icon ?? <Plus className="mr-2 h-4 w-4" />}

      {label}
    </Button>
  );
}
