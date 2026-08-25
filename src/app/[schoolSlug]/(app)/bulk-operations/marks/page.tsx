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

type MarkRow = {
  examName: string;
  academicYear: string;
  className: string;
  sectionName: string;
  subjectName: string;
  admissionNo: string;
  marks: string;
  status: string;
  remarks: string;
};

type RowError = { row: number; message: string };

const HEADERS = [
  "examName",
  "academicYear",
  "className",
  "sectionName",
  "subjectName",
  "admissionNo",
  "marks",
  "status",
  "remarks",
] as const;

const TEMPLATE = [
  HEADERS.join(","),
  "Quarterly Exam 1,2026-27,Class 1,A,Mathematics,ADM001,85,PRESENT,",
  "Quarterly Exam 1,2026-27,Class 1,A,Mathematics,ADM002,72,PRESENT,Good",
  "Quarterly Exam 1,2026-27,Class 1,A,Mathematics,ADM003,,ABSENT,",
].join("\n");

function parseLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (const char of line) {
    if (char === '"') {
      quoted = !quoted;
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

  if (!lines.length) {
    throw new Error("The file is empty.");
  }

  if (parseLine(lines[0]).join("|") !== HEADERS.join("|")) {
    throw new Error(`Invalid columns. Expected: ${HEADERS.join(", ")}`);
  }

  const rows: MarkRow[] = [];
  const errors: RowError[] = [];

  lines.slice(1).forEach((line, index) => {
    const values = parseLine(line);
    const row = Object.fromEntries(
      HEADERS.map((header, position) => [header, values[position] ?? ""]),
    ) as MarkRow;

    const rowNumber = index + 2;
    const status = row.status.trim().toUpperCase();
    const marks = row.marks.trim();

    if (
      !row.examName ||
      !row.academicYear ||
      !row.className ||
      !row.subjectName ||
      !row.admissionNo
    ) {
      errors.push({
        row: rowNumber,
        message:
          "Exam, academic year, class, subject and admission number are required.",
      });
      return;
    }

    if (!["PRESENT", "ABSENT", "EXEMPTED"].includes(status)) {
      errors.push({
        row: rowNumber,
        message: "Status must be PRESENT, ABSENT or EXEMPTED.",
      });
      return;
    }

    if (status === "PRESENT" && !marks) {
      errors.push({
        row: rowNumber,
        message: "Marks are required when status is PRESENT.",
      });
      return;
    }

    if (marks && !Number.isFinite(Number(marks))) {
      errors.push({
        row: rowNumber,
        message: "Marks must be a valid number.",
      });
      return;
    }

    if (status !== "PRESENT" && marks) {
      errors.push({
        row: rowNumber,
        message: `Marks must be blank when status is ${status}.`,
      });
      return;
    }

    rows.push({
      ...row,
      status,
    });
  });

  return {
    rows,
    errors,
    totalRows: lines.length - 1,
  };
}

function downloadTemplate() {
  const blob = new Blob([TEMPLATE], {
    type: "text/csv;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "schooldb-exam-marks-template.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function BulkMarksPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<MarkRow[]>([]);
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

    rows.forEach((row) => {
      const key = [
        row.examName,
        row.academicYear,
        row.className,
        row.sectionName,
        row.subjectName,
        row.admissionNo,
      ]
        .map((value) => value.trim().toLowerCase())
        .join(":");

      counts.set(key, (counts.get(key) ?? 0) + 1);
    });

    return [...counts.values()].filter((count) => count > 1).length;
  }, [rows]);

  async function handleFile(file: File) {
    setFileName(file.name);
    setRows([]);
    setErrors([]);
    setTotalRows(0);
    setFileError(null);
    setResult(null);

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setFileError("Upload a CSV file using the SchoolDB marks template.");
      return;
    }

    try {
      const parsed = parseCsv(await file.text());
      setRows(parsed.rows);
      setErrors(parsed.errors);
      setTotalRows(parsed.totalRows);
    } catch (error) {
      setFileError(
        error instanceof Error ? error.message : "Unable to read the file.",
      );
    }
  }

  async function importMarks() {
    if (!rows.length || errors.length || duplicateCount) return;

    setImporting(true);
    setFileError(null);
    setResult(null);

    try {
      const response = await fetch("/api/v1/exam-marks/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marks: rows }),
      });

      const payload = (await response.json()) as {
        success?: boolean;
        message?: string;
        data?: { created: number; failed: number };
      };

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.message ?? "Bulk marks import failed.");
      }

      setResult(payload.data);
    } catch (error) {
      setFileError(
        error instanceof Error ? error.message : "Bulk marks import failed.",
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

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        eyebrow="Bulk Operations"
        title="Bulk Marks"
        description="Import student examination marks against existing exam schedules."
        action={
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="size-4" />
            Download Template
          </Button>
        }
      />

      <p className="text-xs text-muted-foreground">
        Students must already be enrolled and an exam schedule must already
        exist for the selected class, section and subject.
      </p>

      <Card className="premium-card overflow-hidden rounded-2xl border-0">
        <CardHeader className="border-b border-border/60 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileSpreadsheet className="size-5" />
            </div>
            <div>
              <CardTitle>Marks import</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                CSV columns: examName, academicYear, className, sectionName,
                subjectName, admissionNo, marks, status, remarks
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
              <p className="mt-4 text-base font-bold">Upload marks CSV</p>
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
                            key={`${row.admissionNo}-${row.subjectName}-${index}`}
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
              )}

              {result && (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <p className="text-sm font-bold">Import complete</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {result.created} marks created · {result.failed} failed
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={reset} disabled={importing}>
                  Start Over
                </Button>
                <Button
                  onClick={() => void importMarks()}
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
                  {importing ? "Importing..." : `Import ${rows.length} Marks`}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
