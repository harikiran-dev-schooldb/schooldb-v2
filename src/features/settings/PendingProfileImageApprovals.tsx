"use client";

import { useState } from "react";
import { Check, Clock3, Loader2, UserCheck, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type PendingRequest = {
  id: string;
  studentName: string;
  admissionNo: string;
  submittedAt: string;
};

export function PendingProfileImageApprovals({
  schoolSlug,
  requests,
}: {
  schoolSlug: string;
  requests: PendingRequest[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function decide(requestId: string, decision: "approve" | "reject") {
    setBusyId(requestId);
    try {
      const response = await fetch(
        `/api/v1/settings/profile-image-requests/${requestId}?schoolSlug=${encodeURIComponent(schoolSlug)}`,
        { method: decision === "approve" ? "PATCH" : "DELETE" },
      );
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to save this decision.");
      }
      toast.success(
        decision === "approve"
          ? "Student profile image approved."
          : "Student profile image rejected.",
      );
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to save this decision.",
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="size-5 text-primary" />
              Student image approvals
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Review student-uploaded photos before they appear in SchoolDB.
            </p>
          </div>
          <Badge variant={requests.length ? "default" : "secondary"}>
            {requests.length} pending
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {requests.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {requests.map((request) => {
              const busy = busyId === request.id;
              const previewUrl = `/api/v1/settings/profile-image-requests/${request.id}/content?schoolSlug=${encodeURIComponent(schoolSlug)}`;
              return (
                <article
                  key={request.id}
                  className="flex flex-col gap-4 rounded-2xl border border-border/70 p-4 sm:flex-row"
                >
                  <Image
                    src={previewUrl}
                    alt={`${request.studentName} submitted profile`}
                    width={112}
                    height={112}
                    unoptimized
                    className="size-28 rounded-2xl border object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{request.studentName}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {request.admissionNo}
                    </p>
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock3 className="size-3.5" />
                      Submitted {request.submittedAt}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={busyId !== null}
                        onClick={() => void decide(request.id, "approve")}
                      >
                        {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                        Approve
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busyId !== null}
                        onClick={() => void decide(request.id, "reject")}
                      >
                        <X className="size-4" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No student profile images are waiting for approval.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
