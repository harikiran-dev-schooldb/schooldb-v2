"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  KeyRound,
  Loader2,
  UploadCloud,
  XCircle,
} from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSchool } from "@/contexts/school-context";
import {
  postImportInBatches,
  type ImportProgress,
} from "@/lib/batched-import";
import {
  bulkStudentRowSchema,
  bulkStudentRteUpdateRowSchema,
  normalizeBulkStudentDate,
} from "@/features/students/schemas/bulk-student.schema";

const HEADERS = [
  "admissionNo",
  "fullName",
  "gender",
  "dob",
  "status",
  "academicYear",
  "className",
  "sectionName",
  "rollNo",
  "joinedDate",
  "phone",
  "alternatePhone",
  "email",
  "imageUrl",
  "studentAadhar",
  "apaarId",
  "penNo",
  "emisNo",
  "bloodGroup",
  "nationality",
  "motherTongue",
  "religion",
  "category",
  "caste",
  "subCaste",
  "address",
  "city",
  "district",
  "state",
  "pincode",
  "country",
  "fatherName",
  "fatherPhone",
  "fatherEmail",
  "fatherAadhar",
  "fatherOccupation",
  "fatherQualification",
  "fatherIncome",
  "motherName",
  "motherPhone",
  "motherEmail",
  "motherAadhar",
  "motherOccupation",
  "motherQualification",
  "motherIncome",
  "guardianName",
  "guardianPhone",
  "guardianRelation",
  "doctorName",
  "doctorPhone",
  "medicalConditions",
  "allergies",
  "isRte",
  "hostelRequired",
  "transportRequired",
  "whatsappOptIn",
  "remarks",
] as const;

type StudentHeader = (typeof HEADERS)[number];
type StudentRow = Record<StudentHeader, string>;
type BulkMode = "CREATE" | "UPDATE_RTE";

type RowError = {
  row: number;
  message: string;
};

const REQUIRED_FIELDS: StudentHeader[] = [
  "admissionNo",
  "fullName",
  "gender",
  "dob",
  "status",
];
const RTE_UPDATE_FIELDS = ["admissionNo", "isRte"] as const satisfies readonly StudentHeader[];

const STUDENT_IMPORT_BATCH_SIZE = 25;

