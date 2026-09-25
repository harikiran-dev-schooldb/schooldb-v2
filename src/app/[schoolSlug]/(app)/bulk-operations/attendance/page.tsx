"use client";

import { useMemo, useRef, useState } from "react";
import { CalendarCheck, Download, FileSpreadsheet, Loader2, UploadCloud, XCircle } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { postImportInBatches } from "@/lib/batched-import";

type AttendanceRow = { admissionNo: string; date: string };
type RowError = { row: number; message: string };
const HEADERS = ["admissionNo", "date"] as const;
const MAX_ROWS = 20_000;

function isStrictIsoDate(value: string) {
  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() + 1 === month && parsed.getUTCDate() === day;
}

function normalizeAdmissionNo(value: string) {
  return value.trim().toUpperCase();
}
const TEMPLATE = [HEADERS.join(","), "ADM001,2026-09-01", "ADM015,2026-09-01"].join("\n");

function parseCsv(text: string) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) throw new Error("The file is empty.");
  if (lines[0].split(",").map((value) => value.trim()).join("|") !== HEADERS.join("|")) {
    throw new Error(`Invalid columns. Expected: ${HEADERS.join(", ")}`);
  }

  const totalRows = lines.length - 1;
  if (totalRows > MAX_ROWS) {
    throw new Error(`File has ${totalRows.toLocaleString()} rows. Maximum allowed is ${MAX_ROWS.toLocaleString()} rows. Please split the file and upload again.`);
  }

  const rows: AttendanceRow[] = [];
  const errors: RowError[] = [];
  lines.slice(1).forEach((line, index) => {
    const [admissionNo = "", date = ""] = line.split(",").map((value) => value.trim());
    const row = index + 2;
    if (!admissionNo) errors.push({ row, message: "Admission number is required." });
    else if (!isStrictIsoDate(date)) errors.push({ row, message: "Date must be a valid calendar date in YYYY-MM-DD format." });
    else rows.push({ admissionNo: normalizeAdmissionNo(admissionNo), date });
  });
  return { rows, errors, totalRows };
}

