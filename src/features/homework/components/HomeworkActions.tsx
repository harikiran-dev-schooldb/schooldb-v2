"use client";

import { useState } from "react";
import { toast } from "sonner";

import { CrudActions, CrudActionItem } from "@/components/common/crud";

import { HomeworkDialog } from "./HomeworkDialog";

type Props = {
  homeworkId: string;
  onSuccess?: () => void;
};

export function HomeworkActions({ homeworkId, onSuccess = () => {} }: Props) {
  const [open, setOpen] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm(
      "Are you sure you want to delete this homework?",
    );

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/v1/homework/${homeworkId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success("Homework deleted successfully.");

      onSuccess();
    } catch {
      toast.error("Failed to delete homework.");
    }
  }

  return (
    <>
      <CrudActions>
        <CrudActionItem type="edit" onClick={() => setOpen(true)} />

        <CrudActionItem type="delete" onClick={handleDelete} />
      </CrudActions>

      <HomeworkDialog
        open={open}
        onOpenChange={setOpen}
        mode="edit"
        homeworkId={homeworkId}
        onSuccess={onSuccess}
      />
    </>
  );
}
