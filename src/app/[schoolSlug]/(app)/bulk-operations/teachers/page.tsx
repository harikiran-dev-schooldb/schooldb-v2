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

type TeacherRow = {
  employeeId: string;
  fullName: string;
  gender: string;
  dob: string;
  joiningDate: string;
  phone: string;
  email: string;
  qualification: string;
  designation: string;
  active: string;
};

type RowError = { row: number; message: string };

const HEADERS: Array<keyof TeacherRow> = [
  "employeeId",
  "fullName",
  "gender",
  "dob",
  "joiningDate",
  "phone",
  "email",
  "qualification",
  "designation",
  "active",
];

const TEMPLATE = [
  HEADERS.join(","),
  "T001,Rahul Kumar,MALE,1988-06-15,2020-06-01,9876543210,rahul@example.com,M.Ed,Teacher,true",
  "T002,Anjali Rao,FEMALE,1990-02-20,2021-06-01,9876543211,anjali@example.com,B.Ed,Teacher,true",
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

function normalizeDate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const short = /^(\d{2})\/(\d{2})\/(\d{2})$/.exec(trimmed);
  if (!short) return null;

  const [, day, month, year] = short;
  const fullYear = Number(year) >= 50 ? `19${year}` : `20${year}`;
  const date = new Date(`${fullYear}-${month}-${day}T00:00:00`);

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== Number(fullYear) ||
    date.getMonth() + 1 !== Number(month) ||
    date.getDate() !== Number(day)
  ) {
    return null;
  }

  return `${fullYear}-${month}-${day}`;
}

function parseCsv(text: string) {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (!lines.length) throw new Error("The file is empty.");

  const headers = parseCsvLine(lines[0]);
  if (headers.join("|") !== HEADERS.join("|")) {
    throw new Error(`Invalid columns. Expected: ${HEADERS.join(", ")}`);
  }

  const rows: TeacherRow[] = [];
  const errors: RowError[] = [];

  lines.slice(1).forEach((line, index) => {
    const values = parseCsvLine(line);
    const row = Object.fromEntries(
      HEADERS.map((header, columnIndex) => [header, values[columnIndex] ?? ""]),
    ) as TeacherRow;

    if (!row.employeeId || row.fullName.length < 3 || !row.gender) {
      errors.push({ row: index + 2, message: "Employee ID, full name, and gender are required." });
      return;
    }

    if (!/^(MALE|FEMALE|OTHER)$/i.test(row.gender)) {
      errors.push({ row: index + 2, message: "Gender must be MALE, FEMALE, or OTHER." });
      return;
    }

    const dob = normalizeDate(row.dob);
    const joiningDate = normalizeDate(row.joiningDate);

    if (row.dob && !dob) {
      errors.push({ row: index + 2, message: "DOB must use YYYY-MM-DD or DD/MM/YY format." });
      return;
    }

    if (row.joiningDate && !joiningDate) {
      errors.push({ row: index + 2, message: "Joining date must use YYYY-MM-DD or DD/MM/YY format." });
      return;
    }

    if (row.email && !/^\S+@\S+\.\S+$/.test(row.email)) {
      errors.push({ row: index + 2, message: "Invalid email address." });
      return;
    }

    if (!/^(true|false|yes|no|1|0)$/i.test(row.active)) {
      errors.push({ row: index + 2, message: "Active must be true/false, yes/no, or 1/0." });
      return;
    }

    row.gender = row.gender.toUpperCase();
    row.dob = dob ?? "";
    row.joiningDate = joiningDate ?? "";
    row.active = /^(true|yes|1)$/i.test(row.active) ? "true" : "false";
    rows.push(row);
  });

  return { rows, errors, totalRows: lines.length - 1 };
}

