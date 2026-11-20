"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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
import { useSchool } from "@/contexts/school-context";
import { hasModuleAccess } from "@/lib/staff-permissions";
import { refreshTable } from "@/lib/table-event";
import { canOverrideExamPublish, requiresPublishOverride, type PublishChecklist } from "../publish-checklist";

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
  const { school, role, membership } = useSchool();
  const canOverride = canOverrideExamPublish(role);
  const canManage = canOverride || (
    membership.customPermissionsEnabled && hasModuleAccess(membership, "LEARNING", "MANAGE")
  );
  const [nextStatus, setNextStatus] = useState<
    "PUBLISHED" | "COMPLETED" | null
  >(null);
  const [saving, setSaving] = useState(false);
  const [checklist, setChecklist] = useState<PublishChecklist | null>(null);
  const [loadingChecklist, setLoadingChecklist] = useState(false);
  const [checklistError, setChecklistError] = useState<string | null>(null);
  const [overrideReason, setOverrideReason] = useState("");
  const checklistRequest = useRef<AbortController | null>(null);
  const overrideRequired = checklist !== null && requiresPublishOverride(checklist);

  useEffect(() => () => checklistRequest.current?.abort(), [examId]);

  async function loadChecklist() {
    checklistRequest.current?.abort();
    const controller = new AbortController();
    checklistRequest.current = controller;
    setLoadingChecklist(true);
    setChecklist(null);
    setChecklistError(null);
    setOverrideReason("");

    try {
      const response = await fetch(`/api/v1/exams/${examId}/publish-checklist`, {
        cache: "no-store",
        signal: controller.signal,
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to load the publish checklist.");
      }
      if (!controller.signal.aborted) setChecklist(result.data);
    } catch (error) {
      if (!controller.signal.aborted) {
        setChecklistError(error instanceof Error ? error.message : "Unable to load the publish checklist.");
      }
    } finally {
      if (!controller.signal.aborted) setLoadingChecklist(false);
    }
  }

  function close() {
    checklistRequest.current?.abort();
    setNextStatus(null);
    setOverrideReason("");
  }

  async function updateStatus() {
    if (!nextStatus) return;
    try {
      setSaving(true);
      const response = await fetch(`/api/v1/exams/${examId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
          ...(nextStatus === "COMPLETED" && checklist && overrideRequired && canOverride && {
            publishOverride: { reason: overrideReason, reviewKey: checklist.reviewKey },
          }),
        }),
      });
      const result = await response.json();
      if (response.status === 409 && result.checklist) {
        setChecklist(result.checklist);
        setOverrideReason("");
        toast.error(result.message);
        return;
      }
      if (!response.ok || !result.success) {
        toast.error(result.message || "Unable to update exam status.");
        return;
      }
      toast.success(
        nextStatus === "COMPLETED"
          ? "Results published."
          : "Exam schedule published.",
      );
      refreshTable("exams");
      close();
      await onUpdated();
    } catch {
      toast.error("Unable to update exam status.");
    } finally {
      setSaving(false);
    }
  }

  if (status === "COMPLETED") {
    return (
      <Button variant="outline" disabled>
        <CheckCircle2 className="mr-2 size-4" />
        Results published
      </Button>
    );
  }

  if (status === "CANCELLED") {
    return (
      <Button variant="outline" disabled>
        Exam cancelled
      </Button>
    );
  }

  if (!canManage) return null;

  const target = status === "DRAFT" ? "PUBLISHED" : "COMPLETED";
  return (
    <>
      <Button onClick={() => {
        setNextStatus(target);
        if (target === "COMPLETED") void loadChecklist();
      }}>
        <Send className="mr-2 size-4" />
        {target === "PUBLISHED" ? "Publish schedule" : "Publish results"}
      </Button>
      <AlertDialog
        open={nextStatus !== null}
        onOpenChange={(open) => { if (!open && !saving) close(); }}
      >
        <AlertDialogContent className={target === "COMPLETED" ? "max-w-xl" : undefined}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {target === "PUBLISHED"
                ? "Publish exam schedule?"
                : "Publish exam results?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {target === "PUBLISHED"
                ? `“${examName}” will become visible to students.`
                : `Publishing makes results for “${examName}” visible to students and families.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {target === "COMPLETED" && (
            <div className="space-y-4">
              {loadingChecklist && <p role="status" className="text-sm text-muted-foreground">Checking marks and grades…</p>}
              {checklistError && (
                <div className="space-y-2 rounded-lg border border-destructive/30 p-3">
                  <p role="alert" className="text-sm text-destructive">{checklistError}</p>
                  <Button variant="outline" size="sm" onClick={() => void loadChecklist()}>Retry checklist</Button>
                </div>
              )}
              {checklist && (
                <>
                  <p className="text-sm" role="status">
                    {checklist.expectedCount === 0
                      ? checklist.scheduleCount === 0
                        ? "This exam has no schedules."
                        : "This exam has no active students in the scheduled sections."
                      : checklist.missingCount === 0
                        ? `All ${checklist.expectedCount} expected entries are complete.`
                        : `${checklist.missingCount} of ${checklist.expectedCount} expected entries are missing.`}
                  </p>
                  {checklist.groups.length > 0 && (
                    <ul aria-label="Missing marks and grades" className="max-h-56 divide-y overflow-y-auto rounded-lg border">
                      {checklist.groups.map((group) => (
                        <li key={`${group.scheduleId}:${group.sectionId}`} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                          <div>
                            <p className="font-medium">{group.subjectName}</p>
                            <p className="text-xs text-muted-foreground">
                              {group.className} · {group.sectionName} · {group.missingCount} of {group.expectedCount} missing
                            </p>
                          </div>
                          <Button asChild variant="outline" size="sm">
                            <Link
                              href={`/${school.slug}/exams/${examId}/schedules/${group.scheduleId}/marks?${new URLSearchParams({ sectionId: group.sectionId })}`}
                              aria-label={`Enter ${group.subjectName} ${group.assessmentType === "GRADE" ? "grades" : "marks"} for ${group.className}, ${group.sectionName}`}
                              onClick={close}
                            >
                              Enter {group.assessmentType === "GRADE" ? "grades" : "marks"}
                            </Link>
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {overrideRequired && (canOverride ? (
                    <label className="block space-y-1.5 text-sm font-medium">
                      <span>Reason for publishing incomplete results</span>
                      <textarea
                        className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={overrideReason}
                        onChange={(event) => setOverrideReason(event.target.value)}
                        maxLength={500}
                        disabled={saving}
                        required
                      />
                    </label>
                  ) : <p className="text-sm text-muted-foreground">An administrator must approve publishing incomplete results.</p>)}
                </>
              )}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={saving || (target === "COMPLETED" && (
                !checklist || (overrideRequired && (!canOverride || !overrideReason.trim()))
              ))}
              onClick={(event) => {
                event.preventDefault();
                void updateStatus();
              }}
            >
              {saving ? "Publishing…" : overrideRequired ? "Publish incomplete results" : "Confirm publish"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
