"use client";

import { useState } from "react";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

import { HomeworkDialog } from "./HomeworkDialog";

export function AddHomeworkButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Add Homework
      </Button>

      <HomeworkDialog
        open={open}
        onOpenChange={setOpen}
        mode="create"
        onSuccess={() => {}}
      />
    </>
  );
}
