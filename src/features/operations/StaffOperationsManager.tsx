"use client";

import { FormEvent, useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Banknote,
  CalendarCheck2,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  IndianRupee,
  Plus,
  ReceiptText,
  Upload,
  UserCheck,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  EmptyPanel,
  EntityCombobox,
  Field,
  formatCurrency,
  formatDate,
  formValues,
  MetricCard,
  nested,
  operationRequest,
  OperationsData,
  Row,
  SelectField,
  StatusBadge,
  titleCase,
  useOperationMutation,
} from "./shared";
import { StaffAttendanceMarker } from "./StaffAttendanceMarker";

const attendanceStatuses = [
  "PRESENT",
  "ABSENT",
  "HALF_DAY",
  "ON_LEAVE",
  "HOLIDAY",
].map((value) => ({ value, label: titleCase(value) }));
const leaveTypes = [
  "CASUAL",
  "SICK",
  "EARNED",
  "MATERNITY",
  "PATERNITY",
  "COMPENSATORY",
  "UNPAID",
  "OTHER",
].map((value) => ({ value, label: titleCase(value) }));
const paymentModes = ["BANK_TRANSFER", "CASH", "CHEQUE", "UPI"].map(
  (value) => ({ value, label: titleCase(value) }),
);

export function StaffOperationsManager({ data }: { data: OperationsData }) {
  const { pending, mutate, submit } = useOperationMutation();
  const params = useParams<{ schoolSlug: string }>();
  const router = useRouter();
  const teachers = data.teachers ?? [];
  const teacherOptions = teachers.map((teacher) => ({
    value: teacher.id,
    label: teacher.fullName,
    description: `${teacher.employeeId}${teacher.designation ? ` · ${teacher.designation}` : ""}`,
  }));
  const [attendanceTeacher, setAttendanceTeacher] = useState("");
  const [leaveTeacher, setLeaveTeacher] = useState("");
  const [salaryTeacher, setSalaryTeacher] = useState("");
  const [csvRows, setCsvRows] = useState<Row[]>([]);
  const [importPending, startImport] = useTransition();
  const [decision, setDecision] = useState<{
    id: string;
    staff: string;
    status: "APPROVED" | "REJECTED";
  } | null>(null);
  const [payment, setPayment] = useState<{
    id: string;
    staff: string;
    amount: string;
  } | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date();
  const attendance = data.attendance ?? [];
  const leaves = data.leaves ?? [];
  const entries = data.payrollEntries ?? [];
  const presentToday = attendance.filter(
    (row) =>
      String(row.date).slice(0, 10) === today && row.status === "PRESENT",
  ).length;
  const pendingLeaves = leaves.filter((row) => row.status === "PENDING").length;
  const unpaidPayroll = entries
    .filter((row) => row.paymentStatus !== "PAID")
    .reduce((sum, row) => sum + Number(row.netSalary ?? 0), 0);

  function parseCsv(file: File) {
    void file.text().then((content) => {
      const lines = content.trim().split(/\r?\n/).filter(Boolean);
      const headers =
        lines
          .shift()
          ?.split(",")
          .map((value) => value.trim()) ?? [];
      const required = ["employeeId", "date", "status"];
      if (required.some((field) => !headers.includes(field))) {
        toast.error("CSV must contain employeeId, date and status columns.");
        setCsvRows([]);
        return;
      }
      setCsvRows(
        lines.map((line) =>
          Object.fromEntries(
            line
              .split(",")
              .map((value, index) => [headers[index], value.trim()]),
          ),
        ),
      );
    });
  }

  function submitSalary(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const raw = formValues(form);
    const allowances = {
      HRA: Number(raw.hra || 0),
      DA: Number(raw.da || 0),
      Travel: Number(raw.travelAllowance || 0),
      Other: Number(raw.otherAllowance || 0),
    };
    const deductions = {
      PF: Number(raw.pf || 0),
      ESI: Number(raw.esi || 0),
      Tax: Number(raw.tax || 0),
      Other: Number(raw.otherDeduction || 0),
    };
    mutate(
      "SAVE_SALARY",
      {
        teacherId: salaryTeacher,
        effectiveFrom: raw.effectiveFrom,
        basicSalary: raw.basicSalary,
        allowances,
        deductions,
      },
      {
        success: "Salary structure saved.",
        after: () => {
          form.reset();
          setSalaryTeacher("");
        },
      },
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <section className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/70 to-violet-50/70 p-6 shadow-[0_16px_45px_rgba(15,23,42,0.06)] sm:p-7">
        <div className="absolute -right-24 -top-24 size-72 rounded-full bg-indigo-400/10 blur-3xl" />
        <div className="relative grid gap-5 lg:grid-cols-[1.35fr_1fr] lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">
              Workforce operations
            </p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight">
              Attendance, leave and payroll in one controlled workflow.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Record daily presence, import biometric files, approve leave,
              define earnings and deductions, generate payroll and issue
              printable payslips.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <MetricCard
              label="Active staff"
              value={teachers.length}
              icon={UsersRound}
            />
            <MetricCard
              label="Present today"
              value={presentToday}
              icon={UserCheck}
              tone="emerald"
            />
          </div>
        </div>
      </section>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Pending leave"
          value={pendingLeaves}
          detail="Awaiting administrator decision"
          icon={CalendarCheck2}
          tone="amber"
        />
        <MetricCard
          label="Active salary structures"
          value={(data.salaries ?? []).length}
          icon={IndianRupee}
        />
        <MetricCard
          label="Payroll runs"
          value={(data.payrollRuns ?? []).length}
          icon={ReceiptText}
        />
        <MetricCard
          label="Unpaid payroll"
          value={formatCurrency(unpaidPayroll)}
          icon={Banknote}
          tone="rose"
        />
      </div>

      <Tabs defaultValue="attendance" className="space-y-5">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="leave">Leave approvals</TabsTrigger>
          <TabsTrigger value="salary">Salary structures</TabsTrigger>
          <TabsTrigger value="payroll">Payroll & payslips</TabsTrigger>
        </TabsList>
        <TabsContent value="attendance" className="space-y-5">
          <StaffAttendanceMarker teachers={teachers} attendance={attendance} />
          <div className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
            <Card>
              <CardHeader>
                <CardTitle>Record daily attendance</CardTitle>
                <CardDescription>
                  Use the school staff directory and capture the source for a
                  reliable audit trail.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  className="grid gap-4 sm:grid-cols-2"
                  onSubmit={(event) =>
                    submit(
                      "RECORD_ATTENDANCE",
                      event,
                      { teacherId: attendanceTeacher },
                      "Attendance recorded.",
                    )
                  }
                >
                  <Field
                    label="Staff member"
                    required
                    className="sm:col-span-2"
                  >
                    <EntityCombobox
                      value={attendanceTeacher}
                      onChange={setAttendanceTeacher}
                      options={teacherOptions}
                      placeholder="Search staff by name or employee ID"
                      searchPlaceholder="Search staff…"
                    />
                  </Field>
                  <Field label="Attendance date" required>
                    <Input
                      name="date"
                      type="date"
                      defaultValue={today}
                      required
                    />
                  </Field>
                  <Field label="Status" required>
                    <SelectField
                      name="status"
                      placeholder="Choose status"
                      options={attendanceStatuses}
                      defaultValue="PRESENT"
                    />
                  </Field>
                  <Field label="Check-in time">
                    <Input name="checkIn" type="time" />
                  </Field>
                  <Field label="Check-out time">
                    <Input name="checkOut" type="time" />
                  </Field>
                  <Field label="Entry source">
                    <SelectField
                      name="source"
                      placeholder="Choose source"
                      defaultValue="MANUAL"
                      options={[
                        { value: "MANUAL", label: "Manual entry" },
                        { value: "BIOMETRIC", label: "Biometric device" },
                      ]}
                    />
                  </Field>
                  <Field label="Device/reference">
                    <Input
                      name="deviceRef"
                      placeholder="Device ID or register reference"
                    />
                  </Field>
                  <Field label="Remarks" className="sm:col-span-2">
                    <Textarea
                      name="remarks"
                      placeholder="Late arrival, official duty, correction reason…"
                    />
                  </Field>
                  <div className="sm:col-span-2">
                    <Button disabled={pending || !attendanceTeacher}>
                      <CheckCircle2 className="size-4" />
                      Save attendance
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Biometric or manual CSV import</CardTitle>
                <CardDescription>
                  Required columns: employeeId, date, status. Optional: checkIn,
                  checkOut, deviceRef.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/20 p-6 text-center transition hover:border-primary/40 hover:bg-primary/[0.03]">
                  <Upload className="size-7 text-primary" />
                  <span className="mt-3 text-sm font-semibold">
                    Choose attendance CSV
                  </span>
                  <span className="mt-1 text-xs text-muted-foreground">
                    Up to 3,000 rows per import
                  </span>
                  <Input
                    type="file"
                    accept=".csv,text/csv"
                    className="sr-only"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) parseCsv(file);
                    }}
                  />
                </label>
                <div className="flex items-center justify-between rounded-xl border bg-muted/20 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold">
                      {csvRows.length} rows ready
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Records update the same employee/date if already present.
                    </p>
                  </div>
                  <FileSpreadsheet className="size-5 text-muted-foreground" />
                </div>
                <Button
                  className="w-full"
                  disabled={!csvRows.length || importPending}
                  onClick={() =>
                    startImport(async () => {
                      try {
                        await operationRequest("IMPORT_ATTENDANCE", csvRows);
                        toast.success(
                          `${csvRows.length} attendance records imported.`,
                        );
                        setCsvRows([]);
                        router.refresh();
                      } catch (error) {
                        toast.error(
                          error instanceof Error
                            ? error.message
                            : "Import failed.",
                        );
                      }
                    })
                  }
                >
                  {importPending ? "Importing…" : "Import attendance"}
                </Button>
              </CardContent>
            </Card>
          </div>
          <AttendanceTable rows={attendance} />
        </TabsContent>

        <TabsContent value="leave" className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Create staff leave request</CardTitle>
              <CardDescription>
                Record leave for any staff member and route it into the approval
                register.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
                onSubmit={(event) =>
                  submit(
                    "CREATE_STAFF_LEAVE",
                    event,
                    { teacherId: leaveTeacher },
                    "Leave request created.",
                  )
                }
              >
                <Field label="Staff member" required className="md:col-span-2">
                  <EntityCombobox
                    value={leaveTeacher}
                    onChange={setLeaveTeacher}
                    options={teacherOptions}
                    placeholder="Search staff member"
                  />
                </Field>
                <Field label="Leave type" required>
                  <SelectField
                    name="leaveType"
                    placeholder="Choose leave type"
                    options={leaveTypes}
                    defaultValue="CASUAL"
                  />
                </Field>
                <Field label="Duration (days)" required>
                  <Input
                    name="days"
                    type="number"
                    min="0.5"
                    step="0.5"
                    required
                  />
                </Field>
                <Field label="Start date" required>
                  <Input name="startDate" type="date" required />
                </Field>
                <Field label="End date" required>
                  <Input name="endDate" type="date" required />
                </Field>
                <Field label="Reason" required className="md:col-span-2">
                  <Textarea
                    name="reason"
                    minLength={3}
                    maxLength={1000}
                    required
                    placeholder="Reason for leave and any handover information"
                  />
                </Field>
                <div className="md:col-span-2 xl:col-span-4">
                  <Button disabled={pending || !leaveTeacher}>
                    <Plus className="size-4" />
                    Create leave request
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
          <LeaveTable
            rows={leaves}
            onDecision={(row, status) =>
              setDecision({
                id: String(row.id),
                staff: nested(row, "teacher", "fullName"),
                status,
              })
            }
          />
        </TabsContent>

        <TabsContent value="salary" className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Salary structure</CardTitle>
              <CardDescription>
                Define monthly basic pay, recurring allowances and statutory or
                custom deductions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-6" onSubmit={submitSalary}>
                <div className="grid gap-4 md:grid-cols-3">
                  <Field
                    label="Staff member"
                    required
                    className="md:col-span-2"
                  >
                    <EntityCombobox
                      value={salaryTeacher}
                      onChange={setSalaryTeacher}
                      options={teacherOptions}
                      placeholder="Search staff member"
                    />
                  </Field>
                  <Field label="Effective from" required>
                    <Input
                      name="effectiveFrom"
                      type="date"
                      defaultValue={today}
                      required
                    />
                  </Field>
                  <Field label="Basic salary (₹)" required>
                    <Input
                      name="basicSalary"
                      type="number"
                      min="1"
                      step="0.01"
                      inputMode="decimal"
                      required
                    />
                  </Field>
                </div>
                <div className="grid gap-6 lg:grid-cols-2">
                  <SalaryGroup
                    title="Monthly allowances"
                    tone="emerald"
                    fields={[
                      { name: "hra", label: "House rent allowance" },
                      { name: "da", label: "Dearness allowance" },
                      { name: "travelAllowance", label: "Travel allowance" },
                      { name: "otherAllowance", label: "Other allowance" },
                    ]}
                  />
                  <SalaryGroup
                    title="Monthly deductions"
                    tone="rose"
                    fields={[
                      { name: "pf", label: "Provident fund" },
                      { name: "esi", label: "ESI" },
                      { name: "tax", label: "Income/professional tax" },
                      { name: "otherDeduction", label: "Other deduction" },
                    ]}
                  />
                </div>
                <Button disabled={pending || !salaryTeacher}>
                  <IndianRupee className="size-4" />
                  Save salary structure
                </Button>
              </form>
            </CardContent>
          </Card>
          <SalaryTable rows={data.salaries ?? []} />
        </TabsContent>

        <TabsContent value="payroll" className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-[0.7fr_1.3fr]">
            <Card>
              <CardHeader>
                <CardTitle>Generate monthly payroll</CardTitle>
                <CardDescription>
                  Creates one payslip from each active salary structure.
                  Re-running safely refreshes unpaid entries.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  className="space-y-4"
                  onSubmit={(event) =>
                    submit(
                      "RUN_PAYROLL",
                      event,
                      undefined,
                      "Monthly payroll generated.",
                    )
                  }
                >
                  <Field label="Payroll year" required>
                    <SelectField
                      name="year"
                      placeholder="Choose year"
                      defaultValue={String(now.getFullYear())}
                      options={Array.from({ length: 5 }, (_, index) => ({
                        value: String(now.getFullYear() - 2 + index),
                        label: String(now.getFullYear() - 2 + index),
                      }))}
                    />
                  </Field>
                  <Field label="Payroll month" required>
                    <SelectField
                      name="month"
                      placeholder="Choose month"
                      defaultValue={String(now.getMonth() + 1)}
                      options={Array.from({ length: 12 }, (_, index) => ({
                        value: String(index + 1),
                        label: new Intl.DateTimeFormat("en-IN", {
                          month: "long",
                        }).format(new Date(2026, index, 1)),
                      }))}
                    />
                  </Field>
                  <Field label="Run notes">
                    <Textarea
                      name="notes"
                      placeholder="Optional payroll note"
                    />
                  </Field>
                  <Button className="w-full" disabled={pending}>
                    <Banknote className="size-4" />
                    Generate payroll
                  </Button>
                </form>
              </CardContent>
            </Card>
            <PayrollRuns rows={data.payrollRuns ?? []} />
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button asChild variant="outline">
              <a
                href={`/api/v1/operations?kind=payroll-report&year=${now.getFullYear()}&month=${now.getMonth() + 1}`}
              >
                <Download className="size-4" />
                Download current-month CSV
              </a>
            </Button>
          </div>
          <PayrollTable
            rows={entries}
            schoolSlug={params.schoolSlug}
            onPayment={(row) =>
              setPayment({
                id: String(row.id),
                staff: nested(row, "teacher", "fullName"),
                amount: formatCurrency(row.netSalary),
              })
            }
          />
        </TabsContent>
      </Tabs>

      <DecisionDialog
        value={decision}
        pending={pending}
        onClose={() => setDecision(null)}
        onSubmit={(event) => {
          event.preventDefault();
          if (!decision) return;
          const values = formValues(event.currentTarget);
          mutate(
            "DECIDE_STAFF_LEAVE",
            {
              id: decision.id,
              status: decision.status,
              decisionNote: values.decisionNote,
            },
            {
              success: `Leave ${decision.status.toLowerCase()}.`,
              after: () => setDecision(null),
            },
          );
        }}
      />
      <PaymentDialog
        value={payment}
        pending={pending}
        onClose={() => setPayment(null)}
        onSubmit={(event) => {
          event.preventDefault();
          if (!payment) return;
          const values = formValues(event.currentTarget);
          mutate(
            "MARK_PAYROLL_PAID",
            {
              entryId: payment.id,
              paymentMode: values.paymentMode,
              paymentRef: values.paymentRef,
            },
            {
              success: "Salary payment recorded.",
              after: () => setPayment(null),
            },
          );
        }}
      />
    </div>
  );
}

