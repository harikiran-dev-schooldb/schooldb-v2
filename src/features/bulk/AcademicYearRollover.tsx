"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Year = { id: string; name: string; active: boolean };
type Preview = { source: { name: string }; target: { name: string }; counts: Record<string, number> };

export function AcademicYearRollover({ years }: { years: Year[] }) {
  const [source, setSource] = useState(""); const [target, setTarget] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null); const [busy, setBusy] = useState(false);
  async function loadPreview() {
    setBusy(true); setPreview(null);
    try { const response = await fetch(`/api/v1/system/academic-year-rollover?sourceAcademicYearId=${encodeURIComponent(source)}&targetAcademicYearId=${encodeURIComponent(target)}`); const body = await response.json(); if (!response.ok || !body.success) throw new Error(body.message); setPreview(body.data); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Unable to preview rollover."); } finally { setBusy(false); }
  }
  async function apply() {
    if (!preview || !confirm(`Copy setup from ${preview.source.name} to ${preview.target.name}? Existing target records will be kept.`)) return;
    setBusy(true); try { const response = await fetch("/api/v1/system/academic-year-rollover", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sourceAcademicYearId: source, targetAcademicYearId: target }) }); const body = await response.json(); if (!response.ok || !body.success) throw new Error(body.message); toast.success(body.message); setPreview(null); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Rollover failed."); } finally { setBusy(false); }
  }
  return <div className="space-y-5">
    <Card className="rounded-2xl"><CardHeader><CardTitle>Select academic years</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-2"><div><p className="mb-2 text-sm font-semibold">Copy from</p><Select value={source} onValueChange={(v) => { setSource(v); setPreview(null); }}><SelectTrigger><SelectValue placeholder="Source year" /></SelectTrigger><SelectContent>{years.map((y) => <SelectItem key={y.id} value={y.id}>{y.name}{y.active ? " (active)" : ""}</SelectItem>)}</SelectContent></Select></div><div><p className="mb-2 text-sm font-semibold">Copy into</p><Select value={target} onValueChange={(v) => { setTarget(v); setPreview(null); }}><SelectTrigger><SelectValue placeholder="Target year" /></SelectTrigger><SelectContent>{years.map((y) => <SelectItem key={y.id} value={y.id}>{y.name}{y.active ? " (active)" : ""}</SelectItem>)}</SelectContent></Select></div><Button className="md:col-span-2" disabled={busy || !source || !target || source === target} onClick={loadPreview}>{busy ? "Checking…" : "Preview rollover"}</Button></CardContent></Card>
    {preview ? <Card className="rounded-2xl border-primary/30"><CardHeader><CardTitle>{preview.source.name} → {preview.target.name}</CardTitle></CardHeader><CardContent><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Object.entries(preview.counts).map(([name, count]) => <div key={name} className="rounded-xl bg-muted p-4"><p className="text-2xl font-black">{count}</p><p className="text-xs capitalize text-muted-foreground">{name.replace(/([A-Z])/g, " $1")}</p></div>)}</div><p className="mt-4 text-sm text-muted-foreground">Periods are school-wide and will be reused. Fee due dates shift by the difference between academic-year start dates. Existing target records are never overwritten.</p><Button className="mt-5" disabled={busy} onClick={apply}>Confirm and copy setup</Button></CardContent></Card> : null}
  </div>;
}
