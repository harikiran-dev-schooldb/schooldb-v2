"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Award, Download, FileBadge, FileCheck2, FileText, GraduationCap, IdCard, Loader2, Plus, ShieldCheck, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import type { StudentProfileData } from "./StudentProfile";

type StudentDocument = {
  id: string;
  type: string;
  name: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  notes: string | null;
  visibleToFamily: boolean;
  createdAt: string;
};

const documentTypes = [
  ["AADHAAR", "Aadhaar card"],
  ["BIRTH_CERTIFICATE", "Birth certificate"],
  ["PREVIOUS_SCHOOL_RECORD", "Previous-school record"],
  ["TRANSFER_CERTIFICATE", "Transfer certificate"],
  ["MEDICAL_RECORD", "Medical record"],
  ["STUDENT_PHOTO", "Student photo"],
  ["OTHER", "Other document"],
] as const;

const certificates = [
  { type: "id-card", label: "Student ID card", detail: "Print-ready school identity card", icon: IdCard },
  { type: "bonafide", label: "Bonafide certificate", detail: "Confirms current enrollment", icon: Award },
  { type: "study", label: "Study certificate", detail: "Academic enrollment certificate", icon: GraduationCap },
  { type: "transfer", label: "Transfer certificate", detail: "Available after TC is issued", icon: FileBadge },
] as const;

