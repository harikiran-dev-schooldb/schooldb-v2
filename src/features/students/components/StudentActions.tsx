"use client";

import { useState } from "react";

import { Pencil } from "lucide-react";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

import { ActionMenu } from "@/components/common/actions/ActionMenu";

import { StudentDialog } from "./StudentDialog";

type Props = {
  studentId: string;
};

export function StudentActions({ studentId }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <ActionMenu>
        <DropdownMenuItem onClick={() => setOpen(true)}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
      </ActionMenu>

      <StudentDialog
        open={open}
        onOpenChange={setOpen}
        mode="edit"
        studentId={studentId}
      />
    </>
  );
}
