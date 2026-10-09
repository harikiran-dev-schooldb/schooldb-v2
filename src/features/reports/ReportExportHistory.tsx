"use client";

import { Download, RefreshCw, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ExportJob = {
  id: string;
  status: "QUEUED" | "PROCESSING" | "READY" | "FAILED" | "EXPIRED" | "DOWNLOADED";
  filename: string | null;
  rowCount: number | null;
  error: string | null;
  createdAt: string;
  expiresAt: string | null;
  direct?: boolean;
  performedBy: string;
  performedByRole: string | null;
  reportType: string;
};

function formatRole(role: string | null) {
  return role ? role.toLowerCase().split("_").map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" ") : null;
}

export function ReportExportHistory() {
  const [jobs, setJobs] = useState<ExportJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [performer, setPerformer] = useState("ALL");
  const [reportType, setReportType] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [period, setPeriod] = useState("7");

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
    const refresh = () => void load();
    window.addEventListener("schooldb:report-exported", refresh);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("schooldb:report-exported", refresh);
    };
  }, [load]);

  const performers = useMemo(
    () => Array.from(new Set(jobs.map((job) => job.performedBy))).sort((a, b) => a.localeCompare(b)),
    [jobs],
  );
  const reportTypes = useMemo(
    () => Array.from(new Set(jobs.map((job) => job.reportType))).sort((a, b) => a.localeCompare(b)),
    [jobs],
  );
  const filteredJobs = useMemo(() => {
    const oldest = new Date();
    oldest.setHours(0, 0, 0, 0);
    oldest.setDate(oldest.getDate() - (Number(period) - 1));
    return jobs.filter((job) =>
      (performer === "ALL" || job.performedBy === performer) &&
      (reportType === "ALL" || job.reportType === reportType) &&
      (status === "ALL" || job.status === status) &&
      new Date(job.createdAt) >= oldest,
    );
  }, [jobs, performer, period, reportType, status]);

  const filtersActive = performer !== "ALL" || reportType !== "ALL" || status !== "ALL" || period !== "7";
  const resetFilters = () => {
    setPerformer("ALL");
    setReportType("ALL");
    setStatus("ALL");
    setPeriod("7");
  };

  return (
    <Card className="mt-6 print:hidden">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>School export history</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">All authorized export activity for this school from the last seven days.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} />Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {jobs.length ? (
          <div className="mb-4 grid gap-2 rounded-xl border bg-muted/20 p-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_0.8fr_0.8fr_auto]">
            <Select value={performer} onValueChange={setPerformer}>
              <SelectTrigger aria-label="Filter by performer"><SelectValue placeholder="All performers" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All performers</SelectItem>
                {performers.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger aria-label="Filter by report"><SelectValue placeholder="All reports" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All reports</SelectItem>
                {reportTypes.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger aria-label="Filter by status"><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                <SelectItem value="DOWNLOADED">Downloaded</SelectItem>
                <SelectItem value="READY">Ready</SelectItem>
                <SelectItem value="PROCESSING">Processing</SelectItem>
                <SelectItem value="QUEUED">Queued</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
              </SelectContent>
            </Select>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger aria-label="Filter by date"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Today</SelectItem>
                <SelectItem value="3">Last 3 days</SelectItem>
                <SelectItem value="7">Last 7 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={resetFilters} disabled={!filtersActive} className="h-10">
              <RotateCcw className="size-4" />Reset
            </Button>
          </div>
        ) : null}
        {jobs.length ? (
          filteredJobs.length ? (
            <>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Showing {Math.min(filteredJobs.length, 20)} of {filteredJobs.length} matching exports</p>
              <div className="divide-y rounded-xl border">
            {filteredJobs.slice(0, 20).map((job) => (
              <div key={job.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{job.filename ?? `Report ${job.id.slice(-8)}`}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(job.createdAt))}
                    {job.rowCount !== null ? ` · ${job.rowCount} rows` : ""}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Performed by <span className="font-medium text-foreground">{job.performedBy}</span>
                    {formatRole(job.performedByRole) ? ` · ${formatRole(job.performedByRole)}` : ""}
                  </p>
                  {job.error ? <p className="mt-1 text-xs text-destructive">{job.error}</p> : null}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={job.status === "READY" || job.status === "DOWNLOADED" ? "success" : job.status === "FAILED" ? "destructive" : "outline"}>{job.status}</Badge>
                  {job.status === "READY" && !job.direct ? (
                    <Button asChild variant="outline" size="sm">
                      <a href={`/api/v1/report-exports/${job.id}/download`}><Download className="size-4" />Download</a>
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
              </div>
            </>
          ) : (
            <p className="rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground">No exports match these filters.</p>
          )
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">No exports have been requested in the last seven days.</p>
        )}
      </CardContent>
    </Card>
  );
}