function downloadTemplate() {
  const url = URL.createObjectURL(new Blob([TEMPLATE], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "schooldb-attendance-absent-template.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function BulkAttendancePage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [errors, setErrors] = useState<RowError[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [fileError, setFileError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; failed: number; errors?: RowError[] } | null>(null);

  const duplicates = useMemo(() => {
    const seen = new Set<string>();
    let count = 0;
    rows.forEach((row) => {
      const key = `${normalizeAdmissionNo(row.admissionNo)}:${row.date}`;
      if (seen.has(key)) count += 1;
      seen.add(key);
    });
    return count;
  }, [rows]);

  async function handleFile(file: File) {
    setFileName(file.name); setRows([]); setErrors([]); setResult(null); setFileError(null); setTotalRows(0);
    if (!file.name.toLowerCase().endsWith(".csv")) return setFileError("Upload a CSV file using the SchoolDB attendance template.");
    try {
      const parsed = parseCsv(await file.text());
      setRows(parsed.rows); setErrors(parsed.errors); setTotalRows(parsed.totalRows);
    } catch (error) { setFileError(error instanceof Error ? error.message : "Unable to read the file."); }
  }

  async function importAttendance() {
    if (!rows.length || errors.length || duplicates || totalRows > MAX_ROWS) return;
    setImporting(true); setFileError(null); setResult(null);
    try {
      const data = await postImportInBatches<AttendanceRow, { imported: number; failed: number; errors?: RowError[] }>({
        endpoint: "/api/v1/attendance/bulk-import",
        bodyKey: "attendance",
        rows,
        failureMessage: "Bulk attendance import failed.",
      });
      setResult(data);
    } catch (error) { setFileError(error instanceof Error ? error.message : "Bulk attendance import failed."); }
    finally { setImporting(false); }
  }

  function reset() {
    setFileName(""); setRows([]); setErrors([]); setTotalRows(0); setFileError(null); setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return <div className="space-y-6 p-4 pb-12 sm:p-6">
    <PageHeader eyebrow="Bulk Operations" title="Bulk Attendance" description="Import historical absentee attendance using admission number and date." action={<Button variant="outline" onClick={downloadTemplate}><Download className="size-4" />Download Template</Button>} />
    <Card className="premium-card overflow-hidden rounded-2xl border-0">
      <CardHeader className="border-b border-border/60 px-6 py-5"><div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><CalendarCheck className="size-5" /></div><div><CardTitle>Absentee attendance import</CardTitle><p className="mt-1 text-xs text-muted-foreground">CSV columns: admissionNo, date. Every uploaded row is treated as ABSENT. Maximum {MAX_ROWS.toLocaleString()} rows per file.</p></div></div></CardHeader>
      <CardContent className="space-y-6 p-6">
        <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleFile(file); }} />
        {!fileName && !fileError && <button type="button" onClick={() => inputRef.current?.click()} className="flex min-h-64 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/70 bg-muted/20 px-6 text-center transition-all hover:border-primary/40 hover:bg-primary/[0.03]"><div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><UploadCloud className="size-7" /></div><p className="mt-4 text-base font-bold">Upload attendance CSV</p><p className="mt-1 text-sm text-muted-foreground">Existing students and historical enrollments are validated before changes. Up to {MAX_ROWS.toLocaleString()} rows.</p></button>}
        {fileError && <div className="flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-4"><XCircle className="mt-0.5 size-5 text-destructive" /><div className="flex-1"><p className="text-sm font-semibold">Import cannot continue</p><p className="mt-1 text-sm text-muted-foreground">{fileError}</p></div><Button size="sm" variant="outline" onClick={reset}>Reset</Button></div>}
        {fileName && !fileError && <><div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4"><div><p className="text-sm font-semibold">{fileName}</p><p className="mt-1 text-xs text-muted-foreground">{totalRows.toLocaleString()} of {MAX_ROWS.toLocaleString()} rows · {rows.length.toLocaleString()} valid rows</p></div><div className="flex gap-2"><Badge variant={rows.length ? "success" : "destructive"}>{rows.length.toLocaleString()} valid</Badge>{duplicates > 0 && <Badge variant="destructive">{duplicates.toLocaleString()} duplicates</Badge>}{errors.length > 0 && <Badge variant="destructive">{errors.length.toLocaleString()} errors</Badge>}</div></div>
        {errors.length > 0 && <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4"><p className="text-sm font-semibold text-destructive">Fix these rows before importing</p><div className="mt-3 max-h-44 space-y-2 overflow-auto text-xs text-muted-foreground">{errors.slice(0,50).map((error) => <p key={`${error.row}-${error.message}`}><span className="font-semibold text-foreground">Row {error.row}:</span> {error.message}</p>)}</div></div>}
        {rows.length > 0 && <div className="overflow-hidden rounded-2xl border border-border/60"><div className="max-h-[460px] overflow-auto"><table className="w-full text-sm"><thead className="sticky top-0 bg-card"><tr><th className="px-4 py-3 text-left">#</th><th className="px-4 py-3 text-left">Admission No</th><th className="px-4 py-3 text-left">Date</th><th className="px-4 py-3 text-left">Status</th></tr></thead><tbody>{rows.slice(0,100).map((row,index) => <tr key={`${row.admissionNo}-${row.date}-${index}`} className="border-t border-border/40"><td className="px-4 py-3 text-muted-foreground">{index+1}</td><td className="px-4 py-3">{row.admissionNo}</td><td className="px-4 py-3">{row.date}</td><td className="px-4 py-3"><Badge variant="destructive">ABSENT</Badge></td></tr>)}</tbody></table></div></div>}
        {result && <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4"><p className="text-sm font-bold">Import complete</p><p className="mt-1 text-xs text-muted-foreground">{result.imported.toLocaleString()} imported · {result.failed.toLocaleString()} failed</p>{result.errors?.length ? <div className="mt-3 space-y-1 text-xs text-destructive">{result.errors.slice(0,20).map((error) => <p key={`${error.row}-${error.message}`}>Row {error.row}: {error.message}</p>)}</div> : null}</div>}
        <div className="flex justify-end gap-3"><Button variant="outline" onClick={reset} disabled={importing}>Start Over</Button><Button onClick={() => void importAttendance()} disabled={importing || !!errors.length || duplicates > 0 || !rows.length || totalRows > MAX_ROWS}>{importing ? <Loader2 className="size-4 animate-spin" /> : <FileSpreadsheet className="size-4" />}{importing ? "Importing..." : `Import ${rows.length.toLocaleString()} Absences`}</Button></div></>}
      </CardContent>
    </Card>
  </div>;
}
