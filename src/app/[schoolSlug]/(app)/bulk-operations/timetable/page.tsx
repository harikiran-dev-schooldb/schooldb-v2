"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Download, FileSpreadsheet, Loader2, UploadCloud, XCircle } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSchool } from "@/contexts/school-context";

type TimetableRow = { academicYear: string; employeeId: string; subject: string; className: string; section: string; period: string; day: string; active: string };
type RowError = { row: number; message: string };

const HEADERS = ["academicYear", "employeeId", "subject", "className", "section", "period", "day", "active"] as const;
const TEMPLATE = [HEADERS.join(","), "2026-27,T001,Mathematics,Class 1,A,Period 1,MONDAY,true", "2026-27,T001,English,Class 1,A,Period 2,MONDAY,true"].join("\r\n");

function clean(value: string) { return value.replace(/^\uFEFF/, "").replace(/\u00A0/g, " ").trim(); }
function parseLine(line: string): string[] {
  const values: string[] = []; let current = ""; let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') { if (quoted && line[i + 1] === '"') { current += '"'; i += 1; } else quoted = !quoted; }
    else if (char === "," && !quoted) { values.push(current.trim()); current = ""; }
    else current += char;
  }
  values.push(current.trim()); return values;
}
function parseCsv(text: string) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) throw new Error("The file is empty.");
  if (parseLine(lines[0]).map(clean).join("|") !== HEADERS.join("|")) throw new Error(`Invalid columns. Expected: ${HEADERS.join(", ")}`);
  const rows: TimetableRow[] = []; const errors: RowError[] = [];
  lines.slice(1).forEach((line, index) => {
    const values = parseLine(line); const row = index + 2;
    const item = Object.fromEntries(HEADERS.map((header, position) => [header, clean(values[position] ?? "")])) as TimetableRow;
    if (!item.academicYear || !item.employeeId || !item.subject || !item.className || !item.section || !item.period || !item.day) { errors.push({ row, message: "Academic year, employee ID, subject, class, section, period and day are required." }); return; }
    if (!["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"].includes(item.day.toUpperCase())) { errors.push({ row, message: "Day must be MONDAY through SATURDAY." }); return; }
    if (item.active && !["true", "false", "1", "0", "yes", "no"].includes(item.active.toLowerCase())) { errors.push({ row, message: "Active must be true or false." }); return; }
    rows.push({ ...item, day: item.day.toUpperCase(), active: item.active || "true" });
  });
  return { rows, errors, totalRows: lines.length - 1 };
}
function downloadTemplate() { const blob = new Blob([TEMPLATE], { type: "text/csv;charset=utf-8" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "schooldb-timetable-template.csv"; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }

export default function BulkTimetablePage() {
  const { school } = useSchool(); const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState(""); const [rows, setRows] = useState<TimetableRow[]>([]); const [errors, setErrors] = useState<RowError[]>([]); const [totalRows, setTotalRows] = useState(0); const [fileError, setFileError] = useState<string | null>(null); const [importing, setImporting] = useState(false); const [result, setResult] = useState<{ created: number; failed: number; errors: RowError[] } | null>(null);
  const duplicateCount = useMemo(() => { const counts = new Map<string, number>(); rows.forEach((r) => { const key = [r.academicYear, r.employeeId, r.subject, r.className, r.section, r.period, r.day].map((v) => v.toLowerCase()).join("|"); counts.set(key, (counts.get(key) ?? 0) + 1); }); return [...counts.values()].filter((v) => v > 1).length; }, [rows]);

  async function handleFile(file: File) {
    setFileName(file.name); setRows([]); setErrors([]); setTotalRows(0); setFileError(null); setResult(null);
    if (!file.name.toLowerCase().endsWith(".csv")) { setFileError("Upload a CSV file using the SchoolDB timetable template."); return; }
    try { const parsed = parseCsv(await file.text()); setRows(parsed.rows); setErrors(parsed.errors); setTotalRows(parsed.totalRows); } catch (error) { setFileError(error instanceof Error ? error.message : "Unable to read the CSV file."); }
  }
  async function importTimetable() {
    if (!rows.length || errors.length || duplicateCount || importing) return;
    setImporting(true); setFileError(null); setResult(null);
    try {
      const response = await fetch("/api/v1/timetables/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ timetables: rows.map((r) => ({ ...r, active: !["false", "0", "no"].includes(r.active.toLowerCase()) })) }) });
      const payload = await response.json() as { success?: boolean; message?: string; data?: { created: number; failed: number; errors: RowError[] } };
      if (!response.ok || !payload.success || !payload.data) throw new Error(payload.message ?? "Bulk timetable import failed.");
      setResult(payload.data);
    } catch (error) { setFileError(error instanceof Error ? error.message : "Bulk timetable import failed."); }
    finally { setImporting(false); }
  }
  function reset() { setFileName(""); setRows([]); setErrors([]); setTotalRows(0); setFileError(null); setResult(null); if (inputRef.current) inputRef.current.value = ""; }

  return <div className="space-y-8 pb-12">
    <PageHeader eyebrow="Bulk Operations" title="Bulk Timetable" description="Import class and teacher timetable assignments using existing teacher allocations and periods." action={<Button variant="outline" onClick={downloadTemplate}><Download className="size-4" />Download Template</Button>} />
    <div className="flex items-center gap-2 text-xs text-muted-foreground"><Link href={`/${school.slug}/bulk-operations`} className="font-semibold text-primary hover:underline">Bulk Operations</Link><span>/</span><span>Timetable</span></div>
    <p className="text-xs text-muted-foreground">Teacher allocations and periods must already exist. The import checks duplicate entries, teacher conflicts and class/section conflicts before writing.</p>
    <Card className="premium-card overflow-hidden rounded-2xl border-0">
      <CardHeader className="border-b border-border/60 px-6 py-5"><div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><FileSpreadsheet className="size-5" /></div><div><CardTitle>Timetable import</CardTitle><p className="mt-1 text-xs text-muted-foreground">CSV: academicYear, employeeId, subject, className, section, period, day, active</p></div></div></CardHeader>
      <CardContent className="space-y-6 p-6">
        <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) void handleFile(file); }} />
        {!fileName && !fileError && <button type="button" onClick={() => inputRef.current?.click()} className="flex min-h-64 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/70 bg-muted/20 px-6 text-center transition-all hover:border-primary/40 hover:bg-primary/[0.03]"><div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><UploadCloud className="size-7" /></div><p className="mt-4 text-base font-bold">Upload timetable CSV</p><p className="mt-1 text-sm text-muted-foreground">Validation happens before database changes.</p></button>}
        {fileError && <div className="flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-4"><XCircle className="mt-0.5 size-5 shrink-0 text-destructive" /><div className="flex-1"><p className="text-sm font-semibold">Import cannot continue</p><p className="mt-1 text-sm text-muted-foreground">{fileError}</p></div><Button size="sm" variant="outline" onClick={reset}>Reset</Button></div>}
        {fileName && !fileError && <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4"><div><p className="text-sm font-semibold">{fileName}</p><p className="mt-1 text-xs text-muted-foreground">{totalRows} rows · {rows.length} valid</p></div><div className="flex gap-2"><Badge variant={rows.length ? "success" : "destructive"}><CheckCircle2 className="size-3" />{rows.length} valid</Badge>{duplicateCount > 0 && <Badge variant="destructive">{duplicateCount} duplicates</Badge>}{errors.length > 0 && <Badge variant="destructive">{errors.length} errors</Badge>}</div></div>
          {errors.length > 0 && <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4"><p className="text-sm font-semibold text-destructive">Fix these rows before importing</p><div className="mt-3 max-h-44 space-y-2 overflow-auto text-xs text-muted-foreground">{errors.slice(0, 50).map((e) => <p key={`${e.row}-${e.message}`}><span className="font-semibold text-foreground">Row {e.row}:</span> {e.message}</p>)}</div></div>}
          {rows.length > 0 && <div className="overflow-hidden rounded-2xl border border-border/60"><div className="max-h-[420px] overflow-auto"><table className="w-full text-sm"><thead className="sticky top-0 z-10 border-b border-border/60 bg-card"><tr><th className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-muted-foreground">#</th>{HEADERS.map((h) => <th key={h} className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-muted-foreground">{h}</th>)}</tr></thead><tbody>{rows.slice(0, 100).map((r, i) => <tr key={`${r.employeeId}-${r.period}-${r.day}-${i}`} className="border-b border-border/40 last:border-0 hover:bg-muted/20"><td className="px-4 py-3 text-xs text-muted-foreground">{i + 1}</td>{HEADERS.map((h) => <td key={h} className="whitespace-nowrap px-4 py-3">{r[h]}</td>)}</tr>)}</tbody></table></div></div>}
          {result && <div className="rounded-2xl border border-border/60 bg-muted/20 p-4"><p className="text-sm font-semibold">Import completed</p><p className="mt-1 text-sm text-muted-foreground">{result.created} timetable entries created · {result.failed} failed.</p>{result.errors.length > 0 && <div className="mt-3 space-y-1 text-xs text-destructive">{result.errors.map((e) => <p key={`${e.row}-${e.message}`}>Row {e.row}: {e.message}</p>)}</div>}</div>}
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={reset} disabled={importing}>Choose another file</Button><Button disabled={!rows.length || errors.length > 0 || duplicateCount > 0 || importing} onClick={() => void importTimetable()}>{importing && <Loader2 className="size-4 animate-spin" />}{importing ? "Importing..." : "Import Timetable"}</Button></div>
        </>}
      </CardContent>
    </Card>
  </div>;
}
