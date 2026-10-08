"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BadgeIndianRupee,
  BookOpenCheck,
  BriefcaseBusiness,
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileClock,
  GraduationCap,
  IdCard,
  KeyRound,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
  VenusAndMars,
  XCircle,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/self-service-format";

type Period = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  displayOrder: number;
};

type Allocation = {
  id: string;
  remarks: string | null;
  academicYear: { id: string; name: string };
  class: { id: string; name: string };
  section: { id: string; name: string };
  subject: { id: string; name: string };
  timetables: Array<{ id: string; day: string; period: Period }>;
};

type TeacherProfileData = {
  id: string;
  employeeId: string;
  username: string | null;
  fullName: string;
  gender: string;
  dob: string | null;
  joiningDate: string | null;
  phone: string | null;
  alternatePhone: string | null;
  email: string | null;
  qualification: string | null;
  designation: string | null;
  experience: number | null;
  bloodGroup: string | null;
  imageUrl: string | null;
  address: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  pincode: string | null;
  active: boolean;
  clerkId: string | null;
  createdAt: string;
  updatedAt: string;
  studentDetailsAccess: boolean;
  feeAccess: boolean;
  resultAccess: boolean;
  timetableAccess: boolean;
  attendanceAccess: boolean;
  homeworkAccess: boolean;
  examAccess: boolean;
  marksEntryAccess: boolean;
  academicYear: { id: string; name: string; startDate: string; endDate: string } | null;
  allocations: Allocation[];
  classTeacherAssignments: Array<{
    id: string;
    remarks: string | null;
    academicYear: { id: string; name: string };
    class: { id: string; name: string };
    section: { id: string; name: string };
  }>;
  staffAttendances: Array<{
    id: string;
    date: string;
    status: string;
    checkIn: string | null;
    checkOut: string | null;
    source: string;
    remarks: string | null;
  }>;
  staffLeaveRequests: Array<{
    id: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    days: number | string;
    reason: string;
    status: string;
    decisionNote: string | null;
  }>;
  salaryStructures: Array<{
    id: string;
    effectiveFrom: string;
    basicSalary: number | string;
    allowances: Record<string, number>;
    deductions: Record<string, number>;
    active: boolean;
  }>;
  payrollEntries: Array<{
    id: string;
    basicSalary: number | string;
    allowanceTotal: number | string;
    deductionTotal: number | string;
    grossSalary: number | string;
    netSalary: number | string;
    paymentStatus: string;
    paymentMode: string | null;
    paymentRef: string | null;
    paidAt: string | null;
    payrollRun: { id: string; year: number; month: number; status: string };
  }>;
};

const tabs = [
  { value: "overview", label: "Overview", icon: UserRound },
  { value: "details", label: "All Details", icon: IdCard },
  { value: "teaching", label: "Teaching", icon: BookOpenCheck },
  { value: "timetable", label: "Timetable", icon: CalendarDays },
  { value: "attendance", label: "Attendance", icon: CalendarCheck2 },
  { value: "leave", label: "Leave", icon: FileClock },
  { value: "payroll", label: "Payroll", icon: BadgeIndianRupee },
  { value: "access", label: "Access", icon: KeyRound },
] as const;

const dayOrder = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "TC";
}

function InfoCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-card p-4 transition-colors hover:bg-muted/25">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="size-4.5" /></div>
        <div className="min-w-0"><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-1 break-words font-semibold">{value || "—"}</p></div>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return <Card className="border-dashed"><CardContent className="flex min-h-56 flex-col items-center justify-center p-8 text-center"><div className="flex size-14 items-center justify-center rounded-2xl bg-muted"><Icon className="size-6 text-muted-foreground" /></div><p className="mt-4 font-semibold">{title}</p><p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p></CardContent></Card>;
}