function downloadTemplate() {
  const blob = new Blob([TEMPLATE], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "schooldb-teachers-template.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function BulkTeachersPage() {
  const { school } = useSchool();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [totalRows, setTotalRows] = useState(0);
  const [rows, setRows] = useState<TeacherRow[]>([]);
  const [errors, setErrors] = useState<RowError[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ created: number; failed: number } | null>(null);

  const duplicateCount = useMemo(() => {
    const counts = new Map<string, number>();
    rows.forEach((row) => counts.set(row.employeeId, (counts.get(row.employeeId) ?? 0) + 1));
    return [...counts.values()].filter((count) => count > 1).length;
  }, [rows]);

  async function handleFile(file: File) {
    setFileName(file.name);
    setFileError(null);
    setResult(null);
    setTotalRows(0);
    setRows([]);
    setErrors([]);

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setFileError("Upload a CSV file using the SchoolDB teacher template.");
      return;
    }

    try {
      const parsed = parseCsv(await file.text());
      setTotalRows(parsed.totalRows);
      setRows(parsed.rows);
      setErrors(parsed.errors);
    } catch (error) {
      setFileError(error instanceof Error ? error.message : "Unable to read the file.");
    }
  }

  async function importTeachers() {
    if (!rows.length || errors.length || duplicateCount) return;
    setImporting(true);
    setResult(null);

    try {
      const response = await fetch("/api/v1/teachers/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teachers: rows.map((row) => ({
            ...row,
            active: row.active === "true",
          })),
        }),
      });

      const payload = (await response.json()) as {
        success?: boolean;
        message?: string;
        data?: { created: number; failed: number; errors: RowError[] };
      };

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.message ?? "Bulk teacher import failed.");
      }

      setResult(payload.data);
      if (payload.data.errors.length) {
        setErrors(payload.data.errors);
      }
    } catch (error) {
      setFileError(error instanceof Error ? error.message : "Bulk teacher import failed.");
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
        title="Bulk Teachers"
        description="Upload teacher records, validate them before import, and review the result."
        action={<Button variant="outline" onClick={downloadTemplate}><Download className="size-4" />Download Template</Button>}
      />

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link href={`/${school.slug}/bulk-operations`} className="font-semibold text-primary hover:underline">Bulk Operations</Link>
        <span>/</span><span>Teachers</span>
      </div>

      <Card className="premium-card overflow-hidden rounded-2xl border-0">
        <CardHeader className="border-b border-border/60 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><FileSpreadsheet className="size-5" /></div>
            <div>
              <CardTitle>Teacher import</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">CSV columns: employeeId, fullName, gender, dob, joiningDate, phone, email, qualification, designation, active</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 p-6">
          <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleFile(file); }} />

          {!hasFile && !fileError && (
            <button type="button" onClick={() => inputRef.current?.click()} className="flex min-h-64 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/70 bg-muted/20 px-6 text-center transition-all hover:border-primary/40 hover:bg-primary/[0.03]">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><UploadCloud className="size-7" /></div>
              <p className="mt-4 text-base font-bold">Upload teacher CSV</p>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">Validation happens before any database changes.</p>
            </button>
          )}

          {fileError && (
            <div className="flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
              <XCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
              <div className="flex-1 text-sm"><p className="font-semibold">Import cannot continue</p><p className="mt-1 text-muted-foreground">{fileError}</p></div>
              <Button size="sm" variant="outline" onClick={reset}>Reset</Button>
            </div>
          )}

          {hasFile && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4">
                <div><p className="text-sm font-semibold">{fileName}</p><p className="mt-1 text-xs text-muted-foreground">{totalRows} total rows detected · {rows.length} valid rows ready for review</p></div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={rows.length ? "success" : "destructive"}>{rows.length ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}{rows.length} valid</Badge>
                  {duplicateCount > 0 && <Badge variant="destructive">{duplicateCount} duplicate employee IDs</Badge>}
                  {errors.length > 0 && <Badge variant="destructive">{errors.length} validation errors</Badge>}
                </div>
              </div>

              {errors.length > 0 && <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4"><p className="text-sm font-semibold text-destructive">Fix these rows before importing</p><div className="mt-3 max-h-44 space-y-2 overflow-auto text-xs text-muted-foreground">{errors.slice(0, 50).map((error) => <p key={`${error.row}-${error.message}`}><span className="font-semibold text-foreground">Row {error.row}:</span> {error.message}</p>)}</div></div>}

              {rows.length > 0 && <div className="overflow-hidden rounded-2xl border border-border/60"><div className="max-h-[460px] overflow-auto"><table className="w-full text-sm"><thead className="sticky top-0 z-10 border-b border-border/60 bg-card"><tr><th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">#</th>{HEADERS.map((header) => <th key={header} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{header}</th>)}</tr></thead><tbody>{rows.slice(0, 100).map((row, index) => <tr key={`${row.employeeId}-${index}`} className="border-b border-border/40 last:border-0 hover:bg-muted/20"><td className="px-4 py-3 text-xs text-muted-foreground">{index + 1}</td>{HEADERS.map((header) => <td key={header} className="whitespace-nowrap px-4 py-3">{row[header]}</td>)}</tr>)}</tbody></table></div>{rows.length > 100 && <p className="border-t border-border/60 px-4 py-3 text-xs text-muted-foreground">Showing the first 100 rows. All {rows.length} valid rows will be imported.</p>}</div>}

              {result && <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4"><p className="text-sm font-bold">Import complete</p><p className="mt-1 text-xs text-muted-foreground">{result.created} teachers created · {result.failed} failed</p></div>}

              <div className="flex flex-wrap justify-end gap-3"><Button variant="outline" onClick={reset} disabled={importing}><ArrowLeft className="size-4" />Start Over</Button><Button onClick={() => void importTeachers()} disabled={importing || !!errors.length || duplicateCount > 0 || !rows.length}>{importing ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}{importing ? "Importing..." : `Import ${rows.length} Teachers`}</Button></div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
