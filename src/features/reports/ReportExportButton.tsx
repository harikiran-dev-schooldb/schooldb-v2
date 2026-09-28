"use client";

import { useState } from "react";
import { Download, LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type Props = { query: string };
type ApiEnvelope<T> = { success: boolean; message: string; data: T };
const wait = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

export function ReportExportButton({ query }: Props) {
  const [preparing, setPreparing] = useState(false);

  async function prepareReport() {
    setPreparing(true);
    try {
      const filters = Object.fromEntries(new URLSearchParams(query));
      const response = await fetch("/api/v1/report-exports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filters),
      });
      const result = (await response.json()) as ApiEnvelope<{ id: string }>;
      if (!response.ok) throw new Error(result.message || "Could not prepare report");

      toast.info("Preparing your private report. You can keep using SchoolDB.");
      for (let attempt = 0; attempt < 200; attempt += 1) {
        await wait(1500);
        const statusResponse = await fetch(`/api/v1/report-exports/${result.data.id}`, {
          cache: "no-store",
        });
        const statusResult = (await statusResponse.json()) as ApiEnvelope<{
          status: "QUEUED" | "PROCESSING" | "READY" | "FAILED" | "EXPIRED";
          error?: string | null;
        }>;
        if (!statusResponse.ok) {
          throw new Error(statusResult.message || "Could not check report status");
        }
        if (statusResult.data.status === "READY") {
          toast.success("Report ready. Your download is starting.");
          window.location.assign(`/api/v1/report-exports/${result.data.id}/download`);
          return;
        }
        if (statusResult.data.status === "FAILED") {
          throw new Error(statusResult.data.error || "Report generation failed");
        }
      }
      throw new Error("The report is still processing. Please try again shortly.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not prepare report");
    } finally {
      setPreparing(false);
    }
  }

  return (
    <Button variant="outline" size="sm" disabled={preparing} onClick={prepareReport}>
      {preparing ? (
        <LoaderCircle className="size-3.5 animate-spin" />
      ) : (
        <Download className="size-3.5" />
      )}
      {preparing ? "Preparing…" : "Download CSV"}
    </Button>
  );
}
