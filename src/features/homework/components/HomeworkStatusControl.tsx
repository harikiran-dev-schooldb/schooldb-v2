"use client";

import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { refreshTable } from "@/lib/table-event";

export function HomeworkStatusControl({
  homeworkId,
  title,
  active,
}: {
  homeworkId: string;
  title: string;
  active: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function update(nextActive: boolean) {
    try {
      setSaving(true);
      const response = await fetch(`/api/v1/homework/${homeworkId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: nextActive }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.message || "Failed to update homework status.");
        return;
      }

      toast.success(nextActive ? "Homework published." : "Homework archived.");
      refreshTable("homework");
      setOpen(false);
    } catch {
      toast.error("Failed to update homework status.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="flex w-fit items-center gap-3 rounded-xl border bg-muted/30 px-3 py-2">
        <Switch
          checked={active}
          disabled={saving}
          onCheckedChange={() => setOpen(true)}
          aria-label={`Change publication status for ${title}`}
        />
        <span className="text-sm font-semibold">
          {active ? "Published" : "Archived"}
        </span>
      </div>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change homework status?</AlertDialogTitle>
            <AlertDialogDescription>
              Choose whether “{title}” should be visible to students or kept in
              the archive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={saving}
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                void update(false);
              }}
            >
              Archive
            </AlertDialogAction>
            <AlertDialogAction
              disabled={saving}
              onClick={(event) => {
                event.preventDefault();
                void update(true);
              }}
            >
              Publish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
