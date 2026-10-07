"use client";

import { Download, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ExportJob = {
  id: string;
  status: "QUEUED" | "PROCESSING" | "READY" | "FAILED" | "EXPIRED";
  filename: string | null;
  rowCount: number | null;
  error: string | null;
  createdAt: string;
  expiresAt: string | null;
};

export function ReportExportHistory() {
  const [jobs, setJobs] = useState<ExportJob[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/v1/report-exports", { cache: "no-store" });
      const result = await response.json() as { success?: boolean; data?: ExportJob[] };
      setJobs(result.success && Array.isArray(result.data) ? result.data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  return (
    <Card className="mt-6 print:hidden">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>Private export history</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">Queued analytics exports are private, audited, and retained for seven days.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} />Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {jobs.length ? (
          <div className="divide-y rounded-xl border">
            {jobs.slice(0, 10).map((job) => (
              <div key={job.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{job.filename ?? `Report ${job.id.slice(-8)}`}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(job.createdAt))}
                    {job.rowCount !== null ? ` · ${job.rowCount} rows` : ""}
                  </p>
                  {job.error ? <p className="mt-1 text-xs text-destructive">{job.error}</p> : null}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={job.status === "READY" ? "success" : job.status === "FAILED" ? "destructive" : "outline"}>{job.status}</Badge>
                  {job.status === "READY" ? (
                    <Button asChild variant="outline" size="sm">
                      <a href={`/api/v1/report-exports/${job.id}/download`}><Download className="size-4" />Download</a>
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">No private exports have been requested yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
