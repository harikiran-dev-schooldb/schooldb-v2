"use client";

import { useRef, useState } from "react";
import {
  AlertTriangle,
  BookOpenCheck,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  UploadCloud,
  WalletCards,
  XCircle,
} from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  postImportInBatches,
  type ImportProgress,
} from "@/lib/batched-import";
import type {
  PromotionDecision,
  PromotionImportRow,
} from "../services/student-enrollment.service";

const HEADERS = [
  "admissionNo",
  "targetAcademicYear",
  "targetClass",
  "targetSection",
  "decision",
] as const;

type RowError = { row: number; admissionNo?: string; message: string };
type Preview = {
  total: number;
  valid: number;
  errors: RowError[];
  eligible: number;
  alreadyEnrolled: number;
  feeWarnings: { students: number; installments: number; outstandingAmount: number };
  resultWarnings: { openExams: number; missingCompletedMarks: number; studentsBelowPassMark: number };
  mappings: Array<{ decision: PromotionDecision; target: string; students: number }>;
};

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && quoted && line[index + 1] === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  if (quoted) throw new Error("A quoted value is not closed.");
  values.push(current.trim());
  return values;
}

function rowsFromMatrix(matrix: string[][]) {
  if (!matrix.length) throw new Error("The file is empty.");
  const headers = matrix[0].map((value) => value.trim());
  if (headers.join("|") !== HEADERS.join("|")) {
    throw new Error(`Invalid columns. Expected: ${HEADERS.join(", ")}`);
  }

  const rows: PromotionImportRow[] = [];
  const errors: RowError[] = [];
  const seen = new Set<string>();
  matrix.slice(1).forEach((values, index) => {
    if (values.every((value) => !value.trim())) return;
    const rowNumber = index + 2;
    const decision = values[4]?.trim().toUpperCase();
    const row = {
      admissionNo: values[0]?.trim() ?? "",
      targetAcademicYear: values[1]?.trim() ?? "",
      targetClass: values[2]?.trim() ?? "",
      targetSection: values[3]?.trim() ?? "",
      decision: decision as PromotionDecision,
    };
    if (!row.admissionNo || !row.targetAcademicYear || !row.targetClass || !row.targetSection) {
      errors.push({ row: rowNumber, admissionNo: row.admissionNo, message: "Required value is missing." });
    } else if (decision !== "PROMOTE" && decision !== "DETAIN") {
      errors.push({ row: rowNumber, admissionNo: row.admissionNo, message: "Decision must be PROMOTE or DETAIN." });
    } else if (seen.has(row.admissionNo.toLowerCase())) {
      errors.push({ row: rowNumber, admissionNo: row.admissionNo, message: "Admission number is repeated." });
    } else {
      seen.add(row.admissionNo.toLowerCase());
      rows.push(row);
    }
  });
  if (rows.length + errors.length > 5_000) {
    throw new Error("A promotion file can contain up to 5,000 rows.");
  }
  return { rows, errors };
}

async function readFile(file: File) {
  if (file.name.toLowerCase().endsWith(".csv")) {
    const lines = (await file.text())
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/)
      .filter((line) => line.trim());
    return rowsFromMatrix(lines.map(parseCsvLine));
  }
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    throw new Error("Upload an Excel .xlsx file or CSV file.");
  }

  const { Workbook } = await import("exceljs");
  const workbook = new Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new Error("The workbook has no worksheet.");
  const matrix: string[][] = [];
  worksheet.eachRow({ includeEmpty: false }, (row) => {
    const values = HEADERS.map((_, index) => row.getCell(index + 1).text.trim());
    matrix.push(values);
  });
  return rowsFromMatrix(matrix);
}

