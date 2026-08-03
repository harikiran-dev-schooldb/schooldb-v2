"use client";

import { useState } from "react";

import { Pencil } from "lucide-react";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

import { ActionMenu } from "@/components/common/actions/ActionMenu";

import { SectionDialog } from "./SectionDialog";

type Props = {
  sectionId: string;
};

export function SectionActions({ sectionId }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <ActionMenu>
        <DropdownMenuItem onClick={() => setOpen(true)}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
      </ActionMenu>

      <SectionDialog
        open={open}
        onOpenChange={setOpen}
        mode="edit"
        sectionId={sectionId}
      />
    </>
  );
}
