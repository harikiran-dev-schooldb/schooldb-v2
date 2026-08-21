"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { ActionMenu } from "@/components/common/actions/ActionMenu";

import { TeacherDialog } from "./TeacherDialog";

type Props = {
  teacherId: string;
};

export function TeacherActions({ teacherId }: Props) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
      <ActionMenu>
        <DropdownMenuItem onClick={() => setEditOpen(true)}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
      </ActionMenu>

      <TeacherDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        teacherId={teacherId}
      />
    </>
  );
}
