"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Download, FileSpreadsheet, Loader2, UploadCloud, XCircle } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSchool } from "@/contexts/school-context";

type ClassRow = {
  name: string;
  code: string;
  sectionName: string;
  displayOrder: string;
  sectionDisplayOrder: string;
};

type RowError = { row: number; message: string };

const HEADERS: Array<keyof ClassRow> = [
  "name",
  "code",
  "sectionName",
  "displayOrder",
  "sectionDisplayOrder",
];

const TEMPLATE = [
  HEADERS.join(","),
  "Class 1,1,A,1,1",
  "Class 1,1,B,1,2",
  "Class 2,2,A,2,1",
].join("\n");

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') { current += '"'; i += 1; }
      else quoted = !quoted;
    } else if (char === "," && !quoted) {
      values.push(current.trim()); current = "";
    } else current += char;
  }
  values.push(current.trim());
  return values;
}

function parseCsv(text: string) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) throw new Error("The file is empty.");
  const headers = parseCsvLine(lines[0]);
  if (headers.join("|") !== HEADERS.join("|")) throw new Error(`Invalid columns. Expected: ${HEADERS.join(", ")}`);

  const rows: ClassRow[] = [];
  const errors: RowError[] = [];
  lines.slice(1).forEach((line, index) => {
    const values = parseCsvLine(line);
    const row = Object.fromEntries(HEADERS.map((header, columnIndex) => [header, values[columnIndex] ?? ""])) as ClassRow;
    if (!row.name || !row.sectionName) {
      errors.push({ row: index + 2, message: "Class name and section name are required." });
      return;
    }
    const displayOrder = Number(row.displayOrder || 0);
    const sectionDisplayOrder = Number(row.sectionDisplayOrder || 0);
    if (!Number.isInteger(displayOrder) || displayOrder < 0 || !Number.isInteger(sectionDisplayOrder) || sectionDisplayOrder < 0) {
      errors.push({ row: index + 2, message: "Display order values must be non-negative whole numbers." });
      return;
    }
    rows.push({ ...row, displayOrder: String(displayOrder), sectionDisplayOrder: String(sectionDisplayOrder) });
  });
  return { rows, errors, totalRows: lines.length - 1 };
}

