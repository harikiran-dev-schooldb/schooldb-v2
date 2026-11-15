"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, RotateCcw, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSchool } from "@/contexts/school-context";

type Config = { kind: string; title: string; description: string; headers: string[]; sample: string[] };
type ErrorRow = { row: number; message: string };
type History = { id: string; entityType: string; summary: string; actorName: string; createdAt: string; rollbackAvailable: boolean };
const parseLine = (line: string) => { const out: string[] = []; let value = "", quoted = false; for (let i = 0; i < line.length; i++) { const c = line[i]; if (c === '"' && quoted && line[i + 1] === '"') { value += '"'; i++; } else if (c === '"') quoted = !quoted; else if (c === "," && !quoted) { out.push(value.trim()); value = ""; } else value += c; } out.push(value.trim()); return out; };
const escape = (value: string) => /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
const normalized = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

export function BulkAdminImport({ config }: { config: Config }) {
  const { school } = useSchool(); const [rows, setRows] = useState<Record<string, string>[]>([]); const [errors, setErrors] = useState<ErrorRow[]>([]); const [file, setFile] = useState(""); const [busy, setBusy] = useState(false); const [history, setHistory] = useState<History[]>([]);
  async function loadHistory() { const r = await fetch("/api/v1/bulk-admin/history", { cache: "no-store" }); const b = await r.json(); if (r.ok && b.success) setHistory(b.data); }
  useEffect(() => {
    let cancelled = false;
    void fetch("/api/v1/bulk-admin/history", { cache: "no-store" })
      .then((response) => response.json().then((body) => ({ response, body })))
      .then(({ response, body }) => {
        if (!cancelled && response.ok && body.success) setHistory(body.data);
      });
    return () => { cancelled = true; };
  }, []);
  function download(name: string, content: string) { const url = URL.createObjectURL(new Blob([content], { type: "text/csv" })); const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url); }
  function template() { download(`${config.kind}-template.csv`, `${config.headers.join(",")}\n${config.sample.map(escape).join(",")}`); }
  async function read(selected: File) { setFile(selected.name); setRows([]); setErrors([]); const lines = (await selected.text()).replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim()); if (!lines.length) return setErrors([{ row: 0, message: "The file is empty." }]); const supplied = parseLine(lines[0]); const map = config.headers.map((wanted) => supplied.findIndex((h) => normalized(h) === normalized(wanted))); if (map.some((i) => i < 0)) return setErrors([{ row: 1, message: `Missing columns: ${config.headers.filter((_, i) => map[i] < 0).join(", ")}. Column order and capitalization may differ.` }]); setRows(lines.slice(1).map((line) => { const values = parseLine(line); return Object.fromEntries(config.headers.map((h, i) => [h, values[map[i]] ?? ""])); })); }
  async function validateAndImport() { setBusy(true); setErrors([]); try { const preview = await fetch(`/api/v1/bulk-admin/${config.kind}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rows, dryRun: true }) }); const p = await preview.json(); if (!preview.ok || !p.success) throw new Error(p.message); if (!p.data.valid) { setErrors(p.data.errors); return; } if (!confirm(`Import ${rows.length} validated rows?`)) return; const response = await fetch(`/api/v1/bulk-admin/${config.kind}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rows }) }); const body = await response.json(); if (!response.ok || !body.success) throw new Error(body.message); toast.success(body.message); setRows([]); setFile(""); await loadHistory(); } catch (e) { toast.error(e instanceof Error ? e.message : "Import failed."); } finally { setBusy(false); } }
  async function rollback(id: string) { if (!confirm("Remove only the records created by this import?")) return; const response = await fetch("/api/v1/bulk-admin/history", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ auditId: id }) }); const body = await response.json(); if (response.ok) toast.success(body.message); else toast.error(body.message); await loadHistory(); }
  return <div className="space-y-6"><PageHeader eyebrow="Bulk operations" title={config.title} description={config.description} />
    <Card className="rounded-2xl"><CardHeader><CardTitle>1. Template and export</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-3"><Button variant="outline" onClick={template}><Download className="mr-2 size-4" />Download template</Button><Button variant="outline" asChild><a href={`/api/v1/bulk-admin/${config.kind}`}><Download className="mr-2 size-4" />Export current data</a></Button></CardContent></Card>
    <Card className="rounded-2xl"><CardHeader><CardTitle>2. Upload, map and validate</CardTitle></CardHeader><CardContent className="space-y-4"><label className="flex cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed p-8 text-sm font-semibold"><UploadCloud className="mr-2 size-5" />{file || "Choose CSV file"}<input className="sr-only" type="file" accept=".csv" onChange={(e) => e.target.files?.[0] && void read(e.target.files[0])} /></label><p className="text-xs text-muted-foreground">Columns are mapped automatically by name; order, spaces, punctuation and capitalization may differ.</p>{rows.length ? <p className="text-sm font-semibold">{rows.length} rows ready for server dry run.</p> : null}{errors.length ? <div className="rounded-xl bg-destructive/10 p-4 text-sm"><p className="font-bold">{errors.length} errors found</p>{errors.slice(0, 8).map((e) => <p key={`${e.row}-${e.message}`}>Row {e.row}: {e.message}</p>)}<Button className="mt-3" size="sm" variant="outline" onClick={() => download(`${config.kind}-errors.csv`, `row,message\n${errors.map((e) => `${e.row},${escape(e.message)}`).join("\n")}`)}>Download error CSV</Button></div> : null}<Button disabled={busy || !rows.length} onClick={validateAndImport}>{busy ? "Checking…" : "Server dry run and import"}</Button></CardContent></Card>
    <Card className="rounded-2xl"><CardHeader><CardTitle>Recent import history</CardTitle></CardHeader><CardContent className="space-y-3">{history.filter((h) => h.entityType === config.kind).map((h) => <div key={h.id} className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold">{h.summary}</p><p className="text-xs text-muted-foreground">{h.actorName} · {new Date(h.createdAt).toLocaleString()}</p></div><Button size="sm" variant="outline" disabled={!h.rollbackAvailable} onClick={() => rollback(h.id)}><RotateCcw className="mr-2 size-4" />{h.rollbackAvailable ? "Safe rollback" : "Rolled back"}</Button></div>)}{!history.some((h) => h.entityType === config.kind) ? <p className="text-sm text-muted-foreground">No imports yet.</p> : null}</CardContent></Card>
    <Button variant="ghost" asChild><Link href={`/${school.slug}/bulk-operations`}>Back to all bulk operations</Link></Button>
  </div>;
}