function csvValue(value: string) {
  return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

const REQUIRED_TEMPLATE = [
  REQUIRED_FIELDS.join(","),
  ["1001", "Rahul Kumar", "MALE", "2012-06-15", "ACTIVE"]
    .map(csvValue)
    .join(","),
  ["1002", "Anjali Rao", "FEMALE", "2013-02-20", "ACTIVE"]
    .map(csvValue)
    .join(","),
].join("\n");

const RTE_UPDATE_TEMPLATE = [
  RTE_UPDATE_FIELDS.join(","),
  ["1001", "TRUE"].map(csvValue).join(","),
  ["1002", "FALSE"].map(csvValue).join(","),
].join("\n");

function parseCsvLine(line: string) {
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

function parseCsv(text: string, mode: BulkMode) {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (!lines.length) {
    throw new Error("The file is empty.");
  }

  const headers = parseCsvLine(lines[0]);
  const allowedHeaders: readonly StudentHeader[] =
    mode === "UPDATE_RTE" ? RTE_UPDATE_FIELDS : HEADERS;
  const requiredHeaders: readonly StudentHeader[] =
    mode === "UPDATE_RTE" ? RTE_UPDATE_FIELDS : REQUIRED_FIELDS;
  const duplicateHeaders = headers.filter(
    (header, index) => headers.indexOf(header) !== index,
  );
  const unsupportedHeaders = headers.filter(
    (header) => !allowedHeaders.includes(header as StudentHeader),
  );
  const missingHeaders = requiredHeaders.filter(
    (header) => !headers.includes(header),
  );

  if (duplicateHeaders.length) {
    throw new Error(
      `Duplicate columns: ${[...new Set(duplicateHeaders)].join(", ")}`,
    );
  }

  if (unsupportedHeaders.length) {
    throw new Error(`Unsupported columns: ${unsupportedHeaders.join(", ")}`);
  }

  if (missingHeaders.length) {
    throw new Error(`Missing required columns: ${missingHeaders.join(", ")}`);
  }

  const rows: StudentRow[] = [];
  const errors: RowError[] = [];

  lines.slice(1).forEach((line, index) => {
    const values = parseCsvLine(line);
    const row = Object.fromEntries(HEADERS.map((header) => [header, ""])) as StudentRow;

    headers.forEach((header, columnIndex) => {
      row[header as StudentHeader] = values[columnIndex] ?? "";
    });

    const missing = requiredHeaders.filter((header) => !row[header]);

    if (missing.length) {
      errors.push({
        row: index + 2,
        message: `Missing: ${missing.join(", ")}`,
      });
      return;
    }

    if (mode === "UPDATE_RTE") {
      const validated = bulkStudentRteUpdateRowSchema.safeParse({
        admissionNo: row.admissionNo,
        isRte: row.isRte,
      });

      if (!validated.success) {
        errors.push({
          row: index + 2,
          message: validated.error.issues
            .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
            .join("; "),
        });
        return;
      }

      rows.push(row);
      return;
    }

    if (!/^(MALE|FEMALE|OTHER)$/i.test(row.gender)) {
      errors.push({
        row: index + 2,
        message: "Gender must be MALE, FEMALE, or OTHER.",
      });
      return;
    }

    const normalizedDob = normalizeBulkStudentDate(row.dob);

    if (!normalizedDob) {
      errors.push({
        row: index + 2,
        message:
          "DOB must use YYYY-MM-DD, DD-MM-YYYY, or DD/MM/YYYY; 2-digit years are also accepted.",
      });
      return;
    }

    row.dob = normalizedDob;

    if (row.joinedDate) {
      const normalizedJoinedDate = normalizeBulkStudentDate(row.joinedDate);

      if (!normalizedJoinedDate) {
        errors.push({
          row: index + 2,
          message:
            "Joined date must use YYYY-MM-DD, DD-MM-YYYY, or DD/MM/YYYY; 2-digit years are also accepted.",
        });
        return;
      }

      row.joinedDate = normalizedJoinedDate;
    }

    const validated = bulkStudentRowSchema.safeParse(row);

    if (!validated.success) {
      errors.push({
        row: index + 2,
        message: validated.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join("; "),
      });
      return;
    }

    rows.push(row);
  });

  return {
    rows,
    errors,
    headers: headers as StudentHeader[],
    totalRows: lines.length - 1,
  };
}

function downloadTemplate(mode: BulkMode) {
  const template = mode === "UPDATE_RTE" ? RTE_UPDATE_TEMPLATE : REQUIRED_TEMPLATE;
  const blob = new Blob([template], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download =
    mode === "UPDATE_RTE"
      ? "schooldb-student-rte-update-template.csv"
      : "schooldb-students-template.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function BulkStudentsPage() {
  const { school } = useSchool();
  const inputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<BulkMode>("CREATE");
  const [fileName, setFileName] = useState("");
  const [totalRows, setTotalRows] = useState(0);
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [previewHeaders, setPreviewHeaders] = useState<StudentHeader[]>([]);
  const [errors, setErrors] = useState<RowError[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [result, setResult] = useState<{
    created?: number;
    enrolled?: number;
    skipped?: number;
    updated?: number;
    unchanged?: number;
    failed: number;
    errors: RowError[];
  } | null>(null);

  const duplicateCount = useMemo(() => {
    const counts = new Map<string, number>();
    rows.forEach((row) =>
      counts.set(row.admissionNo, (counts.get(row.admissionNo) ?? 0) + 1),
    );
    return [...counts.values()].filter((count) => count > 1).length;
  }, [rows]);

  async function handleFile(file: File) {
    setFileError(null);
    setResult(null);
    setFileName(file.name);
    setTotalRows(0);
    setRows([]);
    setPreviewHeaders([]);
    setErrors([]);

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setFileError(
        "For this first version, upload a CSV template. Excel (.xlsx) support will use the same validation engine next.",
      );
      return;
    }

    try {
      const parsed = parseCsv(await file.text(), mode);
      setTotalRows(parsed.totalRows);
      setRows(parsed.rows);
      setPreviewHeaders(parsed.headers);
      setErrors(parsed.errors);
    } catch (error) {
      setFileError(
        error instanceof Error ? error.message : "Unable to read the file.",
      );
    }
  }

  async function importStudents() {
    if (!rows.length || errors.length || duplicateCount) return;

    setImporting(true);
    setResult(null);

    try {
      const data = await postImportInBatches<
        StudentRow,
        {
          created?: number;
          enrolled?: number;
          skipped?: number;
          updated?: number;
          unchanged?: number;
          failed: number;
          errors: RowError[];
        }
      >({
        endpoint: "/api/v1/students/bulk",
        bodyKey: "students",
        rows,
        batchSize: STUDENT_IMPORT_BATCH_SIZE,
        onProgress: setProgress,
        failureMessage:
          mode === "UPDATE_RTE"
            ? "Bulk RTE status update failed."
            : "Bulk student import failed.",
        staticBody: { mode },
      });

      setResult(data);
    } catch (error) {
      setFileError(
        error instanceof Error ? error.message : "Bulk import failed.",
      );
    } finally {
      setImporting(false);
    }
  }

  function reset() {
    setFileName("");
    setTotalRows(0);
    setRows([]);
    setPreviewHeaders([]);
    setErrors([]);
    setFileError(null);
    setResult(null);
    setProgress(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function changeMode(nextMode: BulkMode) {
    reset();
    setMode(nextMode);
  }

  const hasFileResult = Boolean(fileName) && !fileError;

  return (
    <div className="space-y-6 p-4 pb-12 sm:p-6">
      <PageHeader
        eyebrow="Bulk Operations"
        title="Bulk Students"
        description={
          mode === "UPDATE_RTE"
            ? "Update only the RTE status of existing students using admission numbers."
            : "Upload student records, validate them before import, and review the result."
        }
        action={
          <Button variant="outline" onClick={() => downloadTemplate(mode)}>
            <Download className="size-4" />
            {mode === "UPDATE_RTE"
              ? "Download RTE Update Template"
              : "Download Required Fields Template"}
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
        <span>Students</span>
      </div>

      <Card className="premium-card overflow-hidden rounded-2xl border-0">
        <CardHeader className="border-b border-border/60 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileSpreadsheet className="size-5" />
            </div>
            <div>
              <CardTitle>
                {mode === "UPDATE_RTE" ? "Update student RTE status" : "Student import"}
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                {mode === "UPDATE_RTE" ? (
                  <>
                    Upload only admissionNo and isRte. Matching students are
                    updated without changing any other profile or enrollment data.
                  </>
                ) : (
                  <>
                    The template contains only the five required fields. SchoolDB
                    also accepts supported optional columns for extra profile or
                    enrollment data. Login accounts are not created during import.
                  </>
                )}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              type="button"
              variant={mode === "CREATE" ? "default" : "outline"}
              className="h-auto justify-start px-4 py-3 text-left"
              onClick={() => changeMode("CREATE")}
              disabled={importing}
            >
              <span>
                <span className="block font-semibold">Create students</span>
                <span className="mt-1 block text-xs opacity-80">
                  Add new student records from required or extended fields.
                </span>
              </span>
            </Button>
            <Button
              type="button"
              variant={mode === "UPDATE_RTE" ? "default" : "outline"}
              className="h-auto justify-start px-4 py-3 text-left"
              onClick={() => changeMode("UPDATE_RTE")}
              disabled={importing}
            >
              <span>
                <span className="block font-semibold">Update RTE status</span>
                <span className="mt-1 block text-xs opacity-80">
                  Change only isRte using each student&apos;s admission number.
                </span>
              </span>
            </Button>
          </div>

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

          {!hasFileResult && !fileError && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex min-h-64 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/70 bg-muted/20 px-6 text-center transition-all hover:border-primary/40 hover:bg-primary/[0.03]"
            >
              <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <UploadCloud className="size-7" />
              </div>
              <p className="mt-4 text-base font-bold">Upload student CSV</p>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                {mode === "UPDATE_RTE"
                  ? "Use the RTE update template with admissionNo and isRte columns."
                  : "Use the required-fields template; optional supported columns may also be added."}
                {" "}Validation happens before any database changes.
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

          {hasFileResult && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4">
                <div>
                  <p className="text-sm font-semibold">{fileName}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {totalRows} total rows detected · {rows.length} valid rows
                    ready for review
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={rows.length ? "success" : "destructive"}>
                    {rows.length ? (
                      <CheckCircle2 className="size-3" />
                    ) : (
                      <XCircle className="size-3" />
                    )}
                    {rows.length} valid
                  </Badge>
                  {duplicateCount > 0 && (
                    <Badge variant="destructive">
                      {duplicateCount} duplicate admission numbers
                    </Badge>
                  )}
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
                          {previewHeaders.map((header) => (
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
                            key={`${row.admissionNo}-${index}`}
                            className="border-b border-border/40 last:border-0 hover:bg-muted/20"
                          >
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              {index + 1}
                            </td>
                            {previewHeaders.map((header) => (
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
                    <p className="border-t border-border/60 px-4 py-3 text-xs text-muted-foreground">
                      Showing the first 100 rows. All {rows.length} valid rows
                      will be imported.
                    </p>
                  )}
                </div>
              )}

              {result && (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <p className="text-sm font-bold">
                    {mode === "UPDATE_RTE" ? "RTE update complete" : "Import complete"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {mode === "UPDATE_RTE" ? (
                      <>
                        {result.updated ?? 0} students updated · {result.unchanged ?? 0}{" "}
                        already matched · {result.failed} failed
                      </>
                    ) : (
                      <>
                        {result.created ?? 0} students created · {result.enrolled ?? 0}{" "}
                        enrolled · {result.skipped ?? 0} existing rows skipped · {result.failed} failed
                      </>
                    )}
                  </p>
                  {result.errors.length > 0 && (
                    <div className="mt-3 max-h-40 space-y-2 overflow-auto rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs text-muted-foreground">
                      {result.errors.slice(0, 50).map((error) => (
                        <p key={`${error.row}-${error.message}`}>
                          <span className="font-semibold text-foreground">
                            Row {error.row}:
                          </span>{" "}
                          {error.message}
                        </p>
                      ))}
                    </div>
                  )}
                  {mode === "CREATE" && (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/70 p-3">
                      <p className="text-xs text-muted-foreground">
                        No Clerk accounts were created. Create login access separately only for students who need it.
                      </p>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/${school.slug}/bulk-operations/student-logins`}>
                          <KeyRound className="size-4" />
                          Create student logins
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {importing && progress && (
                <div className="space-y-2 rounded-2xl border border-primary/20 bg-primary/5 p-4">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Batch {Math.min(progress.completedBatches + 1, progress.totalBatches)} of {progress.totalBatches}</span>
                    <span>{progress.completedRows} / {progress.totalRows} rows</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-primary/10">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(progress.completedRows / progress.totalRows) * 100}%` }} />
                  </div>
                </div>
              )}

              <div className="flex flex-wrap justify-end gap-3">
                <Button variant="outline" onClick={reset} disabled={importing}>
                  <ArrowLeft className="size-4" />
                  Start Over
                </Button>
                <Button
                  onClick={() => void importStudents()}
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
                  {importing
                    ? mode === "UPDATE_RTE"
                      ? "Updating..."
                      : "Importing..."
                    : mode === "UPDATE_RTE"
                      ? `Update ${rows.length} Students`
                      : `Import ${rows.length} Students`}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
