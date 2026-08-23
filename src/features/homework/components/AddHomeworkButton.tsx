"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

import { HomeworkDialog } from "./HomeworkDialog";

type Props = {
  onSuccess?: () => void;
};

export function AddHomeworkButton({ onSuccess }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} className="shrink-0">
        <Plus className="mr-2 size-4" />
        Add Homework
      </Button>

      <HomeworkDialog
        open={open}
        onOpenChange={setOpen}
        mode="create"
        onSuccess={() => {
          onSuccess?.();
        }}
      />
    </>
  );
}
