import {
  Banknote,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  CircleDollarSign,
  Landmark,
  ReceiptIndianRupee,
  Tags,
  WalletCards,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExpenseForm } from "@/features/expenses/ExpenseForm";
import { VoidExpenseButton } from "@/features/expenses/VoidExpenseButton";
import { PERMISSIONS } from "@/lib/access-control";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/self-service-format";

function displayLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

function ExpenseMetricCard({
  title,
  value,
  description,
  icon: Icon,
  tone = "primary",
}: {
  title: string;
  value: string;
  description: string;
  icon: typeof WalletCards;
  tone?: "primary" | "orange" | "muted";
}) {
  const toneClasses = {
    primary: "bg-primary/10 text-primary",
    orange: "bg-orange-500/10 text-orange-600",
    muted: "bg-muted text-muted-foreground",
  };

  return (
    <Card className="overflow-hidden rounded-2xl border-border/60 shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="mt-3 truncate text-2xl font-bold tracking-tight">{value}</p>
          </div>
          <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${toneClasses[tone]}`}>
            <Icon className="size-5" />
          </div>
        </div>
        <div className="mt-4 border-t border-border/60 pt-3">
          <p className="text-xs leading-5 text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

type CategoryTotal = {
  category: string;
  amount: number;
};

function CategoryBreakdown({ categories, total }: { categories: CategoryTotal[]; total: number }) {
  return (
    <Card className="overflow-hidden rounded-2xl border-border/60 shadow-sm">
      <CardHeader className="border-b bg-muted/20 px-5 py-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base">Spending by category</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Top categories across posted expenses.</p>
          </div>
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10">
            <ChartNoAxesColumnIncreasing className="size-5 text-primary" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-5">
        {categories.length === 0 ? (
          <div className="flex min-h-52 flex-col items-center justify-center text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
              <Tags className="size-6 text-muted-foreground" />
            </div>
            <h3 className="mt-4 font-semibold">No category data yet</h3>
            <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
              Category insights appear after the first expense is recorded.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {categories.map((category, index) => {
              const percentage = total > 0 ? Math.round((category.amount / total) * 100) : 0;
              return (
                <div key={category.category}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${index === 0 ? "bg-orange-500/10 text-orange-600" : "bg-primary/10 text-primary"}`}>
                        <Tags className="size-4" />
                      </div>
                      <span className="truncate text-sm font-medium">{displayLabel(category.category)}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{formatCurrency(category.amount)}</p>
                      <p className="text-xs text-muted-foreground">{percentage}%</p>
                    </div>
                  </div>
                  <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className={`h-full rounded-full ${index === 0 ? "bg-orange-500" : "bg-primary"}`} style={{ width: `${Math.max(percentage, 2)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default async function ExpensesPage({ params }: { params: Promise<{ schoolSlug: string }> }) {
  const { schoolSlug } = await params;
  const membership = await requirePermission(PERMISSIONS.FEE_READ, schoolSlug);
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const [expenses, allTime, thisMonth, categoryTotals] = await Promise.all([
    prisma.expense.findMany({
      where: { schoolId: membership.schoolId },
      orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }],
      take: 100,
    }),
    prisma.expense.aggregate({
      where: { schoolId: membership.schoolId, status: "POSTED" },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.expense.aggregate({
      where: { schoolId: membership.schoolId, status: "POSTED", expenseDate: { gte: monthStart } },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.expense.groupBy({
      by: ["category"],
      where: { schoolId: membership.schoolId, status: "POSTED" },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 5,
    }),
  ]);

  const canManage = ["SUPER_ADMIN", "SCHOOL_ADMIN", "ACCOUNTANT"].includes(membership.role);
  const allTimeTotal = Number(allTime._sum.amount ?? 0);
  const categories = categoryTotals.map((item) => ({
    category: item.category,
    amount: Number(item._sum.amount ?? 0),
  }));

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-5 border-b border-border/60 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
            <ReceiptIndianRupee className="size-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">Expense Management</h1>
              <CircleDollarSign className="size-4 text-primary" />
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Track school spending with a clear, auditable financial ledger.
            </p>
          </div>
        </div>
        <Badge variant="outline" className="w-fit gap-2 rounded-xl border-primary/20 bg-primary/5 px-3 py-2 text-primary">
          <CalendarDays className="size-3.5" />
          {now.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
        </Badge>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ExpenseMetricCard title="This Month" value={formatCurrency(Number(thisMonth._sum.amount ?? 0))} description={`${thisMonth._count._all} posted ${thisMonth._count._all === 1 ? "expense" : "expenses"} this month`} icon={CalendarDays} />
        <ExpenseMetricCard title="Total Spending" value={formatCurrency(allTimeTotal)} description="All posted expenses in the ledger" icon={WalletCards} tone="muted" />
        <ExpenseMetricCard title="Posted Entries" value={String(allTime._count._all)} description="Active, non-void financial records" icon={ReceiptIndianRupee} />
        <ExpenseMetricCard title="Top Category" value={categories[0] ? displayLabel(categories[0].category) : "—"} description={categories[0] ? formatCurrency(categories[0].amount) : "No expenses recorded"} icon={Tags} tone="orange" />
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.75fr)]">
        {canManage ? <ExpenseForm schoolSlug={schoolSlug} defaultDate={now.toISOString().slice(0, 10)} /> : null}
        <CategoryBreakdown categories={categories} total={allTimeTotal} />
      </div>

      <Card className="overflow-hidden rounded-2xl border-border/60 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/20 px-5 py-5 sm:px-6">
          <div>
            <CardTitle className="text-base font-semibold">Expense Ledger</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Latest entries with payment details and audit status.</p>
          </div>
          {expenses.length > 0 ? <Badge variant="secondary" className="shrink-0 rounded-lg px-3 py-1">{expenses.length} recent</Badge> : null}
        </CardHeader>
        <CardContent className="p-0">
          {expenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
                <ReceiptIndianRupee className="size-6 text-muted-foreground" />
              </div>
              <h3 className="mt-4 font-semibold">No expenses recorded yet</h3>
              <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                School expenses will appear here after the first entry is recorded.
              </p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[880px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30 text-left">
                      {['Expense', 'Category', 'Date', 'Mode'].map((heading) => <th key={heading} className="px-5 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">{heading}</th>)}
                      <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">Amount</th>
                      <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((expense) => (
                      <tr key={expense.id} className={`border-b transition-colors last:border-b-0 hover:bg-muted/20 ${expense.status === "VOID" ? "bg-muted/20 text-muted-foreground" : ""}`}>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${expense.status === "VOID" ? "bg-muted" : "bg-primary/10"}`}>
                              <Banknote className={`size-5 ${expense.status === "VOID" ? "text-muted-foreground" : "text-primary"}`} />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-semibold">{expense.description}</p>
                              <p className="mt-0.5 text-xs text-muted-foreground">{expense.vendor || "No vendor"}{expense.referenceNo ? ` · Ref: ${expense.referenceNo}` : ""}</p>
                              {expense.voidReason ? <p className="mt-1 text-xs text-destructive">Void reason: {expense.voidReason}</p> : null}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4"><Badge variant="outline" className="rounded-lg font-normal">{displayLabel(expense.category)}</Badge></td>
                        <td className="whitespace-nowrap px-5 py-4 text-muted-foreground">{formatDate(expense.expenseDate)}</td>
                        <td className="px-5 py-4"><Badge variant="outline" className="gap-1.5 rounded-lg border-primary/20 bg-primary/5 font-normal text-primary"><Landmark className="size-3.5" />{displayLabel(expense.paymentMode)}</Badge></td>
                        <td className="whitespace-nowrap px-5 py-4 text-right">
                          <span className={`text-base font-bold ${expense.status === "VOID" ? "line-through text-muted-foreground" : "text-foreground"}`}>{formatCurrency(Number(expense.amount))}</span>
                          {expense.status === "VOID" ? <div><Badge variant="destructive" className="mt-1 rounded-md">VOID</Badge></div> : null}
                        </td>
                        <td className="px-5 py-4 text-right">{canManage && expense.status === "POSTED" ? <VoidExpenseButton schoolSlug={schoolSlug} expenseId={expense.id} /> : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="divide-y md:hidden">
                {expenses.map((expense) => (
                  <div key={expense.id} className="space-y-4 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10"><Banknote className="size-5 text-primary" /></div>
                        <div className="min-w-0"><p className="truncate font-semibold">{expense.description}</p><p className="mt-0.5 text-xs text-muted-foreground">{expense.vendor || displayLabel(expense.category)}</p></div>
                      </div>
                      <p className={`shrink-0 text-base font-bold ${expense.status === "VOID" ? "line-through text-muted-foreground" : "text-primary"}`}>{formatCurrency(Number(expense.amount))}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2"><Badge variant="outline" className="rounded-lg">{displayLabel(expense.category)}</Badge><Badge variant="outline" className="rounded-lg">{displayLabel(expense.paymentMode)}</Badge>{expense.status === "VOID" ? <Badge variant="destructive">VOID</Badge> : null}</div>
                    <div className="flex items-center justify-between gap-3"><span className="text-xs text-muted-foreground">{formatDate(expense.expenseDate)}</span>{canManage && expense.status === "POSTED" ? <VoidExpenseButton schoolSlug={schoolSlug} expenseId={expense.id} /> : null}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
