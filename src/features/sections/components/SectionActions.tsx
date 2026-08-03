"use client";

import { useState } from "react";

import Link from "next/link";

import { Eye, Pencil } from "lucide-react";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

import { ActionMenu } from "@/components/common/actions/ActionMenu";
import { ClassDialog } from "./SectionDialog";

type Props = {
  classId: string;
};

export function ClassActions({ classId }: Props) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
      <ActionMenu>
        <DropdownMenuItem asChild>
          <Link href={`classes/${classId}`}>
            <Eye className="mr-2 h-4 w-4" />
            View
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => setEditOpen(true)}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
      </ActionMenu>

      <ClassDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        classId={classId}
      />
    </>
  );
}
