"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  UploadCloud,
  XCircle,
} from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSchool } from "@/contexts/school-context";

type AssignmentRow = {
  admissionNo: string;
  academicYear: string;
  feePlanName: string;
};

type RowError = { row: number; message: string };

const HEADERS = ["admissionNo", "academicYear", "feePlanName"] as const;

const TEMPLATE = [
  HEADERS.join(","),
  "1001,2026-27,Annual Fee Plan",
  "1002,2026-27,Annual Fee Plan",
].join("\r\n");

function cleanValue(value: string): string {
  return value
    .replace(/^\uFEFF/, "")
    .replace(/\u00A0/g, " ")
    .trim();
}

function parseLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
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

  const headers = parseLine(lines[0]).map(cleanValue);

  if (headers.join("|") !== HEADERS.join("|")) {
    throw new Error(`Invalid columns. Expected: ${HEADERS.join(", ")}`);
  }

  const rows: AssignmentRow[] = [];
  const errors: RowError[] = [];

  lines.slice(1).forEach((line, index) => {
    const values = parseLine(line);
    const rowNumber = index + 2;
    const admissionNo = cleanValue(values[0] ?? "");
    const academicYear = cleanValue(values[1] ?? "");
    const feePlanName = cleanValue(values[2] ?? "");

    if (!admissionNo || !academicYear || !feePlanName) {
      errors.push({
        row: rowNumber,
        message:
          "Admission number, academic year and fee plan name are required.",
      });
      return;
    }

    rows.push({ admissionNo, academicYear, feePlanName });
  });

  return { rows, errors, totalRows: lines.length - 1 };
}

function downloadTemplate() {
  const blob = new Blob([TEMPLATE], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "schooldb-fee-assignments-template.csv";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function BulkFeeAssignmentsPage() {
  const { school } = useSchool();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<AssignmentRow[]>([]);
  const [errors, setErrors] = useState<RowError[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [fileError, setFileError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    created: number;
    failed: number;
    errors: RowError[];
  } | null>(null);

  const uniquePlans = useMemo(
    () => new Set(rows.map((row) => row.feePlanName.toLowerCase())).size,
    [rows],
  );

  async function handleFile(file: File) {
    setFileName(file.name);
    setRows([]);
    setErrors([]);
    setTotalRows(0);
    setFileError(null);
    setResult(null);

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setFileError(
        "Upload a CSV file using the SchoolDB fee assignment template.",
      );
      return;
    }

    try {
      const parsed = parseCsv(await file.text());
      setRows(parsed.rows);
      setErrors(parsed.errors);
      setTotalRows(parsed.totalRows);
    } catch (error) {
      setFileError(
        error instanceof Error ? error.message : "Unable to read the CSV file.",
      );
    }
  }

  async function importAssignments() {
    if (!rows.length || errors.length > 0 || importing) return;

    setImporting(true);
    setFileError(null);
    setResult(null);

    try {
      const response = await fetch("/api/v1/student-fees/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignments: rows }),
      });

      const payload = (await response.json()) as {
        success?: boolean;
        message?: string;
        data?: { created: number; failed: number; errors: RowError[] };
      };

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.message ?? "Bulk fee assignment failed.");
      }

      setResult(payload.data);
    } catch (error) {
      setFileError(
        error instanceof Error ? error.message : "Bulk fee assignment failed.",
      );
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
        title="Bulk Fee Assignments"
        description="Assign existing fee plans to enrolled students for the matching academic year in a controlled CSV workflow."
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
        <span>Fee Assignments</span>
      </div>

      <Card className="premium-card overflow-hidden rounded-2xl border-0">
        <CardHeader className="border-b border-border/60 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileSpreadsheet className="size-5" />
            </div>
            <div>
              <CardTitle>Fee assignment import</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                CSV: admissionNo, academicYear, feePlanName
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

          {!fileName && !fileError && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex min-h-64 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/70 bg-muted/20 px-6 text-center transition-all hover:border-primary/40 hover:bg-primary/[0.03]"
            >
              <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <UploadCloud className="size-7" />
              </div>
              <p className="mt-4 text-base font-bold">
                Upload fee assignment CSV
              </p>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                Students must already be enrolled in the selected academic year
                and the fee plan must belong to that year.
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
                    {totalRows} rows · {rows.length} valid · {uniquePlans} fee
                    plans
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={rows.length ? "success" : "destructive"}>
                    <CheckCircle2 className="size-3" />
                    {rows.length} valid
                  </Badge>
                  {errors.length > 0 && (
                    <Badge variant="destructive">
                      <XCircle className="size-3" />
                      {errors.length} validation errors
                    </Badge>
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
                  <div className="max-h-[420px] overflow-auto">
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
                            key={`${row.admissionNo}-${row.academicYear}-${row.feePlanName}-${index}`}
                            className="border-b border-border/40 last:border-0 hover:bg-muted/20"
                          >
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              {index + 1}
                            </td>
                            <td className="px-4 py-3">{row.admissionNo}</td>
                            <td className="px-4 py-3">{row.academicYear}</td>
                            <td className="px-4 py-3 font-semibold">
                              {row.feePlanName}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {result && (
                <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                  <p className="text-sm font-semibold">Import completed</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {result.created} assignments created · {result.failed} rows
                    failed.
                  </p>
                  {result.errors.length > 0 && (
                    <div className="mt-3 space-y-1 text-xs text-destructive">
                      {result.errors.map((error) => (
                        <p key={`${error.row}-${error.message}`}>
                          Row {error.row}: {error.message}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" onClick={reset} disabled={importing}>
                  Choose another file
                </Button>
                <Button
                  disabled={!rows.length || errors.length > 0 || importing}
                  onClick={() => void importAssignments()}
                >
                  {importing && <Loader2 className="size-4 animate-spin" />}
                  {importing ? "Importing..." : "Import Assignments"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
