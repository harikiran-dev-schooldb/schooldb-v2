import { CreditCard } from "lucide-react";

import {
  SelfServiceEmptyState,
  SelfServicePage,
  SelfServiceStatCard,
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

  return (
    <SelfServicePage title="Fees" description="Fee plans, installments, and successful payments.">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Total payable", formatCurrency(summary.payable)],
          ["Paid", formatCurrency(summary.paid)],
          ["Outstanding", formatCurrency(summary.outstanding)],
        ].map(([label, value]) => (
          <SelfServiceStatCard key={label} label={label} value={value} />
        ))}
      </div>

      {ledgers.length ? (
        ledgers.map((ledger) => (
          <Card key={ledger.studentFee.id}>
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