function bytesLabel(value: number) {
  return value < 1024 * 1024 ? `${Math.ceil(value / 1024)} KB` : `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function documentTypeLabel(value: string) {
  return documentTypes.find(([type]) => type === value)?.[1] ?? "Document";
}

export function StudentDocumentsTab({ student }: { student: StudentProfileData }) {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const [documents, setDocuments] = useState<StudentDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [type, setType] = useState("AADHAAR");
  const [visibleToFamily, setVisibleToFamily] = useState(false);

  const loadDocuments = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/students/${student.id}/documents`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Unable to load documents");
      setDocuments(result.data ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load documents");
    } finally {
      setLoading(false);
    }
  }, [student.id]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadDocuments(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadDocuments]);

  async function uploadDocument(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    form.set("type", type);
    form.set("visibleToFamily", String(visibleToFamily));
    try {
      setSaving(true);
      const response = await fetch(`/api/v1/students/${student.id}/documents`, { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Upload failed");
      toast.success("Document uploaded securely");
      setDialogOpen(false);
      setVisibleToFamily(false);
      setFileName("");
      await loadDocuments();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setSaving(false);
    }
  }

  async function updateFamilyVisibility(document: StudentDocument, visible: boolean) {
    try {
      setUpdatingId(document.id);
      const response = await fetch(`/api/v1/students/${student.id}/documents/${document.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibleToFamily: visible }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Update failed");
      setDocuments((current) => current.map((item) => item.id === document.id ? { ...item, visibleToFamily: visible } : item));
      toast.success(visible ? "Document shared with family" : "Family access removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    } finally {
      setUpdatingId(null);
    }
  }

  async function deleteDocument(document: StudentDocument) {
    if (!window.confirm(`Delete ${document.name}? This cannot be undone.`)) return;
    try {
      setDeletingId(document.id);
      const response = await fetch(`/api/v1/students/${student.id}/documents/${document.id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Delete failed");
      setDocuments((current) => current.filter((item) => item.id !== document.id));
      toast.success("Document deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/[0.09] via-card to-blue-500/[0.06] shadow-sm">
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20"><ShieldCheck className="size-6" /></div>
            <div><h2 className="text-xl font-bold tracking-tight">Documents & certificates</h2><p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">Keep student records private and generate official, print-ready school documents.</p></div>
          </div>
          <Button onClick={() => setDialogOpen(true)}><Plus className="size-4" /> Add document</Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-muted/20"><CardTitle className="flex items-center gap-2 text-base"><FileCheck2 className="size-4 text-primary" /> Secure student records</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="grid gap-4 p-5 md:grid-cols-2">{[1, 2].map((item) => <div key={item} className="h-28 animate-pulse rounded-xl bg-muted" />)}</div>
          ) : documents.length === 0 ? (
            <div className="px-6 py-12 text-center"><div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-muted"><FileText className="size-5 text-muted-foreground" /></div><p className="mt-4 font-semibold">No documents uploaded</p><p className="mt-1 text-sm text-muted-foreground">Add Aadhaar, birth certificate, or previous-school records.</p></div>
          ) : (
            <div className="grid gap-4 p-5 lg:grid-cols-2">
              {documents.map((document) => (
                <div key={document.id} className="group rounded-2xl border bg-card p-4 transition hover:border-primary/25 hover:shadow-md">
                  <div className="flex gap-3"><div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><FileText className="size-5" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate font-semibold">{document.name}</p>{document.visibleToFamily && <Badge variant="success">Family visible</Badge>}</div><p className="mt-1 text-xs text-muted-foreground">{documentTypeLabel(document.type)} · {bytesLabel(document.sizeBytes)} · {new Date(document.createdAt).toLocaleDateString("en-IN")}</p>{document.notes && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{document.notes}</p>}</div></div>
                  <div className="mt-4 flex flex-wrap items-center gap-3 border-t pt-3"><label className="mr-auto flex items-center gap-2 text-xs font-medium text-muted-foreground"><Switch checked={document.visibleToFamily} disabled={updatingId === document.id} onCheckedChange={(checked) => void updateFamilyVisibility(document, checked)} /> Family access</label><Button asChild size="sm" variant="outline"><a href={`/api/v1/students/${student.id}/documents/${document.id}/download`} target="_blank" rel="noreferrer"><Download className="size-3.5" /> Open</a></Button><Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" disabled={deletingId === document.id} onClick={() => void deleteDocument(document)}>{deletingId === document.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />} Delete</Button></div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div><div className="mb-3"><h3 className="font-bold">Generate certificates</h3><p className="text-sm text-muted-foreground">Open a print-ready document using the latest student and enrollment details.</p></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {certificates.map((certificate) => { const disabled = certificate.type === "transfer" && student.status !== "TC_ISSUED"; const Icon = certificate.icon; return <a key={certificate.type} href={disabled ? undefined : `/${schoolSlug}/students/${student.id}/certificates/${certificate.type}`} target={disabled ? undefined : "_blank"} rel="noreferrer" aria-disabled={disabled} className={`rounded-2xl border bg-card p-5 transition ${disabled ? "cursor-not-allowed opacity-50" : "hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg"}`}><div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="size-5" /></div><p className="mt-4 font-semibold">{certificate.label}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{certificate.detail}</p></a>; })}
      </div></div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent><DialogHeader><DialogTitle>Upload student document</DialogTitle><DialogDescription>PDF, JPG, PNG, or WebP up to 5 MB. Files remain private unless family access is enabled.</DialogDescription></DialogHeader><form onSubmit={uploadDocument} className="space-y-4">
        <div className="space-y-2"><Label htmlFor="document-name">Document name</Label><Input id="document-name" name="name" placeholder="e.g. Aadhaar card - front and back" maxLength={120} required /></div>
        <div className="space-y-2"><Label>Document type</Label><Select value={type} onValueChange={setType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{documentTypes.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition hover:border-primary/40 hover:bg-primary/[0.03]"><UploadCloud className="size-7 text-primary" /><span className="mt-2 text-sm font-semibold">{fileName || "Choose document"}</span><span className="mt-1 text-xs text-muted-foreground">PDF or image · maximum 5 MB</span><input name="file" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => setFileName(event.target.files?.[0]?.name || "")} required /></label>
        <div className="space-y-2"><Label htmlFor="document-notes">Notes (optional)</Label><Textarea id="document-notes" name="notes" maxLength={500} placeholder="Add verification notes or document details" /></div>
        <div className="flex items-center justify-between rounded-xl border bg-muted/30 p-4"><div><Label htmlFor="family-visible">Student/parent access</Label><p className="mt-1 text-xs text-muted-foreground">Allow linked family accounts to open this document.</p></div><Switch id="family-visible" checked={visibleToFamily} onCheckedChange={setVisibleToFamily} /></div>
        <DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />} {saving ? "Uploading..." : "Upload securely"}</Button></DialogFooter>
      </form></DialogContent></Dialog>
    </div>
  );
}
