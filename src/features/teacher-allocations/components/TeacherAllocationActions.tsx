"use client";

import { useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Button } from "@/components/ui/button";

import { MoreHorizontal, Pencil } from "lucide-react";

import { TeacherAllocationDialog } from "./TeacherAllocationDialog";

type Props = {
  allocationId: string;
};

export function TeacherAllocationActions({ allocationId }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <TeacherAllocationDialog
        open={open}
        onOpenChange={setOpen}
        mode="edit"
        allocationId={allocationId}
      />
    </>
  );
}