function ProfileHeader({ teacher }: { teacher: TeacherProfileData }) {
  return (
    <Card className="overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-primary via-violet-500 to-blue-500" />
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <Avatar className="size-20 rounded-2xl border-primary/10 shadow-sm sm:size-24">
            {teacher.imageUrl ? <AvatarImage src={teacher.imageUrl} alt="" className="rounded-2xl" /> : null}
            <AvatarFallback className="rounded-2xl bg-primary/10 text-2xl font-bold text-primary">{initials(teacher.fullName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><h1 className="truncate text-2xl font-bold tracking-tight">{teacher.fullName}</h1><Badge variant={teacher.active ? "success" : "secondary"}>{teacher.active ? "Active" : "Inactive"}</Badge></div>
            <p className="mt-1 text-sm font-medium text-muted-foreground">{teacher.designation || "Teaching staff"}{teacher.qualification ? ` · ${teacher.qualification}` : ""}</p>
            <div className="mt-3 flex flex-wrap gap-2"><span className="rounded-lg border bg-muted/40 px-3 py-1.5 font-mono text-xs font-semibold">{teacher.employeeId}</span>{teacher.academicYear ? <span className="rounded-lg border bg-muted/40 px-3 py-1.5 text-xs font-semibold">{teacher.academicYear.name}</span> : null}</div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:min-w-[250px]">
            <div className="rounded-2xl border bg-muted/20 p-4"><p className="text-2xl font-bold">{teacher.allocations.length}</p><p className="text-xs text-muted-foreground">Teaching roles</p></div>
            <div className="rounded-2xl border bg-muted/20 p-4"><p className="text-2xl font-bold">{teacher.classTeacherAssignments.length}</p><p className="text-xs text-muted-foreground">Class teacher roles</p></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function OverviewTab({ teacher }: { teacher: TeacherProfileData }) {
  const scheduledPeriods = teacher.allocations.reduce((sum, item) => sum + item.timetables.length, 0);
  return <div className="space-y-5"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><InfoCard icon={BriefcaseBusiness} label="Designation" value={teacher.designation || "Teaching staff"} /><InfoCard icon={GraduationCap} label="Qualification" value={teacher.qualification || "—"} /><InfoCard icon={CalendarDays} label="Joined school" value={formatDate(teacher.joiningDate)} /><InfoCard icon={Clock3} label="Weekly periods" value={String(scheduledPeriods)} /></div><Card><CardHeader className="border-b bg-muted/20"><CardTitle>Contact information</CardTitle></CardHeader><CardContent className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3"><InfoCard icon={Phone} label="Primary phone" value={teacher.phone || "—"} /><InfoCard icon={Phone} label="Alternate phone" value={teacher.alternatePhone || "—"} /><InfoCard icon={Mail} label="Email address" value={teacher.email || "—"} /><InfoCard icon={MapPin} label="Location" value={[teacher.city, teacher.district, teacher.state].filter(Boolean).join(", ") || "—"} /><InfoCard icon={BookOpenCheck} label="Subject allocations" value={String(teacher.allocations.length)} /><InfoCard icon={ShieldCheck} label="Login account" value={teacher.clerkId ? "Provisioned" : "Not provisioned"} /></CardContent></Card></div>;
}

function DetailsTab({ teacher }: { teacher: TeacherProfileData }) {
  return <div className="grid gap-5 lg:grid-cols-2"><Card><CardHeader className="border-b bg-muted/20"><CardTitle>Personal details</CardTitle></CardHeader><CardContent className="grid gap-3 p-5 sm:grid-cols-2"><InfoCard icon={IdCard} label="Employee ID" value={teacher.employeeId} /><InfoCard icon={UserRound} label="Full name" value={teacher.fullName} /><InfoCard icon={VenusAndMars} label="Gender" value={titleCase(teacher.gender)} /><InfoCard icon={CalendarDays} label="Date of birth" value={formatDate(teacher.dob)} /><InfoCard icon={CheckCircle2} label="Blood group" value={teacher.bloodGroup || "—"} /><InfoCard icon={BriefcaseBusiness} label="Experience" value={teacher.experience == null ? "—" : `${teacher.experience} years`} /></CardContent></Card><Card><CardHeader className="border-b bg-muted/20"><CardTitle>Employment & address</CardTitle></CardHeader><CardContent className="grid gap-3 p-5 sm:grid-cols-2"><InfoCard icon={CalendarDays} label="Joining date" value={formatDate(teacher.joiningDate)} /><InfoCard icon={KeyRound} label="Username" value={teacher.username || "—"} /><InfoCard icon={MapPin} label="Address" value={teacher.address || "—"} /><InfoCard icon={MapPin} label="City" value={teacher.city || "—"} /><InfoCard icon={MapPin} label="District / State" value={[teacher.district, teacher.state].filter(Boolean).join(", ") || "—"} /><InfoCard icon={MapPin} label="Pincode" value={teacher.pincode || "—"} /></CardContent></Card></div>;
}

function TeachingTab({ teacher }: { teacher: TeacherProfileData }) {
  if (!teacher.allocations.length && !teacher.classTeacherAssignments.length) return <EmptyState icon={BookOpenCheck} title="No teaching work assigned" description="Assign subjects, classes or a class-teacher responsibility to show the teacher’s current academic work here." />;
  return <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]"><Card><CardHeader className="border-b bg-muted/20"><CardTitle>Subject allocations</CardTitle><p className="text-sm text-muted-foreground">Current academic-year classes and subjects.</p></CardHeader><CardContent className="p-0"><div className="divide-y">{teacher.allocations.map((item) => <div key={item.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{item.subject.name}</p><p className="mt-1 text-sm text-muted-foreground">{item.class.name} · Section {item.section.name}</p></div><Badge variant="outline">{item.timetables.length} period{item.timetables.length === 1 ? "" : "s"}/week</Badge></div>)}</div></CardContent></Card><Card><CardHeader className="border-b bg-muted/20"><CardTitle>Class teacher</CardTitle></CardHeader><CardContent className="space-y-3 p-5">{teacher.classTeacherAssignments.length ? teacher.classTeacherAssignments.map((item) => <div key={item.id} className="rounded-2xl border bg-muted/20 p-4"><p className="font-semibold">{item.class.name} · Section {item.section.name}</p><p className="mt-1 text-xs text-muted-foreground">{item.academicYear.name}</p>{item.remarks ? <p className="mt-2 text-sm text-muted-foreground">{item.remarks}</p> : null}</div>) : <p className="text-sm text-muted-foreground">No class-teacher responsibility assigned.</p>}</CardContent></Card></div>;
}

function TimetableTab({ teacher }: { teacher: TeacherProfileData }) {
  const schedule = teacher.allocations.flatMap((allocation) => allocation.timetables.map((entry) => ({ ...entry, allocation }))).sort((a, b) => dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day) || a.period.displayOrder - b.period.displayOrder);
  const grouped = dayOrder.map((day) => ({ day, entries: schedule.filter((item) => item.day === day) })).filter((item) => item.entries.length);
  if (!schedule.length) return <EmptyState icon={CalendarDays} title="No timetable periods" description="The teacher has no active timetable periods in the current academic year." />;
  return <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">{grouped.map((group) => <Card key={group.day}><CardHeader className="border-b bg-muted/20"><CardTitle>{titleCase(group.day)}</CardTitle></CardHeader><CardContent className="space-y-3 p-4">{group.entries.map((entry) => <div key={entry.id} className="rounded-xl border p-3"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{entry.allocation.subject.name}</p><p className="mt-1 text-xs text-muted-foreground">{entry.allocation.class.name} · {entry.allocation.section.name}</p></div><Badge variant="outline">{entry.period.name}</Badge></div><p className="mt-2 text-xs text-muted-foreground">{entry.period.startTime} – {entry.period.endTime}</p></div>)}</CardContent></Card>)}</div>;
}

function AttendanceTab({ teacher }: { teacher: TeacherProfileData }) {
  const counts = teacher.staffAttendances.reduce<Record<string, number>>((result, row) => ({ ...result, [row.status]: (result[row.status] ?? 0) + 1 }), {});
  if (!teacher.staffAttendances.length) return <EmptyState icon={CalendarCheck2} title="No staff attendance recorded" description="Attendance entries for the current academic year will appear here." />;
  return <div className="space-y-5"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><InfoCard icon={CheckCircle2} label="Present" value={String(counts.PRESENT ?? 0)} /><InfoCard icon={XCircle} label="Absent" value={String(counts.ABSENT ?? 0)} /><InfoCard icon={Clock3} label="Half day" value={String(counts.HALF_DAY ?? 0)} /><InfoCard icon={FileClock} label="On leave" value={String(counts.ON_LEAVE ?? 0)} /></div><Card className="overflow-hidden"><CardHeader className="border-b bg-muted/20"><CardTitle>Attendance history</CardTitle><p className="text-sm text-muted-foreground">Latest entries in {teacher.academicYear?.name || "the current academic year"}.</p></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-sm"><thead><tr className="border-b bg-muted/20 text-left"><th className="px-5 py-3">Date</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Check in</th><th className="px-5 py-3">Check out</th><th className="px-5 py-3">Remarks</th></tr></thead><tbody className="divide-y">{teacher.staffAttendances.map((row) => <tr key={row.id} className="hover:bg-muted/20"><td className="px-5 py-4 font-medium">{formatDate(row.date)}</td><td className="px-5 py-4"><Badge variant={row.status === "PRESENT" ? "success" : row.status === "ABSENT" ? "destructive" : "outline"}>{titleCase(row.status)}</Badge></td><td className="px-5 py-4">{row.checkIn || "—"}</td><td className="px-5 py-4">{row.checkOut || "—"}</td><td className="px-5 py-4 text-muted-foreground">{row.remarks || "—"}</td></tr>)}</tbody></table></div></CardContent></Card></div>;
}

function LeaveTab({ teacher }: { teacher: TeacherProfileData }) {
  if (!teacher.staffLeaveRequests.length) return <EmptyState icon={FileClock} title="No leave requests" description="The teacher’s submitted leave requests and decisions will appear here." />;
  return <div className="grid gap-4 lg:grid-cols-2">{teacher.staffLeaveRequests.map((leave) => <Card key={leave.id}><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{titleCase(leave.leaveType)} leave</p><p className="mt-1 text-sm text-muted-foreground">{formatDate(leave.startDate)} – {formatDate(leave.endDate)} · {Number(leave.days)} day{Number(leave.days) === 1 ? "" : "s"}</p></div><Badge variant={leave.status === "APPROVED" ? "success" : leave.status === "REJECTED" ? "destructive" : "outline"}>{titleCase(leave.status)}</Badge></div><p className="mt-4 rounded-xl bg-muted/30 p-3 text-sm">{leave.reason}</p>{leave.decisionNote ? <p className="mt-3 text-xs text-muted-foreground">Decision: {leave.decisionNote}</p> : null}</CardContent></Card>)}</div>;
}

function PayrollTab({ teacher }: { teacher: TeacherProfileData }) {
  const currentSalary = teacher.salaryStructures.find((item) => item.active) ?? teacher.salaryStructures[0];
  return <div className="space-y-5">{currentSalary ? <div className="grid gap-4 sm:grid-cols-3"><InfoCard icon={BadgeIndianRupee} label="Basic salary" value={formatCurrency(Number(currentSalary.basicSalary))} /><InfoCard icon={CheckCircle2} label="Effective from" value={formatDate(currentSalary.effectiveFrom)} /><InfoCard icon={BriefcaseBusiness} label="Structure status" value={currentSalary.active ? "Active" : "Historical"} /></div> : null}{teacher.payrollEntries.length ? <Card className="overflow-hidden"><CardHeader className="border-b bg-muted/20"><CardTitle>Payroll history</CardTitle></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-sm"><thead><tr className="border-b bg-muted/20 text-left"><th className="px-5 py-3">Pay period</th><th className="px-5 py-3 text-right">Gross</th><th className="px-5 py-3 text-right">Deductions</th><th className="px-5 py-3 text-right">Net salary</th><th className="px-5 py-3 text-center">Payment</th></tr></thead><tbody className="divide-y">{teacher.payrollEntries.map((entry) => <tr key={entry.id} className="hover:bg-muted/20"><td className="px-5 py-4 font-medium">{new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(new Date(entry.payrollRun.year, entry.payrollRun.month - 1, 1))}</td><td className="px-5 py-4 text-right">{formatCurrency(Number(entry.grossSalary))}</td><td className="px-5 py-4 text-right">{formatCurrency(Number(entry.deductionTotal))}</td><td className="px-5 py-4 text-right font-bold">{formatCurrency(Number(entry.netSalary))}</td><td className="px-5 py-4 text-center"><Badge variant={entry.paymentStatus === "PAID" ? "success" : "outline"}>{titleCase(entry.paymentStatus)}</Badge></td></tr>)}</tbody></table></div></CardContent></Card> : <EmptyState icon={BadgeIndianRupee} title="No payroll history" description="Generated payroll entries for this teacher will appear here." />}</div>;
}

function AccessTab({ teacher }: { teacher: TeacherProfileData }) {
  const access = [{ label: "Student details", value: teacher.studentDetailsAccess }, { label: "Student fees", value: teacher.feeAccess }, { label: "Results", value: teacher.resultAccess }, { label: "Timetable", value: teacher.timetableAccess }, { label: "Attendance", value: teacher.attendanceAccess }, { label: "Homework", value: teacher.homeworkAccess }, { label: "Exams", value: teacher.examAccess }, { label: "Marks entry", value: teacher.marksEntryAccess }];
  return <Card><CardHeader className="border-b bg-muted/20"><CardTitle>Workspace access</CardTitle><p className="text-sm text-muted-foreground">Modules currently available to this teacher account.</p></CardHeader><CardContent className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">{access.map((item) => <div key={item.label} className="flex items-center justify-between rounded-2xl border p-4"><div className="flex items-center gap-3"><div className={item.value ? "flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600" : "flex size-9 items-center justify-center rounded-xl bg-muted text-muted-foreground"}>{item.value ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}</div><p className="text-sm font-semibold">{item.label}</p></div><Badge variant={item.value ? "success" : "secondary"}>{item.value ? "On" : "Off"}</Badge></div>)}</CardContent></Card>;
}

function TeacherProfileSkeleton() {
  return <div className="space-y-6"><div className="h-44 animate-pulse rounded-2xl bg-muted" /><div className="h-12 animate-pulse rounded-2xl bg-muted" /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="h-28 animate-pulse rounded-2xl bg-muted" />)}</div></div>;
}

export function TeacherProfile({ teacherId }: { teacherId: string }) {
  const [teacher, setTeacher] = useState<TeacherProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch(`/api/v1/teachers/${teacherId}/profile`, { cache: "no-store" });
        const result = await response.json();
        if (!cancelled) setTeacher(response.ok && result.success ? result.data : null);
      } catch {
        if (!cancelled) setTeacher(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [teacherId]);

  const visibleTabs = useMemo(() => tabs, []);
  if (loading) return <TeacherProfileSkeleton />;
  if (!teacher) return <EmptyState icon={UserRound} title="Teacher profile not found" description="The teacher record could not be loaded or you do not have permission to view it." />;

  return <div className="space-y-6 pb-10"><ProfileHeader teacher={teacher} /><Tabs defaultValue="overview"><div className="sticky top-0 z-10 -mx-1 bg-background/95 px-1 pb-2 backdrop-blur supports-[backdrop-filter]:bg-background/80"><div className="overflow-x-auto"><TabsList className="flex h-auto min-w-max w-full justify-start gap-1">{visibleTabs.map((tab) => { const Icon = tab.icon; return <TabsTrigger key={tab.value} value={tab.value} className="min-h-10 shrink-0 gap-2 px-3"><Icon className="size-4" />{tab.label}</TabsTrigger>; })}</TabsList></div></div><TabsContent value="overview"><OverviewTab teacher={teacher} /></TabsContent><TabsContent value="details"><DetailsTab teacher={teacher} /></TabsContent><TabsContent value="teaching"><TeachingTab teacher={teacher} /></TabsContent><TabsContent value="timetable"><TimetableTab teacher={teacher} /></TabsContent><TabsContent value="attendance"><AttendanceTab teacher={teacher} /></TabsContent><TabsContent value="leave"><LeaveTab teacher={teacher} /></TabsContent><TabsContent value="payroll"><PayrollTab teacher={teacher} /></TabsContent><TabsContent value="access"><AccessTab teacher={teacher} /></TabsContent></Tabs></div>;
}
