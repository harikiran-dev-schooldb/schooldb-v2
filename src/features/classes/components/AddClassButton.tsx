"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ClassDialog } from "./ClassDialog";

export function AddClassButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        size="lg"
        className="h-11 rounded-xl px-5 font-semibold shadow-lg shadow-primary/20"
        onClick={() => setOpen(true)}
      >
        <Plus className="size-4" />
        Add Class
      </Button>

      <ClassDialog open={open} onOpenChange={setOpen} mode="create" />
    </>
  );
}
