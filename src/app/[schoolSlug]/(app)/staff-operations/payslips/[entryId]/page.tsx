import { notFound } from "next/navigation";

import { PrintReportButton } from "@/components/self-service/PrintReportButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/self-service-format";

export default async function PayslipPage({ params }: { params: Promise<{ schoolSlug: string; entryId: string }> }) {
  const { schoolSlug, entryId } = await params;
  const membership = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN", "ACCOUNTANT"], schoolSlug);
  const entry = await prisma.payrollEntry.findFirst({ where: { id: entryId, schoolId: membership.schoolId }, include: { teacher: true, payrollRun: true, school: { select: { name: true } } } });
  if (!entry) notFound();
  const breakdown = entry.breakdown as { allowances?: Record<string, number>; deductions?: Record<string, number> };
  return <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-8"><div className="flex justify-end"><PrintReportButton label="Print payslip" /></div><Card><CardHeader className="border-b text-center"><p className="text-sm text-muted-foreground">{entry.school.name}</p><CardTitle>Payslip — {entry.payrollRun.month}/{entry.payrollRun.year}</CardTitle></CardHeader><CardContent className="space-y-6 p-6"><div className="grid gap-3 sm:grid-cols-2"><p><span className="text-muted-foreground">Employee:</span> {entry.teacher.fullName}</p><p><span className="text-muted-foreground">Employee ID:</span> {entry.teacher.employeeId}</p><p><span className="text-muted-foreground">Designation:</span> {entry.teacher.designation || "—"}</p><p><span className="text-muted-foreground">Payment:</span> {entry.paymentStatus}</p></div><div className="grid gap-6 sm:grid-cols-2"><section><h2 className="mb-3 font-semibold">Earnings</h2><div className="space-y-2"><p className="flex justify-between"><span>Basic salary</span><span>{formatCurrency(Number(entry.basicSalary))}</span></p>{Object.entries(breakdown.allowances ?? {}).map(([name, amount]) => <p key={name} className="flex justify-between"><span>{name}</span><span>{formatCurrency(Number(amount))}</span></p>)}</div></section><section><h2 className="mb-3 font-semibold">Deductions</h2><div className="space-y-2">{Object.entries(breakdown.deductions ?? {}).map(([name, amount]) => <p key={name} className="flex justify-between"><span>{name}</span><span>{formatCurrency(Number(amount))}</span></p>)}{Object.keys(breakdown.deductions ?? {}).length === 0 ? <p>None</p> : null}</div></section></div><div className="flex items-center justify-between border-t pt-5 text-lg font-bold"><span>Net salary</span><span>{formatCurrency(Number(entry.netSalary))}</span></div>{entry.paidAt ? <p className="text-sm text-muted-foreground">Paid on {formatDate(entry.paidAt)} {entry.paymentRef ? `· Reference ${entry.paymentRef}` : ""}</p> : null}</CardContent></Card></div>;
}
