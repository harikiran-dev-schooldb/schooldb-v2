"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
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
import { useSchool } from "@/contexts/school-context";

type Row = {
  academicYear: string;
  className: string;
  subject: string;
  active: string;
};
type RowError = { row: number; message: string };

const HEADERS = ["academicYear", "className", "subject", "active"] as const;
const TEMPLATE = [
  HEADERS.join(","),
  "2026-27,Class 1,English,true",
  "2026-27,Class 1,Mathematics,true",
  "2026-27,Class 2,English,true",
].join("\n");

function parseLine(line: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;
  for (const char of line) {
    if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) {
      values.push(current.trim());
      current = "";
    } else current += char;
  }
  values.push(current.trim());
  return values;
}

function parseCsv(text: string) {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim());
  if (!lines.length) throw new Error("The file is empty.");
  if (parseLine(lines[0]).join("|") !== HEADERS.join("|")) {
    throw new Error(`Invalid columns. Expected: ${HEADERS.join(", ")}`);
  }

  const rows: Row[] = [];
  const errors: RowError[] = [];
  const keys = new Set<string>();

  lines.slice(1).forEach((line, index) => {
    const rowNo = index + 2;
    const values = parseLine(line);
    const row = Object.fromEntries(
      HEADERS.map((header, i) => [header, values[i] ?? ""]),
    ) as Row;

    if (!row.academicYear) {
      errors.push({ row: rowNo, message: "Academic year is required." });
      return;
    }
    if (!row.className) {
      errors.push({ row: rowNo, message: "Class is required." });
      return;
    }
    if (!row.subject) {
      errors.push({ row: rowNo, message: "Subject is required." });
      return;
    }
    if (!/^(true|false|yes|no|1|0)$/i.test(row.active || "true")) {
      errors.push({
        row: rowNo,
        message: "Active must be true/false, yes/no, or 1/0.",
      });
      return;
    }

    row.active = /^(true|yes|1)$/i.test(row.active || "true")
      ? "true"
      : "false";

    const key = [row.academicYear, row.className, row.subject]
      .map((value) => value.trim().toLowerCase())
      .join("|");
    if (keys.has(key)) {
      errors.push({ row: rowNo, message: "Duplicate class-subject mapping in this file." });
      return;
    }
    keys.add(key);
    rows.push(row);
  });

  return { rows, errors, totalRows: lines.length - 1 };
}

