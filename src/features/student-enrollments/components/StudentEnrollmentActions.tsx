"use client";

import { useState } from "react";

import { Pencil } from "lucide-react";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

import { ActionMenu } from "@/components/common/actions/ActionMenu";

import { StudentEnrollmentDialog } from "./StudentEnrollmentDialog";

type Props = {
  enrollmentId: string;
};

export function StudentEnrollmentActions({ enrollmentId }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <ActionMenu>
        <DropdownMenuItem onClick={() => setOpen(true)}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
      </ActionMenu>

      <StudentEnrollmentDialog
        open={open}
        onOpenChange={setOpen}
        mode="edit"
        enrollmentId={enrollmentId}
      />
    </>
  );
}