export function PromotionFileImport() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<PromotionImportRow[]>([]);
  const [errors, setErrors] = useState<RowError[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null);

  function reset() {
    setFileName("");
    setRows([]);
    setErrors([]);
    setMessage(null);
    setPreview(null);
    setProgress(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function downloadTemplate() {
    const { Workbook } = await import("exceljs");
    const workbook = new Workbook();
    const sheet = workbook.addWorksheet("Student promotions");
    sheet.addRow([...HEADERS]);
    sheet.addRow(["14570", "2027-28", "XI", "A", "PROMOTE"]);
    sheet.addRow(["14571", "2027-28", "X", "B", "DETAIN"]);
    sheet.getRow(1).font = { bold: true };
    sheet.columns.forEach((column) => { column.width = 24; });
    const buffer = await workbook.xlsx.writeBuffer();
    const url = URL.createObjectURL(
      new Blob([new Uint8Array(buffer)], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "schooldb-student-promotion-template.xlsx";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function handleFile(file: File) {
    reset();
    setFileName(file.name);
    setReviewing(true);
    try {
      const parsed = await readFile(file);
      setRows(parsed.rows);
      setErrors(parsed.errors);
      if (parsed.errors.length) return;
      const response = await fetch("/api/v1/student-enrollments/promote/import/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: parsed.rows }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Unable to review the promotion file.");
      }
      const nextPreview = payload.data as Preview;
      setPreview(nextPreview);
      if (nextPreview.errors.length) setErrors(nextPreview.errors);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to read the promotion file.");
    } finally {
      setReviewing(false);
    }
  }

  async function runImport() {
    if (!preview || preview.errors.length || preview.eligible === 0) return;
    setImporting(true);
    setMessage(null);
    setResult(null);
    try {
      const data = await postImportInBatches<
        PromotionImportRow,
        { created: number; skipped: number; errors: RowError[] }
      >({
        endpoint: "/api/v1/student-enrollments/promote/import",
        bodyKey: "rows",
        rows,
        onProgress: setProgress,
        failureMessage: "Promotion import failed.",
      });
      setResult({ created: data.created, skipped: data.skipped });
      setConfirmOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Promotion import failed.");
      setConfirmOpen(false);
    } finally {
      setImporting(false);
    }
  }

  return (
    <Card className="premium-card overflow-hidden rounded-2xl border-0">
      <CardHeader className="border-b border-border/60 px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <FileSpreadsheet className="size-5" />
            </div>
            <div>
              <CardTitle>Excel promotion import</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Upload one .xlsx or CSV file. All rows are reviewed first, then imported in batches of 500.
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => void downloadTemplate()}>
            <Download className="size-4" /> Download Excel template
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 p-6">
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
        {!fileName ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex min-h-56 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/70 bg-muted/20 p-6 text-center transition hover:border-primary/40 hover:bg-primary/[0.03]"
          >
            <UploadCloud className="size-9 text-primary" />
            <p className="mt-3 font-bold">Upload promotion Excel or CSV</p>
            <p className="mt-1 text-xs text-muted-foreground">Up to 5,000 students in one file</p>
          </button>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 p-4">
            <div>
              <p className="text-sm font-semibold">{fileName}</p>
              <p className="mt-1 text-xs text-muted-foreground">{rows.length + errors.length} rows detected</p>
            </div>
            <Button variant="outline" size="sm" onClick={reset} disabled={importing}>Choose another file</Button>
          </div>
        )}

        {reviewing && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Reading and checking every row…</div>}
        {message && <div className="flex gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4"><XCircle className="size-5 shrink-0 text-destructive" /><p className="text-sm">{message}</p></div>}
        {errors.length > 0 && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
            <p className="text-sm font-semibold text-destructive">Fix {errors.length} rows before importing</p>
            <div className="mt-3 max-h-48 space-y-1 overflow-y-auto text-xs text-muted-foreground">
              {errors.slice(0, 100).map((error) => <p key={`${error.row}-${error.message}`}><span className="font-semibold text-foreground">Row {error.row}{error.admissionNo ? ` · ${error.admissionNo}` : ""}:</span> {error.message}</p>)}
            </div>
          </div>
        )}

        {preview && errors.length === 0 && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="Valid rows" value={preview.valid} />
              <Stat label="Eligible" value={preview.eligible} />
              <Stat label="Already enrolled" value={preview.alreadyEnrolled} />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <ReviewWarning icon={WalletCards} title={`${preview.feeWarnings.students} students have fee dues`} detail={`${preview.feeWarnings.installments} installments · ${inr.format(preview.feeWarnings.outstandingAmount)}`} warning={preview.feeWarnings.students > 0} />
              <ReviewWarning icon={BookOpenCheck} title={`${preview.resultWarnings.studentsBelowPassMark} below pass mark`} detail={`${preview.resultWarnings.openExams} exams open · ${preview.resultWarnings.missingCompletedMarks} marks missing`} warning={Object.values(preview.resultWarnings).some(Boolean)} />
            </div>
            <div className="max-h-52 overflow-y-auto rounded-xl border border-border/60">
              {preview.mappings.map((mapping, index) => (
                <div key={`${mapping.target}-${mapping.decision}-${index}`} className="flex items-center justify-between gap-4 border-b border-border/50 px-4 py-3 text-sm last:border-0">
                  <span><Badge variant={mapping.decision === "DETAIN" ? "warning" : "secondary"}>{mapping.decision}</Badge> <span className="ml-2">{mapping.target}</span></span>
                  <span className="font-semibold">{mapping.students}</span>
                </div>
              ))}
            </div>
            {progress && importing && (
              <div className="space-y-2 rounded-xl bg-primary/5 p-4">
                <div className="flex justify-between text-xs font-semibold"><span>{progress.completedBatches} / {progress.totalBatches} batches</span><span>{progress.completedRows} / {progress.totalRows}</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-primary/10"><div className="h-full bg-primary transition-all" style={{ width: `${(progress.completedRows / progress.totalRows) * 100}%` }} /></div>
              </div>
            )}
            {result && <div className="flex gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4"><CheckCircle2 className="size-5 text-emerald-600" /><p className="text-sm"><span className="font-semibold">Import complete.</span> {result.created} updated · {result.skipped} skipped.</p></div>}
            {!result && <div className="flex justify-end"><Button onClick={() => setConfirmOpen(true)} disabled={!preview.eligible}><UploadCloud className="size-4" /> Import {preview.eligible} students</Button></div>}
          </div>
        )}
      </CardContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm promotion import</AlertDialogTitle>
            <AlertDialogDescription>
              This will close each current enrollment and create the target enrollment defined in the file. This operation is recorded in the audit log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm">
            <AlertTriangle className="size-5 shrink-0 text-amber-600" />
            Fee and result warnings do not block an authorized year-end decision.
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={importing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(event) => { event.preventDefault(); void runImport(); }} disabled={importing}>
              {importing && <Loader2 className="size-4 animate-spin" />}
              {importing ? "Importing…" : "Confirm import"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-border/60 bg-muted/20 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-1 text-xl font-bold">{value}</p></div>;
}

function ReviewWarning({ icon: Icon, title, detail, warning }: { icon: typeof WalletCards; title: string; detail: string; warning: boolean }) {
  return <div className={`flex gap-3 rounded-xl border p-4 ${warning ? "border-amber-500/20 bg-amber-500/5" : "border-emerald-500/20 bg-emerald-500/5"}`}><Icon className={`size-5 shrink-0 ${warning ? "text-amber-600" : "text-emerald-600"}`} /><div><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div></div>;
}
