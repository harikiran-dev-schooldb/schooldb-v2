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
import {
  postImportInBatches,
  type ImportProgress,
} from "@/lib/batched-import";

export type CsvRow = Record<string, string>;

type RowError = { row: number; message: string };

type Props = {
  title: string;
  description: string;
  importTitle: string;
  uploadLabel: string;
  entityLabel: string;
  endpoint: string;
  bodyKey: string;
  headers: readonly string[];
  sampleRows: readonly (readonly string[])[];
  templateFileName: string;
  validateRow: (row: CsvRow) => string | null;
  normalizeRow?: (row: CsvRow) => CsvRow;
  duplicateKey: (row: CsvRow) => string;
  duplicateLabel: string;
};

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

function escapeCsv(value: string) {
  return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

function formatResult(data: Record<string, unknown>, entityLabel: string) {
  const entries = Object.entries(data).filter(([, value]) => typeof value === "number");
  if (!entries.length) return `${entityLabel} import completed successfully.`;
  return entries
    .map(([key, value]) => `${String(value)} ${key.replaceAll(/([A-Z])/g, " $1").toLowerCase()}`)
    .join(" · ");
}

export function BulkCsvImport({
  title,
  description,
  importTitle,
  uploadLabel,
  entityLabel,
  endpoint,
  bodyKey,
  headers,
  sampleRows,
  templateFileName,
  validateRow,
  normalizeRow = (row) => row,
  duplicateKey,
  duplicateLabel,
}: Props) {
  const { school } = useSchool();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [totalRows, setTotalRows] = useState(0);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [errors, setErrors] = useState<RowError[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);

  const duplicates = useMemo(() => {
    const seen = new Set<string>();
    const repeated = new Set<string>();
    for (const row of rows) {
      const key = duplicateKey(row).trim().toLowerCase();
      if (seen.has(key)) repeated.add(key);
      else seen.add(key);
    }
    return repeated.size;
  }, [duplicateKey, rows]);

  function reset() {
    setFileName("");
    setTotalRows(0);
    setRows([]);
    setErrors([]);
    setMessage(null);
    setResult(null);
    setProgress(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function downloadTemplate() {
    const csv = [
      headers.map(escapeCsv).join(","),
      ...sampleRows.map((row) => row.map(escapeCsv).join(",")),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = templateFileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function handleFile(file: File) {
    reset();
    setFileName(file.name);
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setMessage(`Please upload a CSV file using the SchoolDB ${entityLabel.toLowerCase()} template.`);
      return;
    }

    try {
      const lines = (await file.text())
        .replace(/^\uFEFF/, "")
        .split(/\r?\n/)
        .filter((line) => line.trim());
      if (!lines.length) throw new Error("The file is empty.");
      const actualHeaders = parseCsvLine(lines[0]);
      if (actualHeaders.join("|") !== headers.join("|")) {
        throw new Error(`Invalid columns. Download and use the latest template.`);
      }
      const validRows: CsvRow[] = [];
      const rowErrors: RowError[] = [];
      lines.slice(1).forEach((line, index) => {
        try {
          const values = parseCsvLine(line);
          if (values.length > headers.length) {
            rowErrors.push({ row: index + 2, message: "This row contains more columns than the template." });
            return;
          }
          const row = Object.fromEntries(headers.map((header, column) => [header, values[column] ?? ""]));
          const error = validateRow(row);
          if (error) rowErrors.push({ row: index + 2, message: error });
          else validRows.push(normalizeRow(row));
        } catch (error) {
          rowErrors.push({ row: index + 2, message: error instanceof Error ? error.message : "Unable to read this row." });
        }
      });

      setTotalRows(lines.length - 1);
      setRows(validRows);
      setErrors(rowErrors);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to read the CSV file.");
    }
  }

  async function runImport() {
    if (!rows.length || errors.length || duplicates) return;
    setImporting(true);
    setMessage(null);
    setResult(null);
    try {
      const data = await postImportInBatches<CsvRow, Record<string, unknown>>({
        endpoint,
        bodyKey,
        rows,
        onProgress: setProgress,
        failureMessage: `${entityLabel} import failed.`,
      });
      setResult(formatResult(data, entityLabel));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `${entityLabel} import failed.`);
    } finally {
      setImporting(false);
    }
  }

  const hasFile = Boolean(fileName) && !message;

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        eyebrow="Bulk Operations"
        title={title}
        description={description}
        action={
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="size-4" />
            Download Template
          </Button>
        }
      />

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link href={`/${school.slug}/bulk-operations`} className="font-semibold text-primary hover:underline">
          Bulk Operations
        </Link>
        <span>/</span>
        <span>{entityLabel}</span>
      </div>

      <Card className="premium-card overflow-hidden rounded-2xl border-0">
        <CardHeader className="border-b border-border/60 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileSpreadsheet className="size-5" />
            </div>
            <div>
              <CardTitle>{importTitle}</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">Upload the complete CSV. SchoolDB processes it safely in batches of 500 rows.</p>
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

          {!hasFile && !message ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex min-h-64 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/70 bg-muted/20 px-6 text-center transition-all hover:border-primary/40 hover:bg-primary/[0.03]"
            >
              <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <UploadCloud className="size-7" />
              </div>
              <p className="mt-4 text-base font-bold">{uploadLabel}</p>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">Every row is checked before any database changes are made.</p>
            </button>
          ) : null}

          {message ? (
            <div className="flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
              <XCircle className="mt-0.5 size-5 text-destructive" />
              <div className="flex-1">
                <p className="text-sm font-semibold">Import cannot continue</p>
                <p className="mt-1 text-sm text-muted-foreground">{message}</p>
              </div>
              <Button size="sm" variant="outline" onClick={reset}>Reset</Button>
            </div>
          ) : null}

          {hasFile ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4">
                <div>
                  <p className="text-sm font-semibold">{fileName}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{totalRows} rows detected · {rows.length} valid</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={rows.length ? "success" : "destructive"}>
                    {rows.length ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
                    {rows.length} valid
                  </Badge>
                  {duplicates ? <Badge variant="destructive">{duplicates} duplicate {duplicateLabel}</Badge> : null}
                  {errors.length ? <Badge variant="destructive">{errors.length} errors</Badge> : null}
                </div>
              </div>

              {errors.length ? (
                <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
                  <p className="text-sm font-semibold text-destructive">Fix these rows before importing</p>
                  <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                    {errors.slice(0, 50).map((error) => (
                      <p key={`${error.row}-${error.message}`}><span className="font-semibold text-foreground">Row {error.row}:</span> {error.message}</p>
                    ))}
                  </div>
                </div>
              ) : null}

              {rows.length ? (
                <div className="overflow-auto rounded-2xl border border-border/60">
                  <table className="w-full text-sm">
                    <thead className="border-b border-border/60 bg-card">
                      <tr>
                        <th className="px-4 py-3 text-left">#</th>
                        {headers.map((header) => <th key={header} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold">{header}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 100).map((row, index) => (
                        <tr key={`${duplicateKey(row)}-${index}`} className="border-b border-border/40">
                          <td className="px-4 py-3 text-xs text-muted-foreground">{index + 1}</td>
                          {headers.map((header) => <td key={header} className="max-w-64 whitespace-nowrap px-4 py-3">{row[header]}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}

              {result ? (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <p className="text-sm font-bold">Import complete</p>
                  <p className="mt-1 text-xs text-muted-foreground">{result}</p>
                </div>
              ) : null}

              {importing && progress ? (
                <div className="space-y-2 rounded-2xl border border-primary/20 bg-primary/5 p-4">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Batch {Math.min(progress.completedBatches + 1, progress.totalBatches)} of {progress.totalBatches}</span>
                    <span>{progress.completedRows} / {progress.totalRows} rows</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-primary/10">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(progress.completedRows / progress.totalRows) * 100}%` }} />
                  </div>
                </div>
              ) : null}

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={reset} disabled={importing}>
                  <ArrowLeft className="size-4" /> Start Over
                </Button>
                <Button onClick={() => void runImport()} disabled={importing || Boolean(errors.length) || Boolean(duplicates) || !rows.length}>
                  {importing ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
                  {importing ? "Importing..." : `Import ${rows.length} Rows`}
                </Button>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
