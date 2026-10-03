"use client";

import { FormEvent, ReactNode, useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import { Activity, BadgeIndianRupee, Boxes, ClipboardPlus, HeartPulse, ShieldCheck, UsersRound, Wrench } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { OperationsModule } from "./data";

type Item = { [key: string]: unknown };
type Data = {
  teachers?: Item[]; students?: Item[]; attendance?: Item[]; leaves?: Item[]; salaries?: Item[];
  payrollRuns?: Item[]; payrollEntries?: Item[]; visitors?: Item[]; records?: Item[]; visits?: Item[];
  items?: Item[]; authorizations?: Item[]; tickets?: Item[]; metrics?: Item;
};

function text(value: unknown) { return value === null || value === undefined ? "—" : String(value); }
function nested(row: Item, key: string, child: string) { const value = row[key]; return value && typeof value === "object" ? text((value as Item)[child]) : "—"; }
function date(value: unknown) { return value ? new Date(String(value)).toLocaleDateString("en-IN") : "—"; }
function currency(value: unknown) { return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value ?? 0)); }

async function save(action: string, data: unknown) {
  const response = await fetch("/api/v1/operations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, data }) });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.message || "Unable to save changes.");
  return result.data;
}

function values(form: HTMLFormElement) {
  const result: Record<string, unknown> = Object.fromEntries(new FormData(form));
  for (const control of Array.from(form.elements)) {
    if (control instanceof HTMLInputElement && control.type === "checkbox" && control.name) result[control.name] = control.checked;
  }
  for (const key of ["allowances", "deductions"]) {
    if (typeof result[key] === "string") {
      result[key] = Object.fromEntries(String(result[key]).split(",").map((part) => part.trim()).filter(Boolean).map((part) => {
        const [name, amount] = part.split(":"); return [name?.trim(), Number(amount ?? 0)];
      }).filter(([name]) => name));
    }
  }
  return result;
}

function Field({ label, name, type = "text", required = false, defaultValue, min, step, children }: { label: string; name: string; type?: string; required?: boolean; defaultValue?: string | number; min?: string; step?: string; children?: ReactNode }) {
  return <div className="space-y-1.5"><Label htmlFor={name}>{label}</Label>{children ?? <Input id={name} name={name} type={type} required={required} defaultValue={defaultValue} min={min} step={step} />}</div>;
}

function SelectField({ label, name, options, required = true }: { label: string; name: string; options: Array<{ value: string; label: string }>; required?: boolean }) {
  return <Field label={label} name={name}><select name={name} required={required} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">Select</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>;
}

function FormCard({ title, description, action, children, submitLabel = "Save", extra }: { title: string; description: string; action: string; children: ReactNode; submitLabel?: string; extra?: Record<string, unknown> }) {
  const router = useRouter(); const [pending, startTransition] = useTransition();
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = event.currentTarget; startTransition(async () => { try { await save(action, { ...values(form), ...extra }); toast.success("Saved successfully."); form.reset(); router.refresh(); } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to save."); } }); }
  return <Card><CardHeader><CardTitle className="text-base">{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardContent><form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">{children}<div className="sm:col-span-2"><Button disabled={pending}>{pending ? "Saving…" : submitLabel}</Button></div></form></CardContent></Card>;
}

function ActionButton({ action, data, label, variant = "outline" }: { action: string; data: Record<string, unknown>; label: string; variant?: "outline" | "default" | "destructive" }) {
  const router = useRouter(); const [pending, startTransition] = useTransition();
  return <Button size="sm" variant={variant} disabled={pending} onClick={() => startTransition(async () => { try { await save(action, data); toast.success("Updated successfully."); router.refresh(); } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to update."); } })}>{pending ? "…" : label}</Button>;
}

function DataTable({ title, rows, columns, empty = "No records yet." }: { title: string; rows: Item[]; columns: Array<{ label: string; render: (row: Item) => ReactNode }>; empty?: string }) {
  return <Card className="overflow-hidden"><CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader><CardContent className="p-0">{rows.length === 0 ? <p className="px-6 pb-6 text-sm text-muted-foreground">{empty}</p> : <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-sm"><thead className="border-y bg-muted/40"><tr>{columns.map((column) => <th key={column.label} className="px-4 py-3 text-left text-xs uppercase text-muted-foreground">{column.label}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={text(row.id)} className="border-b last:border-0">{columns.map((column) => <td key={column.label} className="px-4 py-3">{column.render(row)}</td>)}</tr>)}</tbody></table></div>}</CardContent></Card>;
}

function Staff({ data }: { data: Data }) {
  const teachers = (data.teachers ?? []).map((item) => ({ value: text(item.id), label: `${text(item.fullName)} (${text(item.employeeId)})` }));
  const now = new Date(); const today = now.toISOString().slice(0, 10); const [csvRows, setCsvRows] = useState<Item[]>([]);
  const router = useRouter(); const params = useParams<{ schoolSlug: string }>(); const [importing, startImport] = useTransition();
  function parseCsv(file: File) { file.text().then((content) => { const lines = content.trim().split(/\r?\n/); const headers = lines.shift()?.split(",").map((v) => v.trim()) ?? []; setCsvRows(lines.map((line) => Object.fromEntries(line.split(",").map((value, index) => [headers[index], value.trim()])))); }); }
  return <div className="space-y-6">
    <div className="grid gap-6 xl:grid-cols-2">
      <FormCard title="Daily staff attendance" description="Record check-in, check-out and attendance status." action="RECORD_ATTENDANCE"><SelectField label="Staff member" name="teacherId" options={teachers} /><Field label="Date" name="date" type="date" required defaultValue={today} /><SelectField label="Status" name="status" options={["PRESENT", "ABSENT", "HALF_DAY", "ON_LEAVE", "HOLIDAY"].map((v) => ({ value: v, label: v.replaceAll("_", " ") }))} /><Field label="Check in" name="checkIn" type="time" /><Field label="Check out" name="checkOut" type="time" /><Field label="Remarks" name="remarks" /></FormCard>
      <Card><CardHeader><CardTitle className="text-base">Biometric / CSV import</CardTitle><CardDescription>CSV columns: employeeId,date,status,checkIn,checkOut,deviceRef.</CardDescription></CardHeader><CardContent className="space-y-4"><Input type="file" accept=".csv,text/csv" onChange={(event) => { const file = event.target.files?.[0]; if (file) parseCsv(file); }} /><p className="text-sm text-muted-foreground">{csvRows.length} rows ready</p><Button disabled={!csvRows.length || importing} onClick={() => startImport(async () => { try { await save("IMPORT_ATTENDANCE", csvRows); toast.success(`${csvRows.length} attendance rows imported.`); setCsvRows([]); router.refresh(); } catch (error) { toast.error(error instanceof Error ? error.message : "Import failed."); } })}>{importing ? "Importing…" : "Import attendance"}</Button></CardContent></Card>
      <FormCard title="Staff leave request" description="Create and route staff leave for approval." action="CREATE_STAFF_LEAVE"><SelectField label="Staff member" name="teacherId" options={teachers} /><Field label="Leave type" name="leaveType" required defaultValue="CASUAL" /><Field label="Start date" name="startDate" type="date" required /><Field label="End date" name="endDate" type="date" required /><Field label="Days" name="days" type="number" required min="0.5" step="0.5" /><Field label="Reason" name="reason" required /></FormCard>
      <FormCard title="Salary structure" description="Set basic pay plus named allowances and deductions." action="SAVE_SALARY"><SelectField label="Staff member" name="teacherId" options={teachers} /><Field label="Effective from" name="effectiveFrom" type="date" required defaultValue={today} /><Field label="Basic salary" name="basicSalary" type="number" required min="1" step="0.01" /><Field label="Allowances" name="allowances" defaultValue="HRA:0, Travel:0" /><Field label="Deductions" name="deductions" defaultValue="PF:0, Tax:0" /></FormCard>
      <FormCard title="Run monthly payroll" description="Creates payslip entries from all active salary structures." action="RUN_PAYROLL" submitLabel="Generate payroll"><Field label="Year" name="year" type="number" required defaultValue={now.getFullYear()} /><Field label="Month" name="month" type="number" required min="1" defaultValue={now.getMonth() + 1} /><Field label="Notes" name="notes" /></FormCard>
    </div>
    <DataTable title="Recent attendance" rows={data.attendance ?? []} columns={[{ label: "Staff", render: (r) => nested(r, "teacher", "fullName") }, { label: "Date", render: (r) => date(r.date) }, { label: "Status", render: (r) => <Badge variant="outline">{text(r.status)}</Badge> }, { label: "Time", render: (r) => `${text(r.checkIn)} – ${text(r.checkOut)}` }, { label: "Source", render: (r) => text(r.source) }]} />
    <DataTable title="Leave requests" rows={data.leaves ?? []} columns={[{ label: "Staff", render: (r) => nested(r, "teacher", "fullName") }, { label: "Dates", render: (r) => `${date(r.startDate)} – ${date(r.endDate)}` }, { label: "Type", render: (r) => text(r.leaveType) }, { label: "Status", render: (r) => <Badge>{text(r.status)}</Badge> }, { label: "Decision", render: (r) => r.status === "PENDING" ? <div className="flex gap-2"><ActionButton action="DECIDE_STAFF_LEAVE" data={{ id: r.id, status: "APPROVED" }} label="Approve" /><ActionButton action="DECIDE_STAFF_LEAVE" data={{ id: r.id, status: "REJECTED" }} label="Reject" variant="destructive" /></div> : "—" }]} />
    <div className="flex justify-end"><Button asChild variant="outline"><a href={`/api/v1/operations?kind=payroll-report&year=${now.getFullYear()}&month=${now.getMonth() + 1}`}>Download monthly payroll report</a></Button></div>
    <DataTable title="Payroll and payslips" rows={data.payrollEntries ?? []} columns={[{ label: "Period", render: (r) => `${nested(r, "payrollRun", "month")}/${nested(r, "payrollRun", "year")}` }, { label: "Staff", render: (r) => nested(r, "teacher", "fullName") }, { label: "Gross", render: (r) => currency(r.grossSalary) }, { label: "Deductions", render: (r) => currency(r.deductionTotal) }, { label: "Net", render: (r) => <strong>{currency(r.netSalary)}</strong> }, { label: "Payslip", render: (r) => <Button asChild size="sm" variant="outline"><a href={`/${params.schoolSlug}/staff-operations/payslips/${text(r.id)}`}>View</a></Button> }, { label: "Payment", render: (r) => r.paymentStatus === "PAID" ? <Badge>PAID</Badge> : <ActionButton action="MARK_PAYROLL_PAID" data={{ entryId: r.id, paymentMode: "BANK_TRANSFER" }} label="Mark paid" /> }]} />
  </div>;
}

function Visitors({ data }: { data: Data }) {
  return <div className="space-y-6"><FormCard title="Visitor check-in" description="Issue a traceable gate pass and record the visit." action="CHECK_IN_VISITOR"><Field label="Visitor name" name="visitorName" required /><Field label="Phone" name="phone" required /><Field label="Purpose" name="purpose" required /><Field label="Person to meet" name="personToMeet" /><Field label="ID proof type" name="idProofType" /><Field label="ID last 4 digits" name="idProofLastFour" /><Field label="Vehicle number" name="vehicleNumber" /><Field label="Notes" name="notes" /></FormCard><DataTable title="Visitor register" rows={data.visitors ?? []} columns={[{ label: "Gate pass", render: (r) => <strong>{text(r.gatePassCode)}</strong> }, { label: "Visitor", render: (r) => <div>{text(r.visitorName)}<div className="text-xs text-muted-foreground">{text(r.phone)}</div></div> }, { label: "Purpose", render: (r) => text(r.purpose) }, { label: "Check in", render: (r) => new Date(text(r.checkInAt)).toLocaleString("en-IN") }, { label: "Status", render: (r) => <Badge>{text(r.status)}</Badge> }, { label: "Action", render: (r) => r.status === "CHECKED_IN" ? <ActionButton action="CHECK_OUT_VISITOR" data={{ id: r.id }} label="Check out" /> : date(r.checkOutAt) }]} /></div>;
}

function Health({ data }: { data: Data }) {
  const students = (data.students ?? []).map((item) => ({ value: text(item.id), label: `${text(item.fullName)} (${text(item.admissionNo)})` }));
  return <div className="space-y-6"><div className="grid gap-6 xl:grid-cols-2"><FormCard title="Student health record" description="Create or update emergency and medical information." action="SAVE_HEALTH_RECORD"><SelectField label="Student" name="studentId" options={students} /><Field label="Blood group" name="bloodGroup" /><Field label="Allergies" name="allergies" /><Field label="Medical conditions" name="medicalConditions" /><Field label="Medications" name="medications" /><Field label="Accessibility needs" name="accessibilityNeeds" /><Field label="Emergency contact" name="emergencyContact" /><Field label="Emergency phone" name="emergencyPhone" /><Field label="Physician" name="physicianName" /><Field label="Physician phone" name="physicianPhone" /></FormCard><FormCard title="Clinic / first-aid visit" description="Record an incident, action and guardian notification." action="LOG_HEALTH_VISIT"><SelectField label="Student" name="studentId" options={students} /><Field label="Complaint" name="complaint" required /><Field label="Action taken" name="actionTaken" required /><SelectField label="Disposition" name="disposition" options={["RETURNED_TO_CLASS", "SENT_HOME", "REFERRED_TO_DOCTOR", "EMERGENCY"].map((v) => ({ value: v, label: v.replaceAll("_", " ") }))} /><Field label="Follow-up" name="followUpAt" type="datetime-local" /><Field label="Guardian notified" name="guardianNotified"><input className="size-5" type="checkbox" name="guardianNotified" /></Field></FormCard></div><DataTable title="Recent health visits" rows={data.visits ?? []} columns={[{ label: "Student", render: (r) => nested(r, "student", "fullName") }, { label: "Date", render: (r) => new Date(text(r.occurredAt)).toLocaleString("en-IN") }, { label: "Complaint", render: (r) => text(r.complaint) }, { label: "Action", render: (r) => text(r.actionTaken) }, { label: "Disposition", render: (r) => <Badge variant="outline">{text(r.disposition)}</Badge> }]} /></div>;
}

function Inventory({ data }: { data: Data }) {
  const items = (data.items ?? []).map((item) => ({ value: text(item.id), label: `${text(item.name)} (${text(item.assetCode)})` }));
  return <div className="space-y-6"><div className="grid gap-6 xl:grid-cols-2"><FormCard title="Add inventory / asset" description="Register consumables, equipment and fixed assets." action="CREATE_INVENTORY_ITEM"><Field label="Asset code" name="assetCode" required /><Field label="Name" name="name" required /><Field label="Category" name="category" required /><Field label="Location" name="location" /><Field label="Opening quantity" name="quantity" type="number" required defaultValue={0} min="0" /><Field label="Reorder level" name="reorderLevel" type="number" required defaultValue={0} min="0" /><Field label="Unit cost" name="unitCost" type="number" min="0" step="0.01" /><SelectField label="Condition" name="condition" options={["NEW", "GOOD", "FAIR", "POOR", "DAMAGED"].map((v) => ({ value: v, label: v }))} /></FormCard><FormCard title="Stock movement" description="Receive, issue or correct stock quantities." action="ADJUST_INVENTORY"><SelectField label="Item" name="itemId" options={items} /><SelectField label="Movement" name="type" options={["IN", "OUT", "ADJUSTMENT"].map((v) => ({ value: v, label: v }))} /><Field label="Quantity" name="quantity" type="number" required min="1" /><Field label="Reference" name="reference" /><Field label="Notes" name="notes" /></FormCard></div><DataTable title="Inventory register" rows={data.items ?? []} columns={[{ label: "Code", render: (r) => <strong>{text(r.assetCode)}</strong> }, { label: "Item", render: (r) => text(r.name) }, { label: "Category", render: (r) => text(r.category) }, { label: "Location", render: (r) => text(r.location) }, { label: "Quantity", render: (r) => <Badge variant={Number(r.quantity) <= Number(r.reorderLevel) ? "destructive" : "outline"}>{text(r.quantity)}</Badge> }, { label: "Value", render: (r) => currency(Number(r.quantity) * Number(r.unitCost ?? 0)) }, { label: "Condition", render: (r) => text(r.condition) }]} /></div>;
}

function Pickup({ data }: { data: Data }) {
  const students = (data.students ?? []).map((item) => ({ value: text(item.id), label: `${text(item.fullName)} (${text(item.admissionNo)})` })); const today = new Date().toISOString().slice(0, 10);
  return <div className="space-y-6"><FormCard title="Authorize student pickup" description="Create a time-bound, verifiable pickup pass." action="AUTHORIZE_PICKUP"><SelectField label="Student" name="studentId" options={students} /><Field label="Authorized person" name="authorizedName" required /><Field label="Relationship" name="relationship" required /><Field label="Phone" name="phone" required /><Field label="Valid from" name="validFrom" type="date" required defaultValue={today} /><Field label="Valid until" name="validUntil" type="date" /><Field label="Recurring" name="recurring"><input className="size-5" type="checkbox" name="recurring" /></Field><Field label="Notes" name="notes" /></FormCard><DataTable title="Pickup authorizations" rows={data.authorizations ?? []} columns={[{ label: "Pickup code", render: (r) => <strong>{text(r.pickupCode)}</strong> }, { label: "Student", render: (r) => nested(r, "student", "fullName") }, { label: "Authorized person", render: (r) => `${text(r.authorizedName)} · ${text(r.relationship)}` }, { label: "Validity", render: (r) => `${date(r.validFrom)} – ${date(r.validUntil)}` }, { label: "Status", render: (r) => <Badge>{text(r.status)}</Badge> }, { label: "Actions", render: (r) => r.status === "ACTIVE" ? <div className="flex gap-2"><ActionButton action="UPDATE_PICKUP" data={{ id: r.id, action: "USE" }} label="Record pickup" /><ActionButton action="UPDATE_PICKUP" data={{ id: r.id, action: "REVOKE" }} label="Revoke" variant="destructive" /></div> : "—" }]} /></div>;
}

function Maintenance({ data }: { data: Data }) {
  return <div className="space-y-6"><FormCard title="Report maintenance issue" description="Track repairs, ownership, cost and resolution." action="CREATE_MAINTENANCE"><Field label="Title" name="title" required /><Field label="Category" name="category" required /><Field label="Location" name="location" /><SelectField label="Priority" name="priority" options={["LOW", "MEDIUM", "HIGH", "URGENT"].map((v) => ({ value: v, label: v }))} /><Field label="Assigned to" name="assignedTo" /><Field label="Estimated cost" name="estimatedCost" type="number" min="0" step="0.01" /><Field label="Due date" name="dueDate" type="date" /><Field label="Description" name="description"><Textarea name="description" required /></Field></FormCard><DataTable title="Maintenance tickets" rows={data.tickets ?? []} columns={[{ label: "Ticket", render: (r) => <strong>{text(r.ticketNo)}</strong> }, { label: "Issue", render: (r) => <div>{text(r.title)}<div className="text-xs text-muted-foreground">{text(r.location)}</div></div> }, { label: "Priority", render: (r) => <Badge variant={r.priority === "URGENT" ? "destructive" : "outline"}>{text(r.priority)}</Badge> }, { label: "Status", render: (r) => text(r.status) }, { label: "Assigned", render: (r) => text(r.assignedTo) }, { label: "Action", render: (r) => r.status === "RESOLVED" || r.status === "CLOSED" ? date(r.resolvedAt) : <ActionButton action="UPDATE_MAINTENANCE" data={{ id: r.id, status: "RESOLVED", resolution: "Completed" }} label="Resolve" /> }]} /></div>;
}

function Analytics({ data }: { data: Data }) {
  const m = data.metrics ?? {}; const cards = [
    ["Active students", m.activeStudents, UsersRound], ["Active staff", m.activeStaff, UsersRound], ["Staff present today", m.presentStaff, Activity], ["Visitors on campus", m.activeVisitors, ShieldCheck],
    ["Open maintenance", m.openMaintenance, Wrench], ["Low-stock items", m.lowStock, Boxes], ["Pending staff leave", m.pendingLeave, ClipboardPlus], ["Health visits this month", m.healthVisits, HeartPulse],
  ] as const;
  return <div className="space-y-6"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value, Icon]) => <Card key={label}><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-bold">{text(value)}</p></div><Icon className="size-8 text-primary" /></CardContent></Card>)}</div><div className="grid gap-4 md:grid-cols-3">{[["Fees collected this month", m.monthlyFees], ["Expenses this month", m.monthlyExpenses], ["Payroll this month", m.monthlyPayroll]].map(([label, value]) => <Card key={text(label)}><CardContent className="p-5"><BadgeIndianRupee className="size-6 text-primary" /><p className="mt-4 text-sm text-muted-foreground">{text(label)}</p><p className="mt-2 text-2xl font-bold">{currency(value)}</p></CardContent></Card>)}</div></div>;
}

export function OperationsManager({ module, data }: { module: OperationsModule; data: Data }) {
  return module === "staff" ? <Staff data={data} /> : module === "visitors" ? <Visitors data={data} /> : module === "health" ? <Health data={data} /> : module === "inventory" ? <Inventory data={data} /> : module === "pickup" ? <Pickup data={data} /> : module === "maintenance" ? <Maintenance data={data} /> : <Analytics data={data} />;
}
