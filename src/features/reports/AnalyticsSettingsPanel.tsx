"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Save, Settings2, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { AnalyticsSettingsInput } from "@/features/reports/analytics-settings";

type NumericSetting = Exclude<keyof AnalyticsSettingsInput, "lateCountsAsPresent">;

const fields: Array<{
  key: NumericSetting;
  label: string;
  suffix: string;
  min: number;
  max: number;
}> = [
  { key: "lowAttendanceThreshold", label: "Low-attendance alert", suffix: "%", min: 1, max: 100 },
  { key: "attendanceTarget", label: "Attendance target", suffix: "%", min: 1, max: 100 },
  { key: "academicPassTarget", label: "Academic pass target", suffix: "%", min: 1, max: 100 },
  { key: "monthlyCollectionTarget", label: "Monthly collection target", suffix: "INR", min: 0, max: 999999999999 },
  { key: "monthlyExpenseBudget", label: "Monthly expense budget", suffix: "INR", min: 0, max: 999999999999 },
  { key: "monthlyAdmissionsTarget", label: "Monthly admissions target", suffix: "students", min: 0, max: 1000000 },
  { key: "feeOverdueAlertDays", label: "Fee overdue alert", suffix: "days", min: 1, max: 365 },
  { key: "routeCapacityWarningPercent", label: "Route capacity warning", suffix: "%", min: 50, max: 150 },
];

export function AnalyticsSettingsPanel({ initial }: { initial: AnalyticsSettingsInput }) {
  const router = useRouter();
  const [setting, setSetting] = useState(initial);
  const [busy, setBusy] = useState(false);

  function updateNumber(key: NumericSetting, value: string) {
    setSetting((current) => ({ ...current, [key]: Number(value) }));
  }

  async function save() {
    setBusy(true);
    try {
      const response = await fetch("/api/v1/analytics-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(setting),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to save analytics settings.");
      }
      toast.success(result.message || "Analytics settings saved.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save analytics settings.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="group print:hidden overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 marker:hidden">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
            <SlidersHorizontal className="size-4" />
          </div>
          <div>
            <h2 className="font-bold">Analytics goals and rules</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Configure targets, warning thresholds, and how attendance is calculated.
            </p>
          </div>
        </div>
        <Settings2 className="size-4 text-muted-foreground transition-transform group-open:rotate-90" />
      </summary>

      <div className="border-t bg-slate-50/40 p-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {fields.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <Label htmlFor={`analytics-${field.key}`}>{field.label}</Label>
              <div className="relative">
                <Input
                  id={`analytics-${field.key}`}
                  type="number"
                  min={field.min}
                  max={field.max}
                  step={field.suffix === "%" ? "0.1" : "1"}
                  value={setting[field.key]}
                  onChange={(event) => updateNumber(field.key, event.target.value)}
                  className="pr-20"
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[10px] font-bold uppercase text-muted-foreground">
                  {field.suffix}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-col gap-4 rounded-2xl border bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Switch
              id="analytics-late-counts-as-present"
              checked={setting.lateCountsAsPresent}
              onCheckedChange={(value) => setSetting((current) => ({ ...current, lateCountsAsPresent: value }))}
            />
            <Label htmlFor="analytics-late-counts-as-present" className="block">
              <span>Count late students as attended</span>
              <span className="mt-1 block text-xs font-normal leading-5 text-muted-foreground">
                Applies consistently to headline attendance, trends, comparisons, and the attention list.
              </span>
            </Label>
          </div>
          <Button onClick={save} disabled={busy} className="shrink-0">
            {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save analytics settings
          </Button>
        </div>
      </div>
    </details>
  );
}
