"use client";

import { useMemo, useRef, useState } from "react";
import {
  Download,
  FileSpreadsheet,
  Loader2,
  UploadCloud,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type ExamRow = {
  academicYearId: string;
  name: string;
  startDate: string;
  endDate: string;
};
type RowError = { row: number; message: string };
const HEADERS = ["academicYearId", "name", "startDate", "endDate"] as const;
const TEMPLATE = [
  HEADERS.join(","),
  "PASTE_ACADEMIC_YEAR_ID,Quarterly Exam 1,2026-07-01,2026-07-10",
  "PASTE_ACADEMIC_YEAR_ID,Half Yearly Exam,2026-10-01,2026-10-15",
].join("\n");

function parseLine(line: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;
  for (const c of line) {
    if (c === '"') quoted = !quoted;
    else if (c === "," && !quoted) {
      values.push(current.trim());
      current = "";
    } else current += c;
  }
  values.push(current.trim());
  return values;
}

function parseDate(value: string): string | null {
  const input = value.trim();
  let day: number;
  let month: number;
  let year: number;
  let match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
  if (match) {
    year = Number(match[1]);
    month = Number(match[2]);
    day = Number(match[3]);
  } else {
    match = /^(\d{2})[\/-](\d{2})[\/-](\d{2}|\d{4})$/.exec(input);
    if (!match) return null;
    day = Number(match[1]);
    month = Number(match[2]);
    year = Number(match[3]);
    if (match[3].length === 2) year += year >= 70 ? 1900 : 2000;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    return null;
  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

function parseCsv(text: string) {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim());
  if (!lines.length) throw new Error("The file is empty.");
  if (parseLine(lines[0]).join("|") !== HEADERS.join("|"))
    throw new Error(`Invalid columns. Expected: ${HEADERS.join(", ")}`);
  const rows: ExamRow[] = [];
  const errors: RowError[] = [];
  lines.slice(1).forEach((line, index) => {
    const v = parseLine(line);
    const row = Object.fromEntries(
      HEADERS.map((h, i) => [h, v[i] ?? ""]),
    ) as ExamRow;
    if (
      !row.academicYearId ||
      row.academicYearId === "PASTE_ACADEMIC_YEAR_ID"
    ) {
      errors.push({
        row: index + 2,
        message: "A valid academic year ID is required.",
      });
      return;
    }
    if (!row.name || row.name.length > 100) {
      errors.push({
        row: index + 2,
        message: "Exam name is required and must be 100 characters or less.",
      });
      return;
    }
    const startDate = parseDate(row.startDate);
    const endDate = parseDate(row.endDate);
    if (!startDate) {
      errors.push({
        row: index + 2,
        message:
          "Start date must be YYYY-MM-DD, DD/MM/YYYY, DD/MM/YY, DD-MM-YYYY, or DD-MM-YY.",
      });
      return;
    }
    if (!endDate) {
      errors.push({
        row: index + 2,
        message:
          "End date must be YYYY-MM-DD, DD/MM/YYYY, DD/MM/YY, DD-MM-YYYY, or DD-MM-YY.",
      });
      return;
    }
    if (endDate < startDate) {
      errors.push({
        row: index + 2,
        message: "End date must be on or after the start date.",
      });
      return;
    }
    rows.push({ ...row, startDate, endDate });
  });
  return { rows, errors, totalRows: lines.length - 1 };
}

function downloadTemplate() {
  const blob = new Blob([TEMPLATE], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "schooldb-exams-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function BulkExamsPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<ExamRow[]>([]);
  const [errors, setErrors] = useState<RowError[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [fileError, setFileError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    created: number;
    failed: number;
  } | null>(null);
  const duplicateCount = useMemo(() => {
    const counts = new Map<string, number>();
    rows.forEach((r) => {
      const key = `${r.academicYearId}:${r.name.toLowerCase()}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return [...counts.values()].filter((n) => n > 1).length;
  }, [rows]);
  async function handleFile(file: File) {
    setFileName(file.name);
    setRows([]);
    setErrors([]);
    setTotalRows(0);
    setFileError(null);
    setResult(null);
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setFileError("Upload a CSV file using the SchoolDB exam template.");
      return;
    }
    try {
      const parsed = parseCsv(await file.text());
      setRows(parsed.rows);
      setErrors(parsed.errors);
      setTotalRows(parsed.totalRows);
    } catch (e) {
      setFileError(e instanceof Error ? e.message : "Unable to read the file.");
    }
  }
  async function importExams() {
    if (!rows.length || errors.length || duplicateCount) return;
    setImporting(true);
    setFileError(null);
    setResult(null);
    try {
      const response = await fetch("/api/v1/exams/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exams: rows }),
      });
      const payload = (await response.json()) as {
        success?: boolean;
        message?: string;
        data?: { created: number; failed: number };
      };
      if (!response.ok || !payload.success || !payload.data)
        throw new Error(payload.message ?? "Bulk exam import failed.");
      setResult(payload.data);
    } catch (e) {
      setFileError(e instanceof Error ? e.message : "Bulk exam import failed.");
    } finally {
      setImporting(false);
    }
  }
  function reset() {
    setFileName("");
    setRows([]);
    setErrors([]);
    setTotalRows(0);
    setFileError(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  }
  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        eyebrow="Bulk Operations"
        title="Bulk Exams"
        description="Create exam master records for an academic year from a validated CSV."
        action={
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="size-4" />
            Download Template
          </Button>
        }
      />
      <p className="text-xs text-muted-foreground">
        Academic year ID is required because an exam belongs to a specific
        academic year.
      </p>
      <Card className="premium-card overflow-hidden rounded-2xl border-0">
        <CardHeader className="border-b border-border/60 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileSpreadsheet className="size-5" />
            </div>
            <div>
              <CardTitle>Exam import</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                CSV columns: academicYearId, name, startDate, endDate
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
          {!fileName && !fileError && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex min-h-64 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/70 bg-muted/20 px-6 text-center transition-all hover:border-primary/40 hover:bg-primary/[0.03]"
            >
              <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <UploadCloud className="size-7" />
              </div>
              <p className="mt-4 text-base font-bold">Upload exam CSV</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Validation happens before database changes.
              </p>
            </button>
          )}
          {fileError && (
            <div className="flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
              <XCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
              <div className="flex-1">
                <p className="text-sm font-semibold">Import cannot continue</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {fileError}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={reset}>
                Reset
              </Button>
            </div>
          )}
          {fileName && !fileError && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4">
                <div>
                  <p className="text-sm font-semibold">{fileName}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {totalRows} total rows · {rows.length} valid rows
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge variant={rows.length ? "success" : "destructive"}>
                    {rows.length} valid
                  </Badge>
                  {duplicateCount > 0 && (
                    <Badge variant="destructive">
                      {duplicateCount} duplicates
                    </Badge>
                  )}
                  {errors.length > 0 && (
                    <Badge variant="destructive">{errors.length} errors</Badge>
                  )}
                </div>
              </div>
              {errors.length > 0 && (
                <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
                  <p className="text-sm font-semibold text-destructive">
                    Fix these rows before importing
                  </p>
                  <div className="mt-3 max-h-44 space-y-2 overflow-auto text-xs text-muted-foreground">
                    {errors.slice(0, 50).map((error) => (
                      <p key={`${error.row}-${error.message}`}>
                        <span className="font-semibold text-foreground">
                          Row {error.row}:
                        </span>{" "}
                        {error.message}
                      </p>
                    ))}
                  </div>
                </div>
              )}
              {rows.length > 0 && (
                <div className="overflow-hidden rounded-2xl border border-border/60">
                  <div className="max-h-[460px] overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 z-10 border-b border-border/60 bg-card">
                        <tr>
                          <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            #
                          </th>
                          {HEADERS.map((header) => (
                            <th
                              key={header}
                              className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
                            >
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.slice(0, 100).map((row, index) => (
                          <tr
                            key={`${row.academicYearId}-${row.name}-${index}`}
                            className="border-b border-border/40 last:border-0 hover:bg-muted/20"
                          >
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              {index + 1}
                            </td>
                            {HEADERS.map((header) => (
                              <td
                                key={header}
                                className="whitespace-nowrap px-4 py-3"
                              >
                                {row[header]}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}{" "}
              {result && (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <p className="text-sm font-bold">Import complete</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {result.created} exams created · {result.failed} failed
                  </p>
                </div>
              )}
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={reset} disabled={importing}>
                  Start Over
                </Button>
                <Button
                  onClick={() => void importExams()}
                  disabled={
                    importing ||
                    !!errors.length ||
                    duplicateCount > 0 ||
                    !rows.length
                  }
                >
                  {importing ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <UploadCloud className="size-4" />
                  )}
                  {importing ? "Importing..." : `Import ${rows.length} Exams`}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
