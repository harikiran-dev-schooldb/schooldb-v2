"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  KeyRound,
  Loader2,
  UploadCloud,
  XCircle,
} from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useSchool } from "@/contexts/school-context";
import { parseStudentLoginAdmissionNumbers } from "@/features/students/student-login-import";
import {
  postImportInBatches,
  type ImportProgress,
} from "@/lib/batched-import";

type LoginError = {
  admissionNo: string;
  message: string;
};

type LoginResult = {
  requested: number;
  provisioned: number;
  alreadyReady: number;
  skipped: number;
  failed: number;
  notFound: number;
  errors: LoginError[];
};

function downloadTemplate() {
  const blob = new Blob(["admissionNo\nSTD001\nSTD002\n"], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "student-login-access-template.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export default function StudentLoginAccessPage() {
  const { school } = useSchool();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [fileName, setFileName] = useState("");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LoginResult | null>(null);
  const students = useMemo(
    () => parseStudentLoginAdmissionNumbers(value),
    [value],
  );

  async function handleFile(file: File) {
    setError(null);
    setResult(null);
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Upload the student login CSV template.");
      return;
    }
    setFileName(file.name);
    setValue(await file.text());
  }

  async function createLogins() {
    if (!students.length || processing) return;
    setProcessing(true);
    setError(null);
    setResult(null);
    try {
      const data = await postImportInBatches<string, LoginResult>({
        endpoint: "/api/v1/students/logins/bulk",
        bodyKey: "admissionNos",
        rows: students,
        batchSize: 25,
        onProgress: setProgress,
        failureMessage: "Student login setup failed.",
      });
      setResult(data);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Student login setup failed.",
      );
    } finally {
      setProcessing(false);
    }
  }

  function reset() {
    setValue("");
    setFileName("");
    setProgress(null);
    setResult(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-6 p-4 pb-12 sm:p-6">
      <PageHeader
        eyebrow="Bulk Operations"
        title="Student Login Access"
        description="Create Clerk login accounts only for students who need to use SchoolDB."
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
        <span>Student Login Access</span>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="premium-card overflow-hidden rounded-2xl border-0">
          <CardHeader className="border-b border-border/60 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <KeyRound className="size-5" />
              </div>
              <div>
                <CardTitle>Choose students</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  Upload a one-column CSV or paste admission numbers below.
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-5 p-6">
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

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => inputRef.current?.click()}
                disabled={processing}
              >
                <UploadCloud className="size-4" />
                Upload CSV
              </Button>
              {fileName && <Badge variant="secondary">{fileName}</Badge>}
              <Badge variant={students.length ? "success" : "secondary"}>
                {students.length} selected
              </Badge>
            </div>

            <Textarea
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
                setResult(null);
                setError(null);
              }}
              disabled={processing}
              className="min-h-72 font-mono text-sm"
              placeholder={"admissionNo\nSTD001\nSTD002"}
            />

            {error && (
              <div className="flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
                <XCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
                <div>
                  <p className="text-sm font-semibold">Login setup could not finish</p>
                  <p className="mt-1 text-xs text-muted-foreground">{error}</p>
                </div>
              </div>
            )}

            {processing && progress && (
              <div className="space-y-2 rounded-2xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex justify-between text-xs font-semibold">
                  <span>Creating login access</span>
                  <span>{progress.completedRows} / {progress.totalRows}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-primary/10">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{
                      width: `${(progress.completedRows / progress.totalRows) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {result && (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-5 text-emerald-600" />
                  <p className="text-sm font-bold">Login setup complete</p>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {result.provisioned} created · {result.alreadyReady} already ready · {result.skipped} not eligible · {result.failed} failed · {result.notFound} not found
                </p>
                {result.errors.length > 0 && (
                  <div className="mt-3 max-h-44 space-y-1 overflow-auto rounded-xl bg-background/70 p-3 text-xs text-muted-foreground">
                    {result.errors.map((item) => (
                      <p key={`${item.admissionNo}-${item.message}`}>
                        <span className="font-semibold text-foreground">{item.admissionNo}:</span>{" "}
                        {item.message}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-3">
              <Button variant="outline" onClick={reset} disabled={processing}>
                Clear
              </Button>
              <Button
                onClick={() => void createLogins()}
                disabled={processing || !students.length}
              >
                {processing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <KeyRound className="size-4" />
                )}
                {processing ? "Creating..." : `Create ${students.length} Logins`}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="h-fit rounded-2xl border-amber-500/20 bg-amber-500/5 shadow-none">
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="size-5 text-amber-600" />
              Intentional access only
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              Student import only creates school records. This separate action creates external Clerk accounts and should be used only for students who need to sign in.
            </p>
            <p className="text-xs leading-5 text-muted-foreground">
              Each selected student needs a valid student, guardian, father, or mother mobile number. Existing login accounts are safely skipped.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
