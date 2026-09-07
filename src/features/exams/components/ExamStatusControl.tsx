"use client";

import { useState } from "react";
import { CheckCircle2, Send } from "lucide-react";
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
import { Button } from "@/components/ui/button";

export function ExamStatusControl({
  examId,
  examName,
  status,
  onUpdated,
}: {
  examId: string;
  examName: string;
  status: string;
  onUpdated: () => Promise<void>;
}) {
  const [nextStatus, setNextStatus] = useState<"PUBLISHED" | "COMPLETED" | null>(null);
  const [saving, setSaving] = useState(false);

  async function updateStatus() {
    if (!nextStatus) return;
    try {
      setSaving(true);
      const response = await fetch(`/api/v1/exams/${examId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        toast.error(result.message || "Unable to update exam status.");
        return;
      }
      toast.success(nextStatus === "COMPLETED" ? "Results published and WhatsApp alerts queued." : "Exam schedule published.");
      setNextStatus(null);
      await onUpdated();
    } catch {
      toast.error("Unable to update exam status.");
    } finally {
      setSaving(false);
    }
  }

  if (status === "COMPLETED") {
    return <Button variant="outline" disabled><CheckCircle2 className="mr-2 size-4" />Results published</Button>;
  }

  if (status === "CANCELLED") {
    return <Button variant="outline" disabled>Exam cancelled</Button>;
  }

  const target = status === "DRAFT" ? "PUBLISHED" : "COMPLETED";
  return (
    <>
      <Button onClick={() => setNextStatus(target)}>
        <Send className="mr-2 size-4" />
        {target === "PUBLISHED" ? "Publish schedule" : "Publish results"}
      </Button>
      <AlertDialog open={nextStatus !== null} onOpenChange={(open) => !open && setNextStatus(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{target === "PUBLISHED" ? "Publish exam schedule?" : "Publish exam results?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {target === "PUBLISHED"
                ? `“${examName}” will become visible to students.`
                : `Completed results for “${examName}” will become visible and opted-in families will receive a WhatsApp alert.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={saving} onClick={(event) => { event.preventDefault(); void updateStatus(); }}>
              {saving ? "Publishing…" : "Confirm publish"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
