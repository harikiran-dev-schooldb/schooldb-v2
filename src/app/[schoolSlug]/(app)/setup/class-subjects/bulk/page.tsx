"use client";

import { useMemo, useState } from "react";
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
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { RemoteCombobox } from "@/components/common/combobox/RemoteCombobox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSchool } from "@/contexts/school-context";


type ImportRow = {
  className: string;
  subjectName: string;
  active?: boolean;
};

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
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

function parseCsv(text: string): ImportRow[] {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error("The CSV must contain a header and at least one row.");
  }

  const headers = parseCsvLine(lines[0]).map((header) =>
    header.toLowerCase().replace(/\s+/g, "").replace(/_/g, ""),
  );

  const classIndex = headers.indexOf("class");
  const subjectIndex = headers.indexOf("subject");
  const activeIndex = headers.indexOf("active");

  if (classIndex === -1 || subjectIndex === -1) {
    throw new Error('CSV headers must contain "Class" and "Subject".');
  }

  return lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line);
    const className = values[classIndex] ?? "";
    const subjectName = values[subjectIndex] ?? "";
    const activeValue = activeIndex === -1 ? "" : (values[activeIndex] ?? "");

    if (!className || !subjectName) {
      throw new Error(`Row ${index + 2}: Class and Subject are required.`);
    }

    return {
      className,
      subjectName,
      ...(activeValue
        ? { active: !["false", "0", "no", "inactive"].includes(activeValue.toLowerCase()) }
        : {}),
    };
  });
}

export default function BulkClassSubjectsPage() {
  const { school } = useSchool();
  const [academicYearId, setAcademicYearId] = useState("");
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);

  const duplicateCount = useMemo(() => {
    const seen = new Set<string>();
    let duplicates = 0;

    for (const row of rows) {
      const key = `${row.className.toLowerCase()}::${row.subjectName.toLowerCase()}`;
      if (seen.has(key)) duplicates += 1;
      seen.add(key);
    }

    return duplicates;
  }, [rows]);

  function downloadTemplate() {
    const csv = [
      "Class,Subject,Active",
      "Class 1,English,true",
      "Class 1,Mathematics,true",
      "Class 2,English,true",
      "Class 2,Science,true",
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "class-subjects-template.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function handleFile(file: File) {
    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      setRows(parsed);
      setFileName(file.name);
      toast.success(`${parsed.length} rows loaded.`);
    } catch (error) {
      setRows([]);
      setFileName("");
      toast.error(error instanceof Error ? error.message : "Unable to read CSV.");
    }
  }

  async function importRows() {
    if (!academicYearId) {
      toast.error("Select an academic year first.");
      return;
    }

    if (rows.length === 0) {
      toast.error("Upload a CSV file first.");
      return;
    }

    if (duplicateCount > 0) {
      toast.error("Remove duplicate class/subject rows before importing.");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/v1/class-subjects/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ academicYearId, rows }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message ?? "Unable to import class subjects.");
      }

      toast.success(
        `${result.data.imported} imported${result.data.skipped ? `, ${result.data.skipped} already existed` : ""}.`,
      );
      setRows([]);
      setFileName("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to import class subjects.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        eyebrow="School Setup"
        title="Bulk Class Subjects"
        description="Import subject assignments for multiple classes in one operation."
      />

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link
          href={`/${school.slug}/setup/class-subjects`}
          className="font-semibold text-primary hover:underline"
        >
          Class Subjects
        </Link>
        <span>/</span>
        <span>Bulk Import</span>
      </div>

      <Card className="premium-card overflow-hidden rounded-2xl border-0">
        <CardHeader className="border-b border-border/60 px-6 py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Import Assignments</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Select the academic year and upload a CSV containing Class and Subject names.
              </p>
            </div>
            <Button type="button" variant="outline" onClick={downloadTemplate} className="rounded-xl">
              <Download className="size-4" />
              Download Template
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 p-6">
          <div className="max-w-md space-y-2">
            <p className="text-xs font-semibold">Academic Year</p>
            <RemoteCombobox
              url="/api/v1/academic-years/options"
              value={academicYearId}
              placeholder="Select academic year"
              onChange={setAcademicYearId}
            />
          </div>

          <div className="rounded-2xl border-2 border-dashed border-border/70 bg-muted/20 p-8 text-center transition-colors hover:border-primary/40">
            <input
              id="class-subject-file"
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleFile(file);
                event.currentTarget.value = "";
              }}
            />

            <label htmlFor="class-subject-file" className="flex cursor-pointer flex-col items-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <UploadCloud className="size-6" />
              </div>
              <p className="mt-4 text-sm font-semibold">
                {fileName || "Choose a CSV file"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Required columns: Class, Subject. Optional column: Active.
              </p>
            </label>
          </div>

          {rows.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-border/60">
              <div className="flex flex-col gap-3 border-b border-border/60 bg-muted/20 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="size-5 text-primary" />
                  <div>
                    <p className="text-sm font-semibold">Import Preview</p>
                    <p className="text-xs text-muted-foreground">{rows.length} rows ready</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge variant="success">{rows.length} rows</Badge>
                  {duplicateCount > 0 && <Badge variant="destructive">{duplicateCount} duplicates</Badge>}
                </div>
              </div>

              <div className="max-h-96 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 border-b border-border/60 bg-background">
                    <tr>
                      <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">#</th>
                      <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Class</th>
                      <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Subject</th>
                      <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => (
                      <tr key={`${row.className}-${row.subjectName}-${index}`} className="border-b border-border/40 last:border-0">
                        <td className="px-5 py-3 text-muted-foreground">{index + 1}</td>
                        <td className="px-5 py-3 font-medium">{row.className}</td>
                        <td className="px-5 py-3 font-medium">{row.subjectName}</td>
                        <td className="px-5 py-3">
                          <Badge variant={row.active === false ? "secondary" : "success"}>
                            {row.active === false ? "Inactive" : "Active"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-border/60 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              {duplicateCount > 0 ? (
                <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
              ) : (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
              )}
              <span>
                Existing assignments are skipped. Invalid class or subject names stop the import so no partial batch is created.
              </span>
            </div>

            <div className="flex gap-2">
              <Button asChild variant="outline" className="rounded-xl">
                <Link href={`/${school.slug}/setup/class-subjects`}>
                  <ArrowLeft className="size-4" />
                  Back
                </Link>
              </Button>
              <Button
                type="button"
                onClick={() => void importRows()}
                disabled={loading || rows.length === 0 || !academicYearId || duplicateCount > 0}
                className="rounded-xl"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
                {loading ? "Importing..." : "Import Class Subjects"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
