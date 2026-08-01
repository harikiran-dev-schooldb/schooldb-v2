"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

import { StudentDialog } from "./StudentDialog";

export function AddStudentButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="lg" className="shadow-md shadow-primary/20" onClick={() => setOpen(true)}><Plus /> Add student</Button>

      <StudentDialog open={open} onOpenChange={setOpen} mode="create" />
    </>
  );
}
