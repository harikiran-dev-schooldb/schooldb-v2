"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AdmissionAgePolicy } from "./age-policy";

type Year = { id: string; name: string; policy: AdmissionAgePolicy | null };
type ClassOption = { id: string; name: string };

export function AdmissionAgeSettings({ years, classes }: { years: Year[]; classes: ClassOption[] }) {
  const [yearId, setYearId] = useState(years[0]?.id ?? "");
  const year = years.find((item) => item.id === yearId);
  if (!year) return null;
  return <section className="rounded-2xl border bg-card p-5 shadow-sm space-y-4">
    <div>
      <h2 className="font-black">Admission age eligibility</h2>
      <p className="text-sm text-muted-foreground">Configure inclusive minimum and maximum completed months for this school and academic year. Leave both blank for an unconfigured class. Rules are enforced on public applications only after saving.</p>
    </div>
    <label className="block text-sm font-medium">Academic year
      <select className="mt-1 block w-full rounded-md border bg-background p-2" value={yearId} onChange={(event) => setYearId(event.target.value)}>
        {years.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
    </label>
    <AgeRuleEditor key={year.id} year={year} classes={classes} />
  </section>;
}

function AgeRuleEditor({ year, classes }: { year: Year; classes: ClassOption[] }) {
  const router = useRouter();
  const [date, setDate] = useState(year.policy?.ageAsOfDate ?? "");
  const [rules, setRules] = useState<Record<string, { min: string; max: string }>>(() =>
    Object.fromEntries(Object.entries(year.policy?.rules ?? {}).map(([id, rule]) => [id, { min: String(rule.minMonths), max: String(rule.maxMonths) }]))
  );
  const [busy, setBusy] = useState(false);
  function change(id: string, key: "min" | "max", value: string) {
    setRules((current) => ({ ...current, [id]: { min: current[id]?.min ?? "", max: current[id]?.max ?? "", [key]: value } }));
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result: AdmissionAgePolicy["rules"] = {};
    for (const [id, rule] of Object.entries(rules)) {
      if (!rule.min && !rule.max) continue;
      if (!rule.min || !rule.max || !/^\d+$/.test(rule.min) || !/^\d+$/.test(rule.max) || +rule.min > +rule.max || +rule.max > 240) {
        toast.error("Enter valid minimum and maximum months (0–240) for each configured class."); return;
      }
      result[id] = { minMonths: Number(rule.min), maxMonths: Number(rule.max) };
    }
    setBusy(true);
    try {
      const response = await fetch("/api/v1/admissions/age-policy", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ academicYearId: year.id, policy: { ageAsOfDate: date, rules: result } }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Unable to save age rules.");
      toast.success(data.message || "Age rules saved.");
      router.refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to save age rules."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={save} className="space-y-4">
    <label className="block max-w-xs text-sm font-medium">Age as of date
      <Input type="date" required value={date} onChange={(event) => setDate(event.target.value)} />
    </label>
    <div className="grid gap-2">
      <div className="grid grid-cols-3 gap-2 text-xs font-bold text-muted-foreground"><span>Class</span><span>Min months</span><span>Max months</span></div>
      {classes.map((item) => <div key={item.id} className="grid grid-cols-3 gap-2 items-center">
        <span className="text-sm">{item.name}</span>
        <Input aria-label={item.name + " minimum months"} type="number" min={0} max={240} step={1} value={rules[item.id]?.min ?? ""} onChange={(event) => change(item.id, "min", event.target.value)} />
        <Input aria-label={item.name + " maximum months"} type="number" min={0} max={240} step={1} value={rules[item.id]?.max ?? ""} onChange={(event) => change(item.id, "max", event.target.value)} />
      </div>)}
    </div>
    <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save age rules"}</Button>
  </form>;
}
