"use client";

import { useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { GradingPolicy } from "@/features/exams/grading-policy";

type WeightedExam = { id: string; name: string; annualWeight: number };

export function GradingPolicyPage({
  initialPolicy,
  initialExams,
}: {
  initialPolicy: GradingPolicy;
  initialExams: WeightedExam[];
}) {
  const [policy, setPolicy] = useState(initialPolicy);
  const [exams, setExams] = useState(initialExams);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const policyResponse = await fetch("/api/v1/exams/grading-policy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(policy),
      });
      const policyResult = await policyResponse.json();
      if (!policyResponse.ok || !policyResult.success) {
        throw new Error(policyResult.message || "Unable to save the grading policy.");
      }

      for (const exam of exams) {
        const original = initialExams.find((item) => item.id === exam.id);
        if (original?.annualWeight === exam.annualWeight) continue;
        const response = await fetch(`/api/v1/exams/${exam.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ annualWeight: exam.annualWeight }),
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.message || `Unable to save the weight for ${exam.name}.`);
        }
      }
      toast.success("Grading policy and annual examination weights saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save grading settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Annual result rules</CardTitle>
          <p className="text-sm text-muted-foreground">Control the annual pass decision without changing the marks entered by teachers.</p>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-3">
          <label className="space-y-2">
            <Label>Annual pass percentage</Label>
            <Input type="number" min="0" max="100" step="0.01" value={policy.annualPassPercentage} onChange={(event) => setPolicy((current) => ({ ...current, annualPassPercentage: Number(event.target.value) }))} />
          </label>
          <label className="space-y-2">
            <Label>Maximum grace marks per assessment</Label>
            <Input type="number" min="0" max="100" step="0.01" value={policy.maximumGraceMarks} onChange={(event) => setPolicy((current) => ({ ...current, maximumGraceMarks: Number(event.target.value) }))} />
          </label>
          <div className="flex items-center justify-between gap-4 rounded-2xl border p-4">
            <div><Label htmlFor="all-subjects-pass">Require every subject pass</Label><p className="mt-1 text-xs text-muted-foreground">A failed or absent subject fails the annual result.</p></div>
            <Switch id="all-subjects-pass" checked={policy.requireAllSubjectsPass} onCheckedChange={(checked) => setPolicy((current) => ({ ...current, requireAllSubjectsPass: checked }))} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4">
          <div><CardTitle>Grade bands</CardTitle><p className="mt-1 text-sm text-muted-foreground">The lowest band must begin at 0%. Bands are evaluated from highest to lowest.</p></div>
          <Button type="button" variant="outline" onClick={() => setPolicy((current) => ({ ...current, gradeBands: [...current.gradeBands, { label: "", minimumPercentage: 0 }] }))}><Plus className="size-4" />Add band</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {policy.gradeBands.map((band, index) => (
            <div key={`${index}-${band.label}`} className="grid gap-3 rounded-2xl border p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <label className="space-y-2"><Label>Grade</Label><Input maxLength={5} value={band.label} onChange={(event) => setPolicy((current) => ({ ...current, gradeBands: current.gradeBands.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value.toUpperCase() } : item) }))} /></label>
              <label className="space-y-2"><Label>Minimum percentage</Label><Input type="number" min="0" max="100" step="0.01" value={band.minimumPercentage} onChange={(event) => setPolicy((current) => ({ ...current, gradeBands: current.gradeBands.map((item, itemIndex) => itemIndex === index ? { ...item, minimumPercentage: Number(event.target.value) } : item) }))} /></label>
              <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${band.label || "grade"} band`} disabled={policy.gradeBands.length <= 2} onClick={() => setPolicy((current) => ({ ...current, gradeBands: current.gradeBands.filter((_, itemIndex) => itemIndex !== index) }))}><Trash2 className="size-4" /></Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Annual examination weightage</CardTitle><p className="text-sm text-muted-foreground">Use relative weights: for example 20, 30 and 50. A weight of 0 excludes an examination from the annual percentage.</p></CardHeader>
        <CardContent className="space-y-3">
          {exams.length ? exams.map((exam, index) => <label key={exam.id} className="flex items-center justify-between gap-4 rounded-2xl border p-4"><span className="font-semibold">{exam.name}</span><Input aria-label={`${exam.name} annual weight`} className="w-28" type="number" min="0" max="100" step="0.01" value={exam.annualWeight} onChange={(event) => setExams((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, annualWeight: Number(event.target.value) } : item))} /></label>) : <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">No examinations are available in the active academic year.</p>}
        </CardContent>
      </Card>

      <div className="flex justify-end"><Button onClick={save} disabled={saving}><Save className="size-4" />{saving ? "Saving…" : "Save grading policy"}</Button></div>
    </div>
  );
}
