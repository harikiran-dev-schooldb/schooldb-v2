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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSchool } from "@/contexts/school-context";
import { postImportInBatches } from "@/lib/batched-import";

type AssignmentRow = {
  employeeId: string;
  academicYear: string;
  className: string;
  section: string;
  active: string;
  remarks: string;
};

type RowError = { row: number; message: string };

type SkippedRow = RowError &
  Partial<
    Pick<
      AssignmentRow,
      "employeeId" | "academicYear" | "className" | "section"
    >
  >;

type ImportResult = {
  created: number;
  skipped: number;
  failed: number;
  errors: RowError[];
  skippedRows: SkippedRow[];
};

const HEADERS = [
  "employeeId",
  "academicYear",
  "className",
  "section",
  "active",
  "remarks",
] as const;

const TEMPLATE = [
  HEADERS.join(","),
  "T001,2026-27,Class 1,A,true,Primary class teacher",
  "T002,2026-27,Class 1,B,true,",
].join("\n");

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function assignmentKey(row: AssignmentRow) {
  return [row.academicYear, row.className, row.section]
    .map(normalize)
    .join("|");
}

function parseLine(line: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      values.push(current.trim());
      current = "";
    } else {
      current += character;
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

  if (lines.length === 0) throw new Error("The file is empty.");
  const headers = parseLine(lines[0]);
  if (headers.join("|") !== HEADERS.join("|")) {
    throw new Error(`Invalid columns. Expected: ${HEADERS.join(", ")}`);
  }

  const rows: AssignmentRow[] = [];
  const errors: RowError[] = [];
  const keys = new Set<string>();

  lines.slice(1).forEach((line, index) => {
    const values = parseLine(line);
    const row = Object.fromEntries(
      HEADERS.map((header, columnIndex) => [header, values[columnIndex] ?? ""]),
    ) as AssignmentRow;
    const rowNumber = index + 2;

    const required: Array<[keyof AssignmentRow, string]> = [
      ["employeeId", "Employee ID"],
      ["academicYear", "Academic year"],
      ["className", "Class"],
      ["section", "Section"],
    ];
    const missing = required.find(([field]) => !row[field]);
    if (missing) {
      errors.push({ row: rowNumber, message: `${missing[1]} is required.` });
      return;
    }

    const activeValue = row.active || "true";
    if (!/^(true|false|yes|no|1|0)$/i.test(activeValue)) {
      errors.push({
        row: rowNumber,
        message: "Active must be true/false, yes/no, or 1/0.",
      });
      return;
    }
    if (row.remarks.length > 500) {
      errors.push({
        row: rowNumber,
        message: "Remarks must contain 500 characters or fewer.",
      });
      return;
    }

    row.active = /^(true|yes|1)$/i.test(activeValue) ? "true" : "false";
    const key = assignmentKey(row);
    if (keys.has(key)) {
      errors.push({
        row: rowNumber,
        message:
          "Duplicate class and section assignment for this academic year.",
      });
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
  anchor.download = "schooldb-class-teachers-template.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function BulkClassTeachersPage() {
  const { school } = useSchool();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [totalRows, setTotalRows] = useState(0);
  const [rows, setRows] = useState<AssignmentRow[]>([]);
  const [errors, setErrors] = useState<RowError[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const duplicateCount = useMemo(() => {
    const keys = new Set<string>();
    let duplicates = 0;
    for (const row of rows) {
      const key = assignmentKey(row);
      if (keys.has(key)) duplicates += 1;
      keys.add(key);
    }
    return duplicates;
  }, [rows]);

  async function handleFile(file: File) {
    setFileName(file.name);
    setFileError(null);
    setResult(null);
    setTotalRows(0);
    setRows([]);
    setErrors([]);

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setFileError("Upload a CSV using the SchoolDB class teacher template.");
      return;
    }

    try {
      const parsed = parseCsv(await file.text());
      setTotalRows(parsed.totalRows);
      setRows(parsed.rows);
      setErrors(parsed.errors);
    } catch (error) {
      setFileError(
        error instanceof Error ? error.message : "Unable to read the file.",
      );
    }
  }

  async function importAssignments() {
    if (!rows.length || errors.length > 0 || duplicateCount > 0) return;
    setImporting(true);
    setResult(null);
    setFileError(null);

    try {
      const data = await postImportInBatches<
        {
          employeeId: string;
          academicYear: string;
          className: string;
          section: string;
          active: boolean;
          remarks: string | null;
        },
        ImportResult
      >({
        endpoint: "/api/v1/class-teachers/bulk",
        bodyKey: "assignments",
        rows: rows.map((row) => ({
          employeeId: row.employeeId,
          academicYear: row.academicYear,
          className: row.className,
          section: row.section,
          active: row.active === "true",
          remarks: row.remarks.trim() || null,
        })),
        failureMessage: "Bulk class teacher import failed.",
      });
      setResult(data);
      if (data.errors.length > 0) setErrors(data.errors);
    } catch (error) {
      setFileError(
        error instanceof Error
          ? error.message
          : "Bulk class teacher import failed.",
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
    <div className="space-y-6 p-4 pb-12 sm:p-6">
      <PageHeader
        eyebrow="Bulk Operations"
        title="Bulk Class Teachers"
        description="Assign one class teacher to each academic-year class and section combination."
        action={
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="size-4" /> Download Template
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
        <span>Class Teachers</span>
      </div>

      <Card className="premium-card overflow-hidden rounded-2xl border-0">
        <CardHeader className="border-b border-border/60 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileSpreadsheet className="size-5" />
            </div>
            <div>
              <CardTitle>Class teacher import</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                CSV columns: employeeId, academicYear, className, section,
                active, remarks
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Existing assignments are skipped; this import never silently
                replaces another class teacher.
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
              <p className="mt-4 text-base font-bold">
                Upload class teacher CSV
              </p>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Teachers, academic years, classes, and sections are validated
                before any rows in a batch are written.
              </p>
              <p className="mt-2 text-xs font-medium text-muted-foreground">
                Large files are imported in batches of 500 rows
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
              <Button size="sm" variant="outline" onClick={reset}>
                Reset
              </Button>
            </div>
          )}

          {hasFile && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4">
                <div>
                  <p className="text-sm font-semibold">{fileName}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {totalRows} total rows · {rows.length} valid rows ready
                  </p>
                  {rows.length > 500 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {Math.ceil(rows.length / 500)} batches will be processed.
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={rows.length ? "success" : "destructive"}>
                    {rows.length ? (
                      <CheckCircle2 className="size-3" />
                    ) : (
                      <XCircle className="size-3" />
                    )}
                    {rows.length} valid
                  </Badge>
                  {errors.length > 0 && (
                    <Badge variant="destructive">
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
                            key={`${assignmentKey(row)}-${index}`}
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
                  {rows.length > 100 && (
                    <div className="border-t border-border/60 bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
                      Showing the first 100 of {rows.length} valid rows. All
                      rows will be imported.
                    </div>
                  )}
                </div>
              )}

              {result && (
                <div className="space-y-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-5 text-emerald-600" />
                    <p className="text-sm font-bold">Import complete</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {result.created} created · {result.skipped} skipped ·{" "}
                    {result.failed} failed
                  </p>
                  {result.skippedRows.length > 0 && (
                    <div className="rounded-xl border border-border/60 bg-background/60 p-3">
                      <p className="text-xs font-semibold">
                        Existing assignments skipped
                      </p>
                      <div className="mt-2 max-h-40 space-y-1 overflow-auto text-xs text-muted-foreground">
                        {result.skippedRows.slice(0, 50).map((item, index) => (
                          <p key={`${item.row}-${index}`}>
                            <span className="font-semibold text-foreground">
                              Row {item.row}:
                            </span>{" "}
                            {item.employeeId} · {item.className} {item.section}{" "}
                            — {item.message}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={reset} disabled={importing}>
                  <ArrowLeft className="size-4" /> Start Over
                </Button>
                <Button
                  onClick={() => void importAssignments()}
                  disabled={
                    importing ||
                    errors.length > 0 ||
                    duplicateCount > 0 ||
                    rows.length === 0
                  }
                >
                  {importing ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <UploadCloud className="size-4" />
                  )}
                  {importing
                    ? `Importing ${Math.ceil(rows.length / 500)} batches...`
                    : `Import ${rows.length} Assignments`}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
