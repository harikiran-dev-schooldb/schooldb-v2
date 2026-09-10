"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { CrudActions, CrudActionItem } from "@/components/common/crud";
import { refreshTable } from "@/lib/table-event";

import { HomeworkDialog } from "./HomeworkDialog";

type Props = {
  homeworkId: string;
  onSuccess?: () => void;
};

export function HomeworkActions({ homeworkId, onSuccess = () => {} }: Props) {
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const router = useRouter();
  const params = useParams();

  const schoolSlug = params.schoolSlug as string;

  async function handleDelete() {
    try {
      setDeleting(true);
      const response = await fetch(`/api/v1/homework/${homeworkId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success("Homework deleted successfully.");
      setDeleteOpen(false);

      refreshTable("homework");
      onSuccess();
    } catch {
      toast.error("Failed to delete homework.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <CrudActions>
        <CrudActionItem
          type="view"
          onClick={() => router.push(`/${schoolSlug}/homework/${homeworkId}`)}
        />

        <CrudActionItem type="edit" onClick={() => setOpen(true)} />

        <CrudActionItem type="delete" onClick={() => setDeleteOpen(true)} />
      </CrudActions>

      <HomeworkDialog
        open={open}
        onOpenChange={setOpen}
        mode="edit"
        homeworkId={homeworkId}
        onSuccess={onSuccess}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={(nextOpen) => {
          if (!deleting) setDeleteOpen(nextOpen);
        }}
        tone="destructive"
        eyebrow="Delete homework"
        title="Remove this homework?"
        description="Students and parents will no longer be able to view this homework."
        consequence="This action permanently deletes the homework and cannot be undone."
        confirmLabel="Delete homework"
        pending={deleting}
        onConfirm={() => void handleDelete()}
      />
    </>
  );
}
