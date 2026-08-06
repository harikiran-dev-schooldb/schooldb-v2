"use client";

import { Pencil, Trash2 } from "lucide-react";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

type Props = {
  type: "edit" | "delete";
  onClick: () => void;
};

export function CrudActionItem({ type, onClick }: Props) {
  if (type === "edit") {
    return (
      <DropdownMenuItem onClick={onClick}>
        <Pencil className="mr-2 h-4 w-4" />
        Edit
      </DropdownMenuItem>
    );
  }

  return (
    <DropdownMenuItem onClick={onClick}>
      <Trash2 className="mr-2 h-4 w-4" />
      Delete
    </DropdownMenuItem>
  );
}
