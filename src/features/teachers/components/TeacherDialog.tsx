"use client";

import { useRouter } from "next/navigation";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { TeacherForm } from "./TeacherForm";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  teacherId?: string;
};

export function TeacherDialog({ open, onOpenChange, mode, teacherId }: Props) {
  const router = useRouter();

  function handleSuccess() {
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Add Teacher" : "Edit Teacher"}
          </DialogTitle>
        </DialogHeader>

        <TeacherForm
          mode={mode}
          teacherId={teacherId}
          onSuccess={handleSuccess}
        />
      </DialogContent>
    </Dialog>
  );
}
