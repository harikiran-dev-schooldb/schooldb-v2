"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ReconciliationRow = {
  providerOrderId: string;
  providerPaymentId: string | null;
  amount: number;
  status: string;
  failureReason: string | null;
  updatedAt: string;
  refunds: Array<{
    providerRefundId: string;
    amount: number;
    status: string;
    statusDescription: string | null;
    refundArn: string | null;
  }>;
};

export function CashfreeReconciliationPanel({ schoolSlug }: { schoolSlug: string }) {
  const [rows, setRows] = useState<ReconciliationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const endpoint = `/api/v1/online-payments/cashfree/staff/reconciliation?schoolSlug=${encodeURIComponent(schoolSlug)}`;
  const load = useCallback(async () => {
    if (!schoolSlug) return;
    setLoading(true);
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Unable to load Cashfree reconciliation.");
      setRows(result.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load Cashfree reconciliation.");
    } finally {
      setLoading(false);
    }
  }, [endpoint, schoolSlug]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  async function reconcile() {
    setSyncing(true);
    try {
      const response = await fetch(endpoint, { method: "POST" });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Cashfree reconciliation failed.");
      const failed = (result.data as Array<{ success: boolean }>).filter((item) => !item.success).length;
      if (failed) {
        toast.error(`${failed} Cashfree order${failed === 1 ? "" : "s"} still need review.`);
      } else {
        toast.success(result.message);
      }
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Cashfree reconciliation failed.");
    } finally {
      setSyncing(false);
    }
  }

  if (!schoolSlug) return null;

  return (
    <Card className="border-amber-200/70 bg-amber-50/30">
      <CardHeader className="flex-row items-center justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="size-4 text-amber-700" />Cashfree reconciliation</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">Failed, pending, and review-required gateway records appear here.</p>
        </div>
        <Button type="button" variant="outline" size="sm" disabled={loading || syncing} onClick={() => void reconcile()}>
          {loading || syncing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          Reconcile now
        </Button>
      </CardHeader>
      {rows.length ? (
        <CardContent className="space-y-2">
          {rows.map((row) => (
            <div key={row.providerOrderId} className="flex flex-col gap-2 rounded-xl border bg-background p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate font-mono text-xs font-semibold">{row.providerOrderId}</p>
                <p className="mt-1 text-xs text-muted-foreground">{row.failureReason || row.refunds[0]?.statusDescription || "Awaiting provider confirmation"}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">₹{row.amount.toLocaleString("en-IN")}</span>
                <Badge variant="outline">{row.refunds[0] ? `REFUND ${row.refunds[0].status}` : row.status}</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      ) : loading ? null : (
        <CardContent><p className="text-sm text-muted-foreground">No Cashfree exceptions require attention.</p></CardContent>
      )}
    </Card>
  );
}
