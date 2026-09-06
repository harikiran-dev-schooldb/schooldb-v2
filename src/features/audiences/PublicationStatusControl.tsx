"use client";

import { useState, useTransition } from "react";

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

export function PublicationStatusControl({
  title,
  archived,
  action,
}: {
  title: string;
  archived: boolean;
  action: (archived: boolean) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function update(nextArchived: boolean) {
    startTransition(async () => {
      await action(nextArchived);
      setOpen(false);
    });
  }

  return (
    <>
      <div className="flex w-fit items-center gap-3 rounded-xl border bg-muted/30 px-3 py-2">
        <Switch checked={!archived} disabled={pending} onCheckedChange={() => setOpen(true)} aria-label={`Change publication status for ${title}`} />
        <span className="text-sm font-semibold">{archived ? "Archived" : "Published"}</span>
      </div>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change publication status?</AlertDialogTitle>
            <AlertDialogDescription>Choose whether “{title}” should be visible to its audience or kept in the archive.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={pending} className="bg-destructive text-white hover:bg-destructive/90" onClick={(event) => { event.preventDefault(); update(true); }}>Archive</AlertDialogAction>
            <AlertDialogAction disabled={pending} onClick={(event) => { event.preventDefault(); update(false); }}>Publish</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
