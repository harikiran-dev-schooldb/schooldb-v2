import { CheckCircle2, CreditCard, IndianRupee, WalletCards } from "lucide-react";

import {
  SelfServiceEmptyState,
  SelfServicePage,
} from "@/components/self-service/SelfServicePage";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { studentFeeLedgerService } from "@/features/student-fees/services/student-fee-ledger.service";
import { studentFeeService } from "@/features/student-fees/services/student-fee.service";
import { OnlineFeeCheckout } from "@/features/online-payments/components/OnlineFeeCheckout";
import { formatCurrency, formatDate } from "@/lib/self-service-format";
import { requireStudentAccess } from "@/lib/student-access";

export default async function StudentFeesPage({
  params,
}: {
  params: Promise<{ schoolSlug: string; studentId: string }>;
}) {
  const { schoolSlug, studentId } = await params;
  const { membership } = await requireStudentAccess(schoolSlug, studentId);
  const assignments = await studentFeeService.list(membership.schoolId, studentId);
  const ledgers = (
    await Promise.all(
      assignments.map((assignment) =>
        studentFeeLedgerService.get(assignment.id, membership.schoolId),
      ),
    )
  ).filter((ledger) => ledger !== null);

  const summary = ledgers.reduce(
    (total, ledger) => ({
      payable: total.payable + ledger.summary.total - ledger.summary.concession,
      paid: total.paid + ledger.summary.paid,
      outstanding: total.outstanding + ledger.summary.outstanding,
    }),
    { payable: 0, paid: 0, outstanding: 0 },
  );
  const outstandingInstallments = ledgers.flatMap((ledger) =>
    ledger.installments
      .filter((installment) => installment.outstanding > 0)
      .map((installment) => ({
        id: installment.id,
        name: installment.name,
        category: installment.feeCategory.name,
        dueDate: new Date(installment.dueDate).toISOString(),
        outstanding: installment.outstanding,
      })),
  );
  const paidPercentage = summary.payable > 0
    ? Math.min(100, Math.round((summary.paid / summary.payable) * 100))
    : 0;

  return (
    <SelfServicePage title="Fees" description="Fee plans, installments, and successful payments.">
      <section className="relative overflow-hidden rounded-[30px] border border-indigo-200/70 bg-gradient-to-br from-white via-indigo-50/80 to-blue-100/70 p-6 text-slate-950 shadow-[0_26px_70px_rgba(79,70,229,0.1)] sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-blue-300/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 size-64 rounded-full bg-indigo-300/20 blur-3xl" />
        <div className="relative grid gap-7 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-indigo-600"><WalletCards className="size-4" />Fee account</p>
            <p className="mt-4 text-sm text-slate-600">Outstanding balance</p>
            <h3 className="mt-1 text-4xl font-black tracking-[-0.045em] sm:text-5xl">{formatCurrency(summary.outstanding)}</h3>
            <div className="mt-6 max-w-xl">
              <div className="flex justify-between text-xs font-semibold text-slate-600"><span>{paidPercentage}% paid</span><span>{formatCurrency(summary.paid)} received</span></div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-indigo-100"><div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-500" style={{ width: `${paidPercentage}%` }} /></div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:min-w-80">
            <div className="rounded-2xl border border-white/80 bg-white/70 p-4 shadow-sm backdrop-blur-xl"><IndianRupee className="size-4 text-blue-600" /><p className="mt-3 text-lg font-black text-slate-950">{formatCurrency(summary.payable)}</p><p className="mt-1 text-xs text-slate-500">Total payable</p></div>
            <div className="rounded-2xl border border-white/80 bg-white/70 p-4 shadow-sm backdrop-blur-xl"><CheckCircle2 className="size-4 text-emerald-600" /><p className="mt-3 text-lg font-black text-slate-950">{formatCurrency(summary.paid)}</p><p className="mt-1 text-xs text-slate-500">Paid so far</p></div>
          </div>
        </div>
      </section>

      {outstandingInstallments.length ? (
        <OnlineFeeCheckout
          schoolSlug={schoolSlug}
          studentId={studentId}
          installments={outstandingInstallments}
        />
      ) : null}

      {ledgers.length ? (
        ledgers.map((ledger) => (
          <Card key={ledger.studentFee.id} className="overflow-hidden rounded-[26px] border-border/60 bg-card/90 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
            <CardHeader>
              <CardTitle>{ledger.studentFee.feePlan.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{ledger.academicYear.name}</p>
            </CardHeader>
            <CardContent className="p-0 pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Installment</TableHead>
                    <TableHead>Due date</TableHead>
                    <TableHead>Payable</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledger.installments.map((installment) => (
                    <TableRow key={installment.id}>
                      <TableCell>
                        <p className="font-semibold">{installment.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{installment.feeCategory.name}</p>
                      </TableCell>
                      <TableCell>{formatDate(installment.dueDate)}</TableCell>
                      <TableCell>{formatCurrency(installment.payableAmount)}</TableCell>
                      <TableCell>{formatCurrency(installment.paidAmount)}</TableCell>
                      <TableCell>{formatCurrency(installment.outstanding)}</TableCell>
                      <TableCell>
                        <Badge variant={installment.outstanding === 0 ? "success" : "warning"}>
                          {installment.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      ) : (
        <Card>
          <CardContent className="p-0">
            <SelfServiceEmptyState
              icon={CreditCard}
              title="No fee plan assigned"
              description="Assigned fees will appear here."
            />
          </CardContent>
        </Card>
      )}
    </SelfServicePage>
  );
}
