"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Armchair, CheckCircle2, CircleAlert, Globe, IndianRupee, Sparkles, Users, WalletCards } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AdmissionClassChoice, AdmissionYearChoice } from "./AdmissionCalculator";
import { AdmissionPanel, AdmissionSelect } from "./AdmissionWorkspaceUI";
import { seatSummary } from "./pipeline-policy";

type Year = AdmissionYearChoice & { publicEnabled: boolean };
type Field = "termFee" | "annualFees" | "seatCapacity";
type Counts = Record<string, { admitted: number; pending: number; reserved?: number }>;
const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

function usePlanningSave() {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function save(body: object) {
    setBusy(true);
    try {
      const response = await fetch("/api/v1/admissions/planning", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw Error(payload.message || "Save failed.");
      toast.success("Admission plan updated");
      router.refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Save failed."); }
    finally { setBusy(false); }
  }
  return { busy, save };
}

function PlanningCell({ yearId, classId, className, field, value, admin }: { yearId: string; classId: string; className: string; field: Field; value: number | undefined; admin: boolean }) {
  const [draft, setDraft] = useState(value === undefined ? "" : String(value));
  const { busy, save } = usePlanningSave();
  const original = value === undefined ? "" : String(value);
  const label = field === "termFee" ? "Term fee" : field === "annualFees" ? "Annual fee" : "Seat capacity";
  if (!admin) return <span className="font-semibold tabular-nums">{value ?? "—"}</span>;
  return <form className="flex min-w-44 items-center gap-2" onSubmit={(event) => { event.preventDefault(); void save({ yearId, classId, field, value: draft === "" ? null : Number(draft) }); }}>
    <Input aria-label={`${label} for ${className}`} className="h-10 min-w-0 rounded-xl bg-background/80 tabular-nums" type="number" inputMode="numeric" min={0} max={field === "seatCapacity" ? 100000 : 100000000} value={draft} onChange={(event) => setDraft(event.target.value)} />
    <Button size="sm" type="submit" disabled={busy || draft === original}>{busy ? "Saving…" : "Save"}</Button>
  </form>;
}

function Metric({ label, value, helper, tone = "primary" }: { label: string; value: string; helper: string; tone?: "primary" | "success" | "warning" }) {
  const Icon = tone === "success" ? CheckCircle2 : tone === "warning" ? CircleAlert : Sparkles;
  return <div className="rounded-2xl border border-border/60 bg-background/70 p-4 shadow-sm backdrop-blur-sm">
    <div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p><Icon className={tone === "success" ? "size-4 text-emerald-500" : tone === "warning" ? "size-4 text-amber-500" : "size-4 text-primary"} /></div>
    <p className="mt-3 text-2xl font-black tracking-tight tabular-nums">{value}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{helper}</p>
  </div>;
}

export function PlanningEditor({ years, classes, mode, admin, counts }: { years: Year[]; classes: AdmissionClassChoice[]; mode: "fees" | "seats"; admin: boolean; counts: Counts }) {
  const { busy, save } = usePlanningSave();
  const [yearId, setYearId] = useState(years[0]?.id ?? "");
  const year = years.find((item) => item.id === yearId);
  const summary = useMemo(() => {
    if (!year) return { configured: 0, total: 0, admitted: 0, reserved: 0, pending: 0 };
    return classes.reduce((result, item) => {
      const plan = year.planning[item.id];
      const count = counts[`${year.id}:${item.id}`] ?? { admitted: 0, pending: 0, reserved: 0 };
      const configured = mode === "fees" ? plan?.termFee !== undefined || plan?.annualFees !== undefined : plan?.seatCapacity !== undefined;
      return { configured: result.configured + (configured ? 1 : 0), total: result.total + (mode === "fees" ? (plan?.termFee ?? 0) + (plan?.annualFees ?? 0) : plan?.seatCapacity ?? 0), admitted: result.admitted + count.admitted, reserved: result.reserved + (count.reserved ?? 0), pending: result.pending + count.pending };
    }, { configured: 0, total: 0, admitted: 0, reserved: 0, pending: 0 });
  }, [classes, counts, mode, year]);
  const readiness = classes.length ? Math.round(summary.configured / classes.length * 100) : 0;
  const occupied = summary.admitted + summary.reserved;
  const utilization = summary.total ? Math.min(100, Math.round(occupied / summary.total * 100)) : 0;

  return <div className="space-y-5">
    <section className="premium-hero relative overflow-hidden rounded-3xl border border-primary/15 p-5 sm:p-7">
      <div className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between"><div className="max-w-2xl">
        <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">{mode === "fees" ? <WalletCards className="size-6" /> : <Armchair className="size-6" />}</div>
        <p className="section-label">Admissions planning</p><h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">{mode === "fees" ? "Build a clear parent-ready fee plan" : "Plan every seat with confidence"}</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{mode === "fees" ? "Set the approved class quote for the selected year. The combined amount is shown instantly for faster review." : "Compare capacity with admitted, reserved, and pending applicants before enforcing a class limit."}</p>
      </div><div className="w-full rounded-2xl border border-border/60 bg-background/80 p-3 backdrop-blur-md sm:w-72"><AdmissionSelect label="Academic year" options={years} value={yearId} onChange={setYearId} /></div></div>
    </section>

    <section aria-label="Planning summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="Configured" value={`${summary.configured}/${classes.length}`} helper={`${readiness}% of classes are ready`} tone={readiness === 100 ? "success" : "warning"} />
      {mode === "fees" ? <><Metric label="Combined quotes" value={money.format(summary.total)} helper="Total across configured classes" /><Metric label="Average quote" value={money.format(summary.configured ? Math.round(summary.total / summary.configured) : 0)} helper="Per configured class" /><Metric label="Parent portal" value={year?.publicEnabled ? "Live" : "Private"} helper={year?.publicEnabled ? "Enquiries are enabled" : "Not open to parents"} tone={year?.publicEnabled ? "success" : "warning"} /></> : <><Metric label="Seat target" value={String(summary.total)} helper={`${occupied} admitted or reserved`} /><Metric label="Utilization" value={`${utilization}%`} helper={`${Math.max(0, summary.total - occupied)} planned seats available`} tone={utilization >= 90 ? "warning" : "success"} /><Metric label="In pipeline" value={String(summary.pending)} helper="Applications awaiting a decision" /></>}
    </section>

    <AdmissionPanel title={mode === "fees" ? "Class-wise fee structure" : "Class-wise seat capacity"} description={mode === "fees" ? "All amounts are admission quotes in INR, not posted fee bills." : "Capacity enforcement is controlled separately for every class."} icon={mode === "fees" ? IndianRupee : Users}>
      {!years.length ? <div className="rounded-2xl border border-dashed border-border p-8 text-center"><CircleAlert className="mx-auto size-6 text-muted-foreground" /><p className="mt-3 font-semibold">No admission year is enabled</p><p className="mt-1 text-sm text-muted-foreground">Enable an academic year in Admission Settings to begin planning.</p></div> : !classes.length ? <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Add classes in Academic Setup before configuring admissions.</p> : year ? <>
        <div className="grid gap-3 lg:hidden">{classes.map((item) => {
          const plan = year.planning[item.id]; const count = counts[`${year.id}:${item.id}`] ?? { admitted: 0, pending: 0, reserved: 0 }; const seats = seatSummary(plan?.seatCapacity, count.reserved ?? 0, count.admitted); const quote = (plan?.termFee ?? 0) + (plan?.annualFees ?? 0);
          return <article key={`${year.id}:${item.id}`} className="rounded-2xl border border-border/60 bg-muted/15 p-4"><div className="mb-4 flex items-center justify-between gap-3"><h3 className="font-bold">{item.name}</h3>{mode === "fees" ? <Badge variant={quote ? "success" : "outline"}>{quote ? money.format(quote) : "Not configured"}</Badge> : <Badge variant={plan?.enforceCapacity ? "success" : "outline"}>{plan?.enforceCapacity ? "Limit enforced" : "Planning only"}</Badge>}</div>
            {mode === "fees" ? <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2 text-xs font-semibold text-muted-foreground">Term fee<PlanningCell yearId={year.id} classId={item.id} className={item.name} field="termFee" value={plan?.termFee} admin={admin} /></div><div className="space-y-2 text-xs font-semibold text-muted-foreground">Annual fee<PlanningCell yearId={year.id} classId={item.id} className={item.name} field="annualFees" value={plan?.annualFees} admin={admin} /></div></div> : <div className="space-y-4"><PlanningCell yearId={year.id} classId={item.id} className={item.name} field="seatCapacity" value={plan?.seatCapacity} admin={admin} /><div className="grid grid-cols-4 gap-2 text-center text-xs text-muted-foreground"><span><b className="block text-base text-foreground">{count.admitted}</b>Admitted</span><span><b className="block text-base text-foreground">{count.reserved ?? 0}</b>Reserved</span><span><b className="block text-base text-foreground">{count.pending}</b>Pending</span><span><b className="block text-base text-foreground">{seats.available ?? "—"}</b>Available</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${plan?.seatCapacity ? Math.min(100, Math.round((count.admitted + (count.reserved ?? 0)) / plan.seatCapacity * 100)) : 0}%` }} /></div>{admin && <Button type="button" size="sm" variant="outline" className="w-full" disabled={busy || plan?.seatCapacity === undefined} onClick={() => void save({ yearId: year.id, classId: item.id, enforceCapacity: !plan?.enforceCapacity })}>{plan?.enforceCapacity ? "Disable capacity limit" : "Enforce capacity limit"}</Button>}</div>}
          </article>;
        })}</div>
        <div className="hidden overflow-x-auto rounded-2xl border border-border/60 lg:block"><Table><TableHeader><TableRow className="bg-muted/35"><TableHead>Class</TableHead>{mode === "fees" ? <><TableHead>Term fee</TableHead><TableHead>Annual fee</TableHead><TableHead className="text-right">Combined quote</TableHead></> : <><TableHead>Capacity</TableHead><TableHead>Admitted</TableHead><TableHead>Reserved</TableHead><TableHead>Pending</TableHead><TableHead>Available</TableHead><TableHead>Limit</TableHead></>}</TableRow></TableHeader><TableBody>{classes.map((item) => {
          const plan = year.planning[item.id]; const count = counts[`${year.id}:${item.id}`] ?? { admitted: 0, pending: 0, reserved: 0 }; const seats = seatSummary(plan?.seatCapacity, count.reserved ?? 0, count.admitted); const quote = (plan?.termFee ?? 0) + (plan?.annualFees ?? 0);
          return <TableRow key={`${year.id}:${item.id}`}><TableCell><p className="font-bold">{item.name}</p><p className="text-xs text-muted-foreground">{mode === "fees" ? quote ? "Fee configured" : "Needs configuration" : plan?.enforceCapacity ? "Limit enforced" : "Planning only"}</p></TableCell>{mode === "fees" ? <><TableCell><PlanningCell yearId={year.id} classId={item.id} className={item.name} field="termFee" value={plan?.termFee} admin={admin} /></TableCell><TableCell><PlanningCell yearId={year.id} classId={item.id} className={item.name} field="annualFees" value={plan?.annualFees} admin={admin} /></TableCell><TableCell className="text-right font-black tabular-nums">{quote ? money.format(quote) : "—"}</TableCell></> : <><TableCell><PlanningCell yearId={year.id} classId={item.id} className={item.name} field="seatCapacity" value={plan?.seatCapacity} admin={admin} /></TableCell><TableCell>{count.admitted}</TableCell><TableCell>{count.reserved ?? 0}</TableCell><TableCell>{count.pending}</TableCell><TableCell className="font-bold">{seats.available ?? "—"}</TableCell><TableCell>{admin ? <Button type="button" size="sm" variant="outline" disabled={busy || plan?.seatCapacity === undefined} onClick={() => void save({ yearId: year.id, classId: item.id, enforceCapacity: !plan?.enforceCapacity })}>{plan?.enforceCapacity ? "Enforced · disable" : "Planning · enforce"}</Button> : plan?.enforceCapacity ? "Enforced" : "Planning"}</TableCell></>}</TableRow>;
        })}</TableBody></Table></div>
      </> : null}
    </AdmissionPanel>
  </div>;
}

export function PublicEnquirySetting({ years }: { years: Year[] }) {
  const { busy, save } = usePlanningSave();
  return <AdmissionPanel title="Parent enquiry portal" icon={Globe}><p className="text-sm text-muted-foreground">Disabled by default. Enable only after school approval. The public form uses consent and server rate limiting.</p>{years.map((year) => <div key={year.id} className="flex items-center justify-between gap-3"><div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{year.name}</span><Badge variant={year.publicEnabled ? "success" : "outline"} className={year.publicEnabled ? "dark:text-emerald-300" : undefined}>{year.publicEnabled ? "Enabled" : "Disabled"}</Badge></div><Button size="sm" disabled={busy} onClick={() => void save({ yearId: year.id, publicEnabled: !year.publicEnabled })}>{year.publicEnabled ? "Disable" : "Enable"}</Button></div>)}</AdmissionPanel>;
}
