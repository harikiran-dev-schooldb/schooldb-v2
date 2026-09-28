"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  IndianRupee,
  LoaderCircle,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatDate } from "@/lib/self-service-format";

type VerificationRow = {
  id: string;
  utr: string;
  amount: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
  student: {
    id: string;
    admissionNo: string;
    fullName: string | null;
    class: string;
    section: string;
  };
  installments: Array<{
    id: string;
    name: string;
    category: string;
    amount: number;
  }>;
  reviewedBy: string | null;
  receiptNo: string | null;
  feePaymentId: string | null;
};

export function DirectUpiVerificationTable({
  schoolSlug,
  rows,
}: {
  schoolSlug: string;
  rows: VerificationRow[];
}) {
  const router = useRouter();
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<VerificationRow | null>(null);
  const [reason, setReason] = useState("");

  const orderedRows = useMemo(
    () =>
      [...rows].sort((a, b) => {
        if (a.status === b.status) {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (a.status === "PENDING") return -1;
        if (b.status === "PENDING") return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }),
    [rows],
  );

  const pendingCount = rows.filter((row) => row.status === "PENDING").length;
  const pendingAmount = rows
    .filter((row) => row.status === "PENDING")
    .reduce((sum, row) => sum + row.amount, 0);

  async function review(
    row: VerificationRow,
    action: "APPROVE" | "REJECT",
    rejectionReason?: string,
  ) {
    setWorkingId(row.id);
    try {
      const response = await fetch(
        `/api/v1/direct-upi/submissions/${encodeURIComponent(row.id)}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            schoolSlug,
            action,
            ...(rejectionReason ? { reason: rejectionReason } : {}),
          }),
        },
      );
      const result = (await response.json()) as {
        success: boolean;
        message?: string;
      };
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to review this payment.");
      }

      toast.success(
        action === "APPROVE"
          ? "UPI payment verified and receipt created."
          : "UPI verification request rejected.",
      );
      setRejecting(null);
      setReason("");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to review this payment.",
      );
    } finally {
      setWorkingId(null);
    }
  }

  function openReject(row: VerificationRow) {
    setRejecting(row);
    setReason("");
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
              <Clock3 className="size-5" />
            </span>
            <div>
              <p className="text-2xl font-bold">{pendingCount}</p>
              <p className="text-sm text-muted-foreground">Awaiting verification</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <IndianRupee className="size-5" />
            </span>
            <div>
              <p className="text-2xl font-bold">{formatCurrency(pendingAmount)}</p>
              <p className="text-sm text-muted-foreground">Pending UPI amount</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {orderedRows.length ? (
        <div className="space-y-4">
          {orderedRows.map((row) => (
            <Card
              key={row.id}
              className={
                row.status === "PENDING"
                  ? "border-amber-200/80 shadow-[0_14px_40px_rgba(245,158,11,0.08)]"
                  : undefined
              }
            >
              <CardHeader className="gap-3 pb-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-base">
                      {row.student.fullName || row.student.admissionNo}
                    </CardTitle>
                    <Badge
                      variant={
                        row.status === "APPROVED"
                          ? "success"
                          : row.status === "REJECTED"
                            ? "destructive"
                            : "warning"
                      }
                    >
                      {row.status === "PENDING" ? "PENDING VERIFICATION" : row.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Adm. {row.student.admissionNo} · {row.student.class} {row.student.section}
                  </p>
                </div>
                <p className="text-xl font-bold">{formatCurrency(row.amount)}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 rounded-2xl bg-muted/30 p-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      UTR / reference
                    </p>
                    <p className="mt-1 font-mono text-sm font-semibold">{row.utr}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Submitted
                    </p>
                    <p className="mt-1 text-sm font-semibold">{formatDate(row.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Installments
                    </p>
                    <p className="mt-1 text-sm font-semibold">{row.installments.length}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {row.installments.map((installment) => (
                    <div
                      key={installment.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border/70 px-3 py-2 text-sm"
                    >
                      <span>
                        <span className="font-semibold">{installment.name}</span>
                        <span className="text-muted-foreground">
                          {" "}· {installment.category}
                        </span>
                      </span>
                      <span className="font-semibold">
                        {formatCurrency(installment.amount)}
                      </span>
                    </div>
                  ))}
                </div>

                {row.rejectionReason ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
                    <span className="font-semibold">Rejection reason:</span>{" "}
                    {row.rejectionReason}
                  </div>
                ) : null}

                {row.status === "APPROVED" && row.receiptNo && row.feePaymentId ? (
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <div className="flex items-center gap-2 text-sm text-emerald-900">
                      <ShieldCheck className="size-4" />
                      <span>
                        Verified
                        {row.reviewedBy ? ` by ${row.reviewedBy}` : ""} · Receipt {row.receiptNo}
                      </span>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/${schoolSlug}/fees/receipts/${row.feePaymentId}`}>
                        View receipt
                      </Link>
                    </Button>
                  </div>
                ) : null}

                {row.status === "PENDING" ? (
                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <Button
                      variant="outline"
                      onClick={() => openReject(row)}
                      disabled={workingId === row.id}
                      className="border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                    >
                      <XCircle className="size-4" />
                      Reject
                    </Button>
                    <Button
                      onClick={() => void review(row, "APPROVE")}
                      disabled={workingId === row.id}
                      className="bg-emerald-700 hover:bg-emerald-800"
                    >
                      {workingId === row.id ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="size-4" />
                      )}
                      Verify & create receipt
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No Direct UPI verification requests yet.
          </CardContent>
        </Card>
      )}

      <Dialog
        open={Boolean(rejecting)}
        onOpenChange={(open) => {
          if (!open) {
            setRejecting(null);
            setReason("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject UPI verification</DialogTitle>
            <DialogDescription>
              Enter why the bank credit could not be verified. The parent will
              see this reason on the Fees page.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Example: UTR not found in school bank statement"
            maxLength={500}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejecting(null);
                setReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!reason.trim() || !rejecting || workingId === rejecting?.id}
              onClick={() =>
                rejecting
                  ? void review(rejecting, "REJECT", reason.trim())
                  : undefined
              }
            >
              {workingId === rejecting?.id ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <XCircle className="size-4" />
              )}
              Reject payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
