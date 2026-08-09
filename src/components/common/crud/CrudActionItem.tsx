"use client";

import { Eye, Pencil, Trash2 } from "lucide-react";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

type Props = {
  type: "view" | "edit" | "delete";
  onClick: () => void;
};

export function CrudActionItem({ type, onClick }: Props) {
  if (type === "view") {
    return (
      <DropdownMenuItem onClick={onClick}>
        <Eye className="mr-2 h-4 w-4" />
        View
      </DropdownMenuItem>
    );
  }

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