function SalaryGroup({
  title,
  fields,
  tone,
}: {
  title: string;
  fields: Array<{ name: string; label: string }>;
  tone: "emerald" | "rose";
}) {
  return (
    <section
      className={`rounded-2xl border p-4 ${tone === "emerald" ? "border-emerald-200 bg-emerald-50/40" : "border-rose-200 bg-rose-50/40"}`}
    >
      <h3 className="font-semibold">{title}</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {fields.map((field) => (
          <Field key={field.name} label={`${field.label} (₹)`}>
            <Input
              name={field.name}
              type="number"
              min="0"
              step="0.01"
              defaultValue="0"
              inputMode="decimal"
            />
          </Field>
        ))}
      </div>
    </section>
  );
}
function AttendanceTable({ rows }: { rows: Row[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance register</CardTitle>
        <CardDescription>
          Latest manual, biometric and imported entries.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {!rows.length ? (
          <EmptyPanel
            title="No attendance recorded"
            description="Attendance records will appear here after the first entry or import."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-sm">
              <thead className="border-y bg-muted/30">
                <tr>
                  {[
                    "Staff",
                    "Date",
                    "Status",
                    "Check in",
                    "Check out",
                    "Source",
                    "Remarks",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="px-5 py-3 text-left text-xs uppercase text-muted-foreground"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={String(row.id)} className="border-b last:border-0">
                    <td className="px-5 py-4">
                      <p className="font-semibold">
                        {nested(row, "teacher", "fullName")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {nested(row, "teacher", "employeeId")}
                      </p>
                    </td>
                    <td className="px-5 py-4">{formatDate(row.date)}</td>
                    <td className="px-5 py-4">
                      <StatusBadge value={row.status} />
                    </td>
                    <td className="px-5 py-4">{String(row.checkIn ?? "—")}</td>
                    <td className="px-5 py-4">{String(row.checkOut ?? "—")}</td>
                    <td className="px-5 py-4">
                      <Badge variant="outline">{titleCase(row.source)}</Badge>
                    </td>
                    <td className="max-w-56 truncate px-5 py-4 text-muted-foreground">
                      {String(row.remarks ?? "—")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
function LeaveTable({
  rows,
  onDecision,
}: {
  rows: Row[];
  onDecision: (row: Row, status: "APPROVED" | "REJECTED") => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Leave register</CardTitle>
        <CardDescription>
          Review pending requests and retain decision notes.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {!rows.length ? (
          <EmptyPanel
            title="No leave requests"
            description="New staff leave requests will appear here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-sm">
              <thead className="border-y bg-muted/30">
                <tr>
                  {[
                    "Staff",
                    "Leave",
                    "Dates",
                    "Days",
                    "Reason",
                    "Status",
                    "Actions",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="px-5 py-3 text-left text-xs uppercase text-muted-foreground"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={String(row.id)} className="border-b last:border-0">
                    <td className="px-5 py-4 font-semibold">
                      {nested(row, "teacher", "fullName")}
                    </td>
                    <td className="px-5 py-4">{titleCase(row.leaveType)}</td>
                    <td className="px-5 py-4">
                      {formatDate(row.startDate)} – {formatDate(row.endDate)}
                    </td>
                    <td className="px-5 py-4">{String(row.days)}</td>
                    <td className="max-w-64 truncate px-5 py-4">
                      {String(row.reason)}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge value={row.status} />
                    </td>
                    <td className="px-5 py-4">
                      {row.status === "PENDING" ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => onDecision(row, "APPROVED")}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onDecision(row, "REJECTED")}
                          >
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {String(row.decisionNote ?? "Decision recorded")}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
function SalaryTable({ rows }: { rows: Row[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Active salary structures</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {!rows.length ? (
          <EmptyPanel
            title="No salary structures"
            description="Add a salary structure before generating payroll."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="border-y bg-muted/30">
                <tr>
                  {[
                    "Staff",
                    "Effective",
                    "Basic",
                    "Allowances",
                    "Deductions",
                    "Estimated net",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left text-xs uppercase text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const allowances = row.allowances as Record<string, number>;
                  const deductions = row.deductions as Record<string, number>;
                  const allowance = Object.values(allowances).reduce(
                    (a, b) => a + Number(b),
                    0,
                  );
                  const deduction = Object.values(deductions).reduce(
                    (a, b) => a + Number(b),
                    0,
                  );
                  return (
                    <tr key={String(row.id)} className="border-b last:border-0">
                      <td className="px-5 py-4 font-semibold">
                        {nested(row, "teacher", "fullName")}
                      </td>
                      <td className="px-5 py-4">
                        {formatDate(row.effectiveFrom)}
                      </td>
                      <td className="px-5 py-4">
                        {formatCurrency(row.basicSalary)}
                      </td>
                      <td className="px-5 py-4 text-emerald-700">
                        +{formatCurrency(allowance)}
                      </td>
                      <td className="px-5 py-4 text-rose-700">
                        −{formatCurrency(deduction)}
                      </td>
                      <td className="px-5 py-4 font-bold">
                        {formatCurrency(
                          Number(row.basicSalary) + allowance - deduction,
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
function PayrollRuns({ rows }: { rows: Row[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payroll run history</CardTitle>
        <CardDescription>
          Generated monthly registers and their overall state.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!rows.length ? (
          <EmptyPanel
            title="No payroll generated"
            description="Choose a month and generate the first payroll run."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {rows.slice(0, 8).map((row) => (
              <div key={String(row.id)} className="rounded-2xl border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">
                      {new Intl.DateTimeFormat("en-IN", {
                        month: "long",
                      }).format(new Date(2026, Number(row.month) - 1, 1))}{" "}
                      {String(row.year)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {nested(row, "_count", "entries")} payslips
                    </p>
                  </div>
                  <StatusBadge value={row.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
function PayrollTable({
  rows,
  schoolSlug,
  onPayment,
}: {
  rows: Row[];
  schoolSlug: string;
  onPayment: (row: Row) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payroll register</CardTitle>
        <CardDescription>
          Review net pay, payment status and printable payslips.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {!rows.length ? (
          <EmptyPanel
            title="No payroll entries"
            description="Generate a payroll run to create payslips."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="border-y bg-muted/30">
                <tr>
                  {[
                    "Period",
                    "Staff",
                    "Basic",
                    "Allowances",
                    "Deductions",
                    "Net salary",
                    "Status",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left text-xs uppercase text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={String(row.id)} className="border-b last:border-0">
                    <td className="px-5 py-4">
                      {nested(row, "payrollRun", "month")}/
                      {nested(row, "payrollRun", "year")}
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold">
                        {nested(row, "teacher", "fullName")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {nested(row, "teacher", "employeeId")}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      {formatCurrency(row.basicSalary)}
                    </td>
                    <td className="px-5 py-4">
                      {formatCurrency(row.allowanceTotal)}
                    </td>
                    <td className="px-5 py-4">
                      {formatCurrency(row.deductionTotal)}
                    </td>
                    <td className="px-5 py-4 font-bold">
                      {formatCurrency(row.netSalary)}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge value={row.paymentStatus} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        <Button asChild size="sm" variant="outline">
                          <a
                            href={`/${schoolSlug}/staff-operations/payslips/${String(row.id)}`}
                          >
                            Payslip
                          </a>
                        </Button>
                        {row.paymentStatus !== "PAID" ? (
                          <Button size="sm" onClick={() => onPayment(row)}>
                            Record payment
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
function DecisionDialog({
  value,
  pending,
  onClose,
  onSubmit,
}: {
  value: { staff: string; status: string } | null;
  pending: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Dialog
      open={Boolean(value)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>
              {value?.status === "APPROVED" ? "Approve" : "Reject"} leave
              request?
            </DialogTitle>
            <DialogDescription>
              Record the decision for {value?.staff}. A note is recommended for
              audit clarity.
            </DialogDescription>
          </DialogHeader>
          <div className="py-5">
            <Field label="Decision note">
              <Textarea
                name="decisionNote"
                placeholder="Approval conditions or rejection reason"
              />
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              disabled={pending}
              variant={value?.status === "REJECTED" ? "destructive" : "default"}
            >
              Confirm {value?.status.toLowerCase()}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
function PaymentDialog({
  value,
  pending,
  onClose,
  onSubmit,
}: {
  value: { staff: string; amount: string } | null;
  pending: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Dialog
      open={Boolean(value)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Record salary payment</DialogTitle>
            <DialogDescription>
              {value?.staff} · {value?.amount}. This marks the payslip as paid.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-5">
            <Field label="Payment mode" required>
              <SelectField
                name="paymentMode"
                placeholder="Choose payment mode"
                options={paymentModes}
                defaultValue="BANK_TRANSFER"
              />
            </Field>
            <Field label="Payment reference">
              <Input
                name="paymentRef"
                placeholder="UTR, cheque number or voucher number"
              />
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button disabled={pending}>Confirm payment</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
