"use client";

import { useState } from "react";
import { Hash, LoaderCircle, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type Setting = { automaticNumbering: boolean; admissionPrefix: string; nextNumber: number; numberPadding: number };

export function AdmissionNumberSettings({ initial }: { initial: Setting }) {
  const [setting, setSetting] = useState(initial);
  const [busy, setBusy] = useState(false);
  const preview = `${setting.admissionPrefix}${String(setting.nextNumber).padStart(setting.numberPadding, "0")}`;
  async function save() {
    setBusy(true);
    try {
      const response = await fetch("/api/v1/admissions/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(setting) });
      const result = await response.json();
      if (!result.success) throw new Error(result.message || "Unable to save settings.");
      toast.success(result.message);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to save settings."); }
    finally { setBusy(false); }
  }
  return <section className="rounded-2xl border bg-card p-5 shadow-sm"><div className="flex flex-col gap-5 lg:flex-row lg:items-end"><div className="flex min-w-56 flex-1 items-center gap-3"><div className="flex size-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><Hash className="size-5" /></div><div><h2 className="font-black">Admission numbering</h2><p className="text-xs text-muted-foreground">Next preview: <span className="font-bold text-foreground">{preview}</span></p></div></div><label className="flex h-10 items-center gap-3 rounded-xl border px-3 text-sm font-semibold"><Switch checked={setting.automaticNumbering} onCheckedChange={(value) => setSetting((current) => ({ ...current, automaticNumbering: value }))} />Automatic</label><div className="space-y-1"><Label>Prefix</Label><Input value={setting.admissionPrefix} onChange={(event) => setSetting((current) => ({ ...current, admissionPrefix: event.target.value.toUpperCase() }))} className="w-32" placeholder="STD-" /></div><div className="space-y-1"><Label>Next number</Label><Input type="number" min={1} value={setting.nextNumber} onChange={(event) => setSetting((current) => ({ ...current, nextNumber: Number(event.target.value) }))} className="w-32" /></div><div className="space-y-1"><Label>Digits</Label><Input type="number" min={1} max={10} value={setting.numberPadding} onChange={(event) => setSetting((current) => ({ ...current, numberPadding: Number(event.target.value) }))} className="w-24" /></div><Button onClick={save} disabled={busy}>{busy ? <LoaderCircle className="animate-spin" /> : <Save />}Save</Button></div></section>;
}
