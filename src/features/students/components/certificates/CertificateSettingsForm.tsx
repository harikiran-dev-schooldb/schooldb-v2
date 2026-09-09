"use client";

import { useState } from "react";
import { Loader2, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CERTIFICATE_PLACEHOLDERS, DEFAULT_CERTIFICATE_SETTING } from "@/features/students/certificate-settings";

export type CertificateSettingValue = {
  headerSubtitle: string;
  bonafideContent: string;
  studyContent: string;
  transferContent: string;
  footerNote: string | null;
  signatoryLabel: string;
};

export function CertificateSettingsForm({ initialValue }: { initialValue: CertificateSettingValue }) {
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);

  function update<Key extends keyof CertificateSettingValue>(key: Key, nextValue: CertificateSettingValue[Key]) {
    setValue((current) => ({ ...current, [key]: nextValue }));
  }

  async function save() {
    setSaving(true);
    try {
      const response = await fetch("/api/v1/certificate-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(value),
      });
      const payload = (await response.json()) as { success?: boolean; message?: string };
      if (!response.ok || !payload.success) throw new Error(payload.message || "Unable to save certificate settings.");
      toast.success("Certificate wording saved for this school.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save certificate settings.");
    } finally {
      setSaving(false);
    }
  }

  function restoreDefaults() {
    setValue({ ...DEFAULT_CERTIFICATE_SETTING });
    toast.info("Default wording restored. Select Save changes to apply it.");
  }

  return (
    <div className="space-y-6">
      <Card className="premium-card overflow-hidden rounded-3xl border-0">
        <CardHeader className="border-b bg-muted/20"><CardTitle className="text-base">Certificate header</CardTitle></CardHeader>
        <CardContent className="grid gap-5 p-6 md:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="certificate-subtitle">Text under school name</Label><Input id="certificate-subtitle" maxLength={120} value={value.headerSubtitle} onChange={(event) => update("headerSubtitle", event.target.value)} placeholder="Affiliation, address, motto, or official record text" /><p className="text-xs leading-5 text-muted-foreground">This customized line appears directly below the school name on every certificate.</p></div>
          <div className="space-y-2"><Label htmlFor="certificate-signatory">Authorised signatory</Label><Input id="certificate-signatory" maxLength={100} value={value.signatoryLabel} onChange={(event) => update("signatoryLabel", event.target.value)} placeholder="Principal / Head of School" /></div>
          <div className="space-y-2 md:col-span-2"><Label htmlFor="certificate-footer">Footer note (optional)</Label><Input id="certificate-footer" maxLength={300} value={value.footerNote ?? ""} onChange={(event) => update("footerNote", event.target.value || null)} placeholder="School address, verification note, or contact details" /></div>
        </CardContent>
      </Card>

      <Card className="premium-card overflow-hidden rounded-3xl border-0">
        <CardHeader className="border-b bg-muted/20"><CardTitle className="text-base">Certificate wording</CardTitle></CardHeader>
        <CardContent className="space-y-6 p-6">
          <TemplateField id="bonafide-content" label="Bonafide certificate" value={value.bonafideContent} onChange={(nextValue) => update("bonafideContent", nextValue)} />
          <TemplateField id="study-content" label="Study certificate" value={value.studyContent} onChange={(nextValue) => update("studyContent", nextValue)} />
          <TemplateField id="transfer-content" label="Transfer certificate" value={value.transferContent} onChange={(nextValue) => update("transferContent", nextValue)} />
        </CardContent>
      </Card>

      <div className="rounded-2xl border border-primary/15 bg-primary/[0.03] p-5">
        <p className="text-sm font-semibold">Available placeholders</p>
        <div className="mt-3 flex flex-wrap gap-2">{CERTIFICATE_PLACEHOLDERS.map((placeholder) => <code key={placeholder} className="rounded-lg border bg-background px-2 py-1 text-xs text-primary">{`{{${placeholder}}}`}</code>)}</div>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">Keep placeholders exactly as shown. They are replaced with the selected student’s current school record when the certificate opens.</p>
      </div>

      <div className="flex flex-wrap justify-end gap-3">
        <Button type="button" variant="outline" onClick={restoreDefaults}><RotateCcw className="size-4" /> Restore defaults</Button>
        <Button type="button" disabled={saving} onClick={() => void save()}>{saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}{saving ? "Saving..." : "Save changes"}</Button>
      </div>
    </div>
  );
}

function TemplateField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (value: string) => void }) {
  return <div className="space-y-2"><Label htmlFor={id}>{label}</Label><Textarea id={id} rows={7} maxLength={3000} value={value} onChange={(event) => onChange(event.target.value)} className="leading-6" /></div>;
}
