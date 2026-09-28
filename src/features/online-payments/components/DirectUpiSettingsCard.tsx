"use client";

import { useState } from "react";
import { Landmark, Save, Smartphone } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { isValidUpiId } from "../direct-upi";

export function DirectUpiSettingsCard({
  schoolSlug,
  schoolName,
  initialEnabled,
  initialUpiId,
  initialPayeeName,
}: {
  schoolSlug: string;
  schoolName: string;
  initialEnabled: boolean;
  initialUpiId: string;
  initialPayeeName: string;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [upiId, setUpiId] = useState(initialUpiId);
  const [payeeName, setPayeeName] = useState(initialPayeeName || schoolName);
  const [saving, setSaving] = useState(false);

  async function save() {
    const normalizedUpiId = upiId.trim();
    const normalizedPayeeName = payeeName.trim() || schoolName;

    if (enabled && !isValidUpiId(normalizedUpiId)) {
      toast.error("Enter a valid school UPI ID, for example school@bank.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/v1/payment-settings/direct-upi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolSlug,
          enabled,
          upiId: normalizedUpiId,
          payeeName: normalizedPayeeName,
        }),
      });
      const result = (await response.json()) as {
        success: boolean;
        message?: string;
        data?: {
          directUpiEnabled: boolean;
          directUpiId: string | null;
          directUpiPayeeName: string | null;
        };
      };
      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.message || "Unable to save Direct UPI settings.");
      }

      setEnabled(result.data.directUpiEnabled);
      setUpiId(result.data.directUpiId ?? "");
      setPayeeName(result.data.directUpiPayeeName ?? schoolName);
      toast.success("Direct UPI settings saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save Direct UPI settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Landmark className="size-5 text-emerald-600" />
          Direct UPI collection
        </CardTitle>
        <CardDescription>
          Let parents pay the school UPI ID directly without opening the Cashfree gateway.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border p-4">
          <Checkbox
            checked={enabled}
            onCheckedChange={(value) => setEnabled(value === true)}
            className="mt-0.5"
          />
          <span>
            <span className="block font-semibold">Enable Direct UPI</span>
            <span className="mt-1 block text-sm leading-5 text-muted-foreground">
              Parents will see a QR code and an Open UPI app button on the fee page.
            </span>
          </span>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold">School UPI ID</span>
            <Input
              value={upiId}
              onChange={(event) => setUpiId(event.target.value)}
              placeholder="school@bank"
              autoComplete="off"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold">Payee name</span>
            <Input
              value={payeeName}
              onChange={(event) => setPayeeName(event.target.value)}
              placeholder={schoolName}
              maxLength={160}
            />
          </label>
        </div>

        <div className="flex items-start gap-3 rounded-2xl bg-muted/35 p-4 text-sm leading-6 text-muted-foreground">
          <Smartphone className="mt-0.5 size-4 shrink-0" />
          <p>
            Direct UPI bypasses the payment gateway. SchoolDB does not automatically confirm these payments; the school should verify the bank credit/UTR before recording the fee as paid.
          </p>
        </div>

        <Button type="button" onClick={() => void save()} disabled={saving}>
          <Save className="size-4" />
          {saving ? "Saving…" : "Save Direct UPI"}
        </Button>
      </CardContent>
    </Card>
  );
}
