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
        <DropdownMenuItem
          asChild
          className="group cursor-pointer rounded-lg px-3 py-2.5 font-medium focus:bg-primary/5 focus:text-primary"
        >
          <Link href={`students/${studentId}`}>
            <div className="mr-3 flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform group-hover:scale-105">
              <Eye className="size-3.5" />
            </div>
            <span>View Profile</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => setEditOpen(true)}
          className="group cursor-pointer rounded-lg px-3 py-2.5 font-medium focus:bg-blue-50 focus:text-blue-700"
        >
          <div className="mr-3 flex size-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 transition-transform group-hover:scale-105">
            <Pencil className="size-3.5" />
          </div>
          <span>Edit Student</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => setStatusOpen(true)}
          className="group cursor-pointer rounded-lg px-3 py-2.5 font-medium focus:bg-amber-50 focus:text-amber-700"
        >
          <div className="mr-3 flex size-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600 transition-transform group-hover:scale-105">
            <RefreshCw className="size-3.5 transition-transform duration-300 group-hover:rotate-180" />
          </div>
          <span>Change Status</span>
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
