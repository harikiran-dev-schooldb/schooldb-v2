"use client";

import Link from "next/link";
import { useState } from "react";
import { Eye, Pencil, RefreshCw } from "lucide-react";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

import { ActionMenu } from "@/components/common/actions/ActionMenu";
import { StudentDialog } from "./StudentDialog";
import { StudentStatusDialog } from "./StudentStatusDialog";

type Props = {
  studentId: string;
};

export function StudentActions({ studentId }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  return (
    <>
      <ActionMenu>
        <DropdownMenuItem asChild>
          <Link href={`students/${studentId}`}>
            <Eye className="mr-2 h-4 w-4" />
            View Profile
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => setEditOpen(true)}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => setStatusOpen(true)}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Change Status
        </DropdownMenuItem>
      </ActionMenu>

      <StudentDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        studentId={studentId}
      />

      <StudentStatusDialog
        open={statusOpen}
        onOpenChange={setStatusOpen}
        studentId={studentId}
      />
    </>
  );
}
