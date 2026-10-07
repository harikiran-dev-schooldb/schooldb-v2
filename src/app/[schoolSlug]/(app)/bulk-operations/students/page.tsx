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
  RefreshCw,
  UploadCloud,
  UserPlus,
  XCircle,
} from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { BulkDateFormatSelector } from "@/components/bulk/BulkDateFormatSelector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSchool } from "@/contexts/school-context";
import { cn } from "@/lib/utils";
import { bulkDateFormatExample, normalizeBulkDate, type BulkDateFormat } from "@/lib/bulk-date";
import {
  postImportInBatches,
  type ImportProgress,
} from "@/lib/batched-import";
import {
  BULK_STUDENT_UPDATE_FIELDS,
  bulkStudentRowSchema,
  type BulkStudentUpdateField,
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
type BulkMode = "CREATE" | "UPDATE";

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

const BOOLEAN_FIELDS = new Set<BulkStudentUpdateField>([
  "isRte",
  "hostelRequired",
  "transportRequired",
  "whatsappOptIn",
]);

const FIELD_LABELS: Partial<Record<BulkStudentUpdateField, string>> = {
  dob: "Date of Birth",
  imageUrl: "Image URL",
  studentAadhar: "Student Aadhaar",
  apaarId: "APAAR ID",
  penNo: "PEN Number",
  emisNo: "EMIS Number",
  pincode: "PIN Code",
  fatherAadhar: "Father Aadhaar",
  motherAadhar: "Mother Aadhaar",
  isRte: "RTE Status",
  whatsappOptIn: "WhatsApp Opt-in",
};

function fieldLabel(field: BulkStudentUpdateField) {
  return (
    FIELD_LABELS[field] ??
    field.replace(/([A-Z])/g, " $1").replace(/^./, (value) => value.toUpperCase())
  );
}

function updateTemplate(fields: BulkStudentUpdateField[]) {
  const sampleValue = (field: BulkStudentUpdateField) => {
    if (BOOLEAN_FIELDS.has(field)) return "TRUE";
    if (field === "fullName") return "Updated Student Name";
    if (field === "dob" || field === "joinedDate") return "2012-06-15";
    if (field === "gender") return "MALE";
    if (field === "status") return "ACTIVE";
    return "";
  };

  return [
    ["admissionNo", ...fields].join(","),
    ["1001", ...fields.map(sampleValue)].map(csvValue).join(","),
  ].join("\n");
}

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

function parseCsv(text: string, mode: BulkMode, dateFormat: BulkDateFormat) {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (!lines.length) {
    throw new Error("The file is empty.");
  }

  const headers = parseCsvLine(lines[0]);
  const allowedHeaders: readonly StudentHeader[] =
    mode === "UPDATE"
      ? (["admissionNo", ...BULK_STUDENT_UPDATE_FIELDS] as StudentHeader[])
      : HEADERS;
  const requiredHeaders: readonly StudentHeader[] =
    mode === "UPDATE" ? ["admissionNo"] : REQUIRED_FIELDS;
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

  if (mode === "UPDATE" && headers.length < 2) {
    throw new Error("Choose at least one student field to update.");
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

    if (row.gender && !/^(MALE|FEMALE|OTHER)$/i.test(row.gender)) {
      errors.push({
        row: index + 2,
        message: "Gender must be MALE, FEMALE, or OTHER.",
      });
      return;
    }

    const normalizedDob = row.dob ? normalizeBulkDate(row.dob, dateFormat) : null;

    if (row.dob && !normalizedDob) {
      errors.push({
        row: index + 2,
        message: `DOB does not match the selected date format (example: ${bulkDateFormatExample(dateFormat)}).`,
      });
      return;
    }

    if (normalizedDob) row.dob = normalizedDob;

    if (row.joinedDate) {
      const normalizedJoinedDate = normalizeBulkDate(row.joinedDate, dateFormat);

      if (!normalizedJoinedDate) {
        errors.push({
          row: index + 2,
          message: `Joined date does not match the selected date format (example: ${bulkDateFormatExample(dateFormat)}).`,
        });
        return;
      }

      row.joinedDate = normalizedJoinedDate;
    }

    if (mode === "UPDATE") {
      rows.push(row);
      return;
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

function downloadTemplate(mode: BulkMode, fields: BulkStudentUpdateField[]) {
  const template = mode === "UPDATE" ? updateTemplate(fields) : REQUIRED_TEMPLATE;
  const blob = new Blob([template], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download =
    mode === "UPDATE"
      ? "schooldb-student-update-template.csv"
      : "schooldb-students-template.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function BulkStudentsPage() {
  const { school } = useSchool();
  const inputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<BulkMode>("CREATE");
  const [updateFields, setUpdateFields] = useState<BulkStudentUpdateField[]>([
    "isRte",
  ]);
  const [fileName, setFileName] = useState("");
  const [totalRows, setTotalRows] = useState(0);
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [previewHeaders, setPreviewHeaders] = useState<StudentHeader[]>([]);
  const [errors, setErrors] = useState<RowError[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [dateFormat, setDateFormat] = useState<BulkDateFormat | "">("");
  const [result, setResult] = useState<{
    created?: number;
    enrolled?: number;
    skipped?: number;
    updated?: number;
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
  const requiresDateFormat =
    mode === "CREATE" ||
    updateFields.some((field) => field === "dob" || field === "joinedDate");

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

    if (requiresDateFormat && !dateFormat) {
      setFileError("Choose the date format used for DOB and joinedDate before uploading.");
      return;
    }

    try {
      const parsed = parseCsv(await file.text(), mode, dateFormat || "ISO");
      setTotalRows(parsed.totalRows);
      setRows(parsed.rows);
      setPreviewHeaders(parsed.headers);
      if (mode === "UPDATE") {
        setUpdateFields(
          parsed.headers.filter(
            (header): header is BulkStudentUpdateField =>
              header !== "admissionNo" &&
              BULK_STUDENT_UPDATE_FIELDS.includes(
                header as BulkStudentUpdateField,
              ),
          ),
        );
      }
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
          mode === "UPDATE"
            ? "Bulk student update failed."
            : "Bulk student import failed.",
        staticBody: {
          mode,
          ...(mode === "UPDATE" ? { fields: updateFields } : {}),
        },
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
    setDateFormat("");
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
          mode === "UPDATE"
            ? "Update selected fields of existing students using admission numbers."
            : "Upload student records, validate them before import, and review the result."
        }
        action={
          <Button
            variant="outline"
            onClick={() => downloadTemplate(mode, updateFields)}
            disabled={mode === "UPDATE" && updateFields.length === 0}
          >
            <Download className="size-4" />
            {mode === "UPDATE"
              ? "Download Update Template"
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
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <FileSpreadsheet className="size-5" />
              </div>
              <div>
                <CardTitle>
                  {mode === "UPDATE" ? "Update existing students" : "Create students"}
                </CardTitle>
                <p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground">
                  {mode === "UPDATE" ? (
                    <>
                      Choose the profile fields to update. Admission number finds
                      the student; every unselected field remains unchanged.
                    </>
                  ) : (
                    <>
                      Create student records from the five required fields, with
                      optional profile and enrollment columns when needed.
                    </>
                  )}
                </p>
              </div>
            </div>
            <Tabs
              value={mode}
              onValueChange={(value) => changeMode(value as BulkMode)}
              className="shrink-0"
            >
              <TabsList className="grid w-full grid-cols-2 lg:w-[360px]">
                <TabsTrigger value="CREATE" disabled={importing}>
                  <UserPlus className="mr-2 size-4" />
                  Create
                </TabsTrigger>
                <TabsTrigger value="UPDATE" disabled={importing}>
                  <RefreshCw className="mr-2 size-4" />
                  Update
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 p-6">
          {!fileName && requiresDateFormat && (
            <BulkDateFormatSelector
              value={dateFormat}
              onChange={setDateFormat}
              fields={["dob", "joinedDate"]}
              disabled={importing}
            />
          )}
          {mode === "UPDATE" && !fileName && (
            <div className="rounded-2xl border border-border/60 bg-muted/15 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Choose fields to update</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Admission number is always included as the lookup key and is never changed.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setUpdateFields([...BULK_STUDENT_UPDATE_FIELDS])
                    }
                  >
                    Select all
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setUpdateFields([])}
                    disabled={updateFields.length === 0}
                  >
                    Clear
                  </Button>
                  <Badge variant={updateFields.length ? "success" : "destructive"}>
                    {updateFields.length} selected
                  </Badge>
                </div>
              </div>

              {updateFields.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2 rounded-xl border border-primary/10 bg-primary/[0.03] p-3">
                  <span className="mr-1 self-center text-xs font-semibold text-muted-foreground">
                    Template columns:
                  </span>
                  {updateFields.map((field) => (
                    <button
                      type="button"
                      key={field}
                      onClick={() =>
                        setUpdateFields((current) =>
                          current.filter((item) => item !== field),
                        )
                      }
                      className="rounded-full border border-primary/15 bg-background px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:border-destructive/30 hover:text-destructive"
                      title={`Remove ${fieldLabel(field)}`}
                    >
                      {fieldLabel(field)} ×
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-4 grid max-h-72 gap-2 overflow-y-auto pr-2 sm:grid-cols-2 lg:grid-cols-3">
                {BULK_STUDENT_UPDATE_FIELDS.map((field) => {
                  const checked = updateFields.includes(field);
                  return (
                    <label
                      key={field}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors",
                        checked
                          ? "border-primary/25 bg-primary/[0.05] text-foreground"
                          : "border-border/60 bg-background text-muted-foreground hover:border-primary/20 hover:text-foreground",
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(nextChecked) =>
                          setUpdateFields((current) =>
                            nextChecked
                              ? [...current, field]
                              : current.filter((item) => item !== field),
                          )
                        }
                      />
                      <span>{fieldLabel(field)}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

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
              disabled={requiresDateFormat && !dateFormat}
              onClick={() => inputRef.current?.click()}
              className="flex min-h-64 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/70 bg-muted/20 px-6 text-center transition-all hover:border-primary/40 hover:bg-primary/[0.03] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <UploadCloud className="size-7" />
              </div>
              <p className="mt-4 text-base font-bold">Upload student CSV</p>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                {mode === "UPDATE"
                  ? "Choose fields above, download the matching template, and fill one row per admission number."
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
                    {mode === "UPDATE" ? "Student update complete" : "Import complete"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {mode === "UPDATE" ? (
                      <>
                        {result.updated ?? 0} students updated · {result.failed} failed
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
                    ? mode === "UPDATE"
                      ? "Updating..."
                      : "Importing..."
                    : mode === "UPDATE"
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