function downloadTemplate() {
  const blob = new Blob([TEMPLATE], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "schooldb-class-subjects-template.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function BulkClassSubjectsPage() {
  const { school } = useSchool();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [totalRows, setTotalRows] = useState(0);
  const [rows, setRows] = useState<Row[]>([]);
  const [errors, setErrors] = useState<RowError[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    created: number;
    skipped: number;
    errors: RowError[];
  } | null>(null);

  const duplicateCount = useMemo(() => {
    const counts = new Map<string, number>();
    rows.forEach((row) => {
      const key = [row.academicYear, row.className, row.subject]
        .map((value) => value.trim().toLowerCase())
        .join("|");
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return [...counts.values()].filter((count) => count > 1).length;
  }, [rows]);

  async function handleFile(file: File) {
    setFileName(file.name);
    setFileError(null);
    setResult(null);
    setRows([]);
    setErrors([]);
    setTotalRows(0);

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setFileError("Upload a CSV file using the SchoolDB class-subject template.");
      return;
    }

    try {
      const parsed = parseCsv(await file.text());
      setRows(parsed.rows);
      setErrors(parsed.errors);
      setTotalRows(parsed.totalRows);
    } catch (error) {
      setFileError(error instanceof Error ? error.message : "Unable to read the CSV file.");
    }
  }

  async function importClassSubjects() {
    if (!rows.length || errors.length || duplicateCount) return;
    setImporting(true);
    setFileError(null);
    setResult(null);

    try {
      const response = await fetch("/api/v1/class-subjects/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mappings: rows.map((row) => ({
            academicYear: row.academicYear,
            className: row.className,
            subject: row.subject,
            active: row.active === "true",
          })),
        }),
      });

      const payload = (await response.json()) as {
        success?: boolean;
        message?: string;
        data?: { created: number; skipped: number; errors: RowError[] };
      };

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.message ?? "Bulk class-subject import failed.");
      }

      setResult(payload.data);
      if (payload.data.errors.length) setErrors(payload.data.errors);
    } catch (error) {
      setFileError(
        error instanceof Error ? error.message : "Bulk class-subject import failed.",
      );
    } finally {
      setImporting(false);
    }
  }

  function reset() {
    setFileName("");
    setTotalRows(0);
    setRows([]);
    setErrors([]);
    setFileError(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const hasFile = Boolean(fileName) && !fileError;

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        eyebrow="Bulk Operations"
        title="Bulk Class Subjects"
        description="Map subjects to classes for an academic year using a validated CSV import."
        action={
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="size-4" />
            Download Template
          </Button>
        }
      />

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link
          href={`/${school.slug}/bulk-operations`}
          className="font-semibold text-primary hover:underline"
        >
          Bulk Operations
        </Link>
        <span>/</span>
        <span>Class Subjects</span>
      </div>

      <Card className="premium-card overflow-hidden rounded-2xl border-0">
        <CardHeader className="border-b border-border/60 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileSpreadsheet className="size-5" />
            </div>
            <div>
              <CardTitle>Class-subject import</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                CSV columns: academicYear, className, subject, active
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
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />

          {!hasFile && !fileError && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex min-h-64 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/70 bg-muted/20 px-6 text-center transition-all hover:border-primary/40 hover:bg-primary/[0.03]"
            >
              <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <UploadCloud className="size-7" />
              </div>
              <p className="mt-4 text-base font-bold">Upload class-subject CSV</p>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Existing academic years, classes, and subjects are resolved and validated before database changes.
              </p>
            </button>
          )}

          {fileError && (
            <div className="flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
              <XCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
              <div className="flex-1 text-sm">
                <p className="font-semibold">Import cannot continue</p>
                <p className="mt-1 text-muted-foreground">{fileError}</p>
              </div>
              <Button size="sm" variant="outline" onClick={reset}>Reset</Button>
            </div>
          )}

          {hasFile && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4">
                <div>
                  <p className="text-sm font-semibold">{fileName}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {totalRows} total rows detected · {rows.length} valid rows ready for review
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={rows.length ? "success" : "destructive"}>
                    {rows.length ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
                    {rows.length} valid
                  </Badge>
                  {errors.length > 0 && <Badge variant="destructive">{errors.length} validation errors</Badge>}
                </div>
              </div>

              {errors.length > 0 && (
                <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
                  <p className="text-sm font-semibold text-destructive">Fix these rows before importing</p>
                  <div className="mt-3 max-h-44 space-y-2 overflow-auto text-xs text-muted-foreground">
                    {errors.slice(0, 50).map((error) => (
                      <p key={`${error.row}-${error.message}`}>
                        <span className="font-semibold text-foreground">Row {error.row}:</span>{" "}
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
                          <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">#</th>
                          {HEADERS.map((header) => (
                            <th key={header} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.slice(0, 100).map((row, index) => (
                          <tr key={`${row.academicYear}-${row.className}-${row.subject}-${index}`} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                            <td className="px-4 py-3 text-xs text-muted-foreground">{index + 1}</td>
                            {HEADERS.map((header) => (
                              <td key={header} className="whitespace-nowrap px-4 py-3">{row[header]}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {result && (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <p className="text-sm font-bold">Import complete</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {result.created} mappings created · {result.skipped} existing mappings skipped
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={reset} disabled={importing}>
                  <ArrowLeft className="size-4" />
                  Start Over
                </Button>
                <Button
                  onClick={() => void importClassSubjects()}
                  disabled={importing || !!errors.length || duplicateCount > 0 || !rows.length}
                >
                  {importing ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
                  {importing ? "Importing..." : `Import ${rows.length} Mappings`}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