function downloadTemplate() {
  const blob = new Blob([TEMPLATE], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "schooldb-classes-sections-template.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function BulkClassesPage() {
  const { school } = useSchool();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [totalRows, setTotalRows] = useState(0);
  const [rows, setRows] = useState<ClassRow[]>([]);
  const [errors, setErrors] = useState<RowError[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ classesCreated: number; sectionsCreated: number; skipped: number; errors: RowError[] } | null>(null);

  const duplicateCount = useMemo(() => {
    const seen = new Set<string>();
    let count = 0;
    rows.forEach((row) => {
      const key = `${row.name.toLowerCase()}::${row.sectionName.toLowerCase()}`;
      if (seen.has(key)) count += 1;
      seen.add(key);
    });
    return count;
  }, [rows]);

  async function handleFile(file: File) {
    setFileName(file.name); setFileError(null); setResult(null); setTotalRows(0); setRows([]); setErrors([]);
    if (!file.name.toLowerCase().endsWith(".csv")) { setFileError("Upload a CSV file using the SchoolDB classes and sections template."); return; }
    try {
      const parsed = parseCsv(await file.text());
      setTotalRows(parsed.totalRows); setRows(parsed.rows); setErrors(parsed.errors);
    } catch (error) { setFileError(error instanceof Error ? error.message : "Unable to read the file."); }
  }

  async function importClasses() {
    if (!rows.length || errors.length || duplicateCount) return;
    setImporting(true); setResult(null); setFileError(null);
    try {
      const response = await fetch("/api/v1/classes/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: rows.map((row) => ({ ...row, displayOrder: Number(row.displayOrder), sectionDisplayOrder: Number(row.sectionDisplayOrder) })) }),
      });
      const payload = await response.json() as { success?: boolean; message?: string; data?: { classesCreated: number; sectionsCreated: number; skipped: number; errors: RowError[] } };
      if (!response.ok || !payload.success || !payload.data) throw new Error(payload.message ?? "Bulk class import failed.");
      setResult(payload.data);
      if (payload.data.errors.length) setErrors(payload.data.errors);
    } catch (error) { setFileError(error instanceof Error ? error.message : "Bulk class import failed."); }
    finally { setImporting(false); }
  }

  function reset() {
    setFileName(""); setTotalRows(0); setRows([]); setErrors([]); setFileError(null); setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const hasFile = Boolean(fileName) && !fileError;

  return (
    <div className="space-y-8 pb-12">
      <PageHeader eyebrow="Bulk Operations" title="Bulk Classes & Sections" description="Create classes and their sections together from one validated CSV." action={<Button variant="outline" onClick={downloadTemplate}><Download className="size-4" />Download Template</Button>} />
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Link href={`/${school.slug}/bulk-operations`} className="font-semibold text-primary hover:underline">Bulk Operations</Link><span>/</span><span>Classes & Sections</span></div>

      <Card className="premium-card overflow-hidden rounded-2xl border-0">
        <CardHeader className="border-b border-border/60 px-6 py-5"><div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><FileSpreadsheet className="size-5" /></div><div><CardTitle>Class & section import</CardTitle><p className="mt-1 text-xs text-muted-foreground">CSV columns: name, code, sectionName, displayOrder, sectionDisplayOrder</p></div></div></CardHeader>
        <CardContent className="space-y-6 p-6">
          <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleFile(file); }} />
          {!hasFile && !fileError && <button type="button" onClick={() => inputRef.current?.click()} className="flex min-h-64 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/70 bg-muted/20 px-6 text-center transition-all hover:border-primary/40 hover:bg-primary/[0.03]"><div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><UploadCloud className="size-7" /></div><p className="mt-4 text-base font-bold">Upload classes & sections CSV</p><p className="mt-1 max-w-md text-sm text-muted-foreground">Existing classes and sections are skipped safely; new records are created in one transaction.</p></button>}
          {fileError && <div className="flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-4"><XCircle className="mt-0.5 size-5 shrink-0 text-destructive" /><div className="flex-1 text-sm"><p className="font-semibold">Import cannot continue</p><p className="mt-1 text-muted-foreground">{fileError}</p></div><Button size="sm" variant="outline" onClick={reset}>Reset</Button></div>}
          {hasFile && <>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4"><div><p className="text-sm font-semibold">{fileName}</p><p className="mt-1 text-xs text-muted-foreground">{totalRows} total rows detected · {rows.length} valid rows ready for review</p></div><div className="flex flex-wrap gap-2"><Badge variant={rows.length ? "success" : "destructive"}>{rows.length ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}{rows.length} valid</Badge>{duplicateCount > 0 && <Badge variant="destructive">{duplicateCount} duplicate rows</Badge>}{errors.length > 0 && <Badge variant="destructive">{errors.length} validation errors</Badge>}</div></div>
            {errors.length > 0 && <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4"><p className="text-sm font-semibold text-destructive">Fix these rows before importing</p><div className="mt-3 max-h-44 space-y-2 overflow-auto text-xs text-muted-foreground">{errors.slice(0, 50).map((error) => <p key={`${error.row}-${error.message}`}><span className="font-semibold text-foreground">Row {error.row}:</span> {error.message}</p>)}</div></div>}
            {rows.length > 0 && <div className="overflow-hidden rounded-2xl border border-border/60"><div className="max-h-[460px] overflow-auto"><table className="w-full text-sm"><thead className="sticky top-0 z-10 border-b border-border/60 bg-card"><tr><th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">#</th>{HEADERS.map((header) => <th key={header} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{header}</th>)}</tr></thead><tbody>{rows.slice(0, 100).map((row, index) => <tr key={`${row.name}-${row.sectionName}-${index}`} className="border-b border-border/40 last:border-0 hover:bg-muted/20"><td className="px-4 py-3 text-xs text-muted-foreground">{index + 1}</td>{HEADERS.map((header) => <td key={header} className="whitespace-nowrap px-4 py-3">{row[header]}</td>)}</tr>)}</tbody></table></div></div>}
            {result && <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4"><p className="text-sm font-bold">Import complete</p><p className="mt-1 text-xs text-muted-foreground">{result.classesCreated} classes created · {result.sectionsCreated} sections created · {result.skipped} existing/duplicate rows skipped</p></div>}
            <div className="flex flex-wrap justify-end gap-3"><Button variant="outline" onClick={reset} disabled={importing}><ArrowLeft className="size-4" />Start Over</Button><Button onClick={() => void importClasses()} disabled={importing || !!errors.length || duplicateCount > 0 || !rows.length}>{importing ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}{importing ? "Importing..." : `Import ${rows.length} Rows`}</Button></div>
          </>}
        </CardContent>
      </Card>
    </div>
  );
}
