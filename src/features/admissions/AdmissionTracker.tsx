"use client";

import { useState } from "react";
import { CheckCircle2, Clock3, FileCheck2, LoaderCircle, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Result = {
  applicationNo: string;
  studentName: string;
  status: string;
  submittedAt: string;
  academicYear: { name: string };
  applyingClass: { name: string };
  preferredSection: { name: string } | null;
  history: { toStatus: string; note: string | null; createdAt: string }[];
  documents: { id: string; type: string; originalName: string; createdAt: string }[];
};

const label = (value: string) => value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());

export function AdmissionTracker({ schoolSlug }: { schoolSlug: string }) {
  const [applicationNo, setApplicationNo] = useState("");
  const [mobile, setMobile] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  async function track(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setResult(null);
    try {
      const response = await fetch(`/api/v1/public/admissions/${schoolSlug}/track`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ applicationNo, mobile }) });
      const payload = await response.json();
      if (!payload.success) throw new Error(payload.message || "Application not found.");
      setResult(payload.data);
    } catch (trackError) { setError(trackError instanceof Error ? trackError.message : "Unable to track application."); }
    finally { setBusy(false); }
  }

  return <div className="space-y-6">
    <form onSubmit={track} className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Application number</Label><Input value={applicationNo} onChange={(event) => setApplicationNo(event.target.value.toUpperCase())} placeholder="APP-2026-XXXXXX" required className="h-12" /></div><div className="space-y-2"><Label>Registered mobile number</Label><Input value={mobile} onChange={(event) => setMobile(event.target.value.replace(/\D/g, "").slice(0, 10))} inputMode="numeric" required className="h-12" /></div><Button className="h-12 sm:col-span-2" disabled={busy}>{busy ? <LoaderCircle className="animate-spin" /> : <Search />}Track application</Button></form>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p>}
    {result && <section className="rounded-3xl border bg-slate-50 p-5 sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-bold tracking-wider text-indigo-600 uppercase">{result.applicationNo}</p><h2 className="mt-1 text-xl font-black">{result.studentName}</h2><p className="mt-1 text-sm text-slate-500">{result.academicYear.name} · {result.applyingClass.name}{result.preferredSection ? ` / ${result.preferredSection.name}` : ""}</p></div><span className="rounded-full bg-indigo-100 px-4 py-2 text-xs font-black text-indigo-700">{label(result.status)}</span></div><div className="mt-6 space-y-3"><p className="text-xs font-bold tracking-wide text-slate-500 uppercase">Progress</p>{result.history.map((entry, index) => <div key={`${entry.createdAt}-${index}`} className="flex gap-3"><div className="mt-0.5">{index === 0 ? <CheckCircle2 className="size-5 text-emerald-600" /> : <Clock3 className="size-5 text-slate-300" />}</div><div><p className="text-sm font-bold">{label(entry.toStatus)}</p><p className="text-xs text-slate-500">{new Date(entry.createdAt).toLocaleString("en-IN")}{entry.note ? ` · ${entry.note}` : ""}</p></div></div>)}</div>{result.documents.length > 0 && <div className="mt-6 border-t pt-4"><p className="text-xs font-bold tracking-wide text-slate-500 uppercase">Documents received</p>{result.documents.map((document) => <p key={document.id} className="mt-2 flex items-center gap-2 text-sm text-slate-600"><FileCheck2 className="size-4 text-emerald-600" />{document.originalName} · {label(document.type)}</p>)}</div>}</section>}
  </div>;
}
