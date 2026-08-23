"use client";

import { useState } from "react";

import { MoreHorizontal, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { SubjectDialog } from "./SubjectDialog";

type Props = {
  subjectId: string;
};

export function SubjectActions({ subjectId }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-9 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Subject actions"
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-40 rounded-xl p-1.5">
          <DropdownMenuItem
            onClick={() => setOpen(true)}
            className="cursor-pointer rounded-lg"
          >
            <Pencil className="mr-2 size-4" />
            Edit Subject
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SubjectDialog
        open={open}
        onOpenChange={setOpen}
        mode="edit"
        subjectId={subjectId}
      />
    </>
  );
}
