"use client";

import { useState } from "react";
import { FileCheck2, LoaderCircle, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const documentTypes = [
  ["PHOTO", "Student photo"],
  ["BIRTH_CERTIFICATE", "Birth certificate"],
  ["AADHAAR", "Aadhaar card"],
  ["PREVIOUS_REPORT_CARD", "Previous report card"],
  ["TRANSFER_CERTIFICATE", "Transfer certificate"],
  ["OTHER", "Other document"],
] as const;

export function AdmissionDocumentUpload({ schoolSlug, applicationNo, mobile }: { schoolSlug: string; applicationNo: string; mobile: string }) {
  const [type, setType] = useState("PHOTO");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [uploaded, setUploaded] = useState<string[]>([]);

  async function upload() {
    if (!file) return;
    setBusy(true);
    setMessage("");
    const body = new FormData();
    body.set("applicationNo", applicationNo);
    body.set("mobile", mobile);
    body.set("type", type);
    body.set("file", file);
    try {
      const response = await fetch(`/api/v1/public/admissions/${schoolSlug}/documents`, { method: "POST", body });
      const result = await response.json();
      if (!result.success) throw new Error(result.message || "Upload failed.");
      setUploaded((current) => [...current, file.name]);
      setFile(null);
      setMessage("Document uploaded securely.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="mt-6 rounded-2xl border border-emerald-200 bg-white p-5 text-left">
    <div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><UploadCloud className="size-5" /></div><div><h3 className="font-black text-slate-950">Upload supporting documents</h3><p className="text-xs text-slate-500">Optional now. PDF, JPG, PNG or WebP, up to 5 MB each.</p></div></div>
    <div className="mt-4 grid gap-3 sm:grid-cols-[180px_1fr_auto]"><div className="space-y-1"><Label>Document type</Label><select value={type} onChange={(event) => setType(event.target.value)} className="h-10 w-full rounded-md border bg-white px-3 text-sm">{documentTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><div className="space-y-1"><Label>File</Label><Input key={uploaded.length} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></div><Button type="button" disabled={!file || busy} onClick={upload} className="self-end">{busy ? <LoaderCircle className="animate-spin" /> : <UploadCloud />}Upload</Button></div>
    {message && <p className={`mt-3 text-xs font-semibold ${message.includes("securely") ? "text-emerald-700" : "text-red-600"}`}>{message}</p>}
    {uploaded.map((name) => <p key={name} className="mt-2 flex items-center gap-2 text-xs text-emerald-700"><FileCheck2 className="size-4" />{name}</p>)}
  </section>;
}
