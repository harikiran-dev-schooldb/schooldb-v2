"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { VoidPaymentDialog } from "@/features/fee-payments/components/VoidPaymentDialog";

type PaymentRow = {
  id: string;
  receiptNo: string;
  paymentDate: string;
  amount: number;
  paymentMode: string;
  referenceNo: string | null;
  remarks: string | null;
  status: string;

  student: {
    id: string;
    fullName: string | null;
    admissionNo: string;
    class: string;
    section: string;
  };

  allocationCount: number;
};

type PaymentData = {
  rows: PaymentRow[];

  summary: {
    paymentCount: number;
    totalAmount: number;
  };
};

type Props = {
  params: Promise<{
    schoolSlug: string;
  }>;
};

function money(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function PaymentHistoryPage({ params }: Props) {
  const [schoolSlug, setSchoolSlug] = useState("");

  const [data, setData] = useState<PaymentData | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");

  const [paymentMode, setPaymentMode] = useState("");

  const [fromDate, setFromDate] = useState("");

  const [toDate, setToDate] = useState("");

  const [selectedPayment, setSelectedPayment] = useState<PaymentRow | null>(
    null,
  );

  const [voidDialogOpen, setVoidDialogOpen] = useState(false);

  useEffect(() => {
    async function loadParams() {
      const resolvedParams = await params;

      setSchoolSlug(resolvedParams.schoolSlug);
    }

    loadParams();
  }, [params]);

  async function loadPayments() {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams();

      if (search.trim()) {
        queryParams.set("search", search.trim());
      }

      if (paymentMode) {
        queryParams.set("paymentMode", paymentMode);
      }

      if (fromDate) {
        queryParams.set("fromDate", fromDate);
      }

      if (toDate) {
        queryParams.set("toDate", toDate);
      }

      const query = queryParams.toString();

      const response = await fetch(
        `/api/v1/fee-payments${query ? `?${query}` : ""}`,
        {
          cache: "no-store",
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to load payment history.");
      }

      setData(result.data);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to load payment history.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPayments();
  }, []);

  function handleSearch() {
    loadPayments();
  }

  function clearFilters() {
    setSearch("");
    setPaymentMode("");
    setFromDate("");
    setToDate("");

    setTimeout(() => {
      loadPayments();
    }, 0);
  }

  if (loading && !data) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">
          Loading payment history...
        </p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-destructive">{error}</p>

            <Button className="mt-4" onClick={loadPayments}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}

      <div>
        <h1 className="text-2xl font-semibold">Payment History</h1>

        <p className="text-sm text-muted-foreground">
          View and manage all fee payments.
        </p>
      </div>

      {/* Summary */}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Total Payments
            </CardTitle>
          </CardHeader>

          <CardContent>
            <p className="text-2xl font-bold">
              {data?.summary.paymentCount ?? 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Total Collection
            </CardTitle>
          </CardHeader>

          <CardContent>
            <p className="text-2xl font-bold">
              {money(data?.summary.totalAmount ?? 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {/* Search */}

            <div className="relative xl:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleSearch();
                  }
                }}
                placeholder="Search student, admission no or receipt..."
                className="pl-9"
              />
            </div>

            {/* Payment Mode */}

            <select
              value={paymentMode}
              onChange={(event) => setPaymentMode(event.target.value)}
              className="h-10 rounded-md border bg-background px-3 text-sm"
            >
              <option value="">All Payment Modes</option>

              <option value="CASH">Cash</option>

              <option value="UPI">UPI</option>

              <option value="CARD">Card</option>

              <option value="BANK_TRANSFER">Bank Transfer</option>

              <option value="ONLINE">Online</option>
            </select>

            {/* From Date */}

            <Input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
            />

            {/* To Date */}

            <Input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? "Loading..." : "Search"}
            </Button>

            <Button variant="outline" onClick={clearFilters} disabled={loading}>
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error after existing data */}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Payment Table */}

      <Card>
        <CardHeader>
          <CardTitle>Payment Records</CardTitle>
        </CardHeader>

        <CardContent>
          {!data || data.rows.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No payment records found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="p-3">Receipt No</th>

                    <th className="p-3">Date</th>

                    <th className="p-3">Student</th>

                    <th className="p-3">Class</th>

                    <th className="p-3">Mode</th>

                    <th className="p-3 text-center">Items</th>

                    <th className="p-3 text-right">Amount</th>

                    <th className="p-3 text-center">Status</th>

                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {data.rows.map((payment) => (
                    <tr key={payment.id} className="border-b last:border-b-0">
                      <td className="p-3 font-medium">{payment.receiptNo}</td>

                      <td className="p-3">{formatDate(payment.paymentDate)}</td>

                      <td className="p-3">
                        <div className="font-medium">
                          {payment.student.fullName || "—"}
                        </div>

                        <div className="text-xs text-muted-foreground">
                          {payment.student.admissionNo}
                        </div>
                      </td>

                      <td className="p-3">
                        {payment.student.class}
                        {payment.student.section
                          ? ` - ${payment.student.section}`
                          : ""}
                      </td>

                      <td className="p-3">
                        <Badge variant="outline">{payment.paymentMode}</Badge>
                      </td>

                      <td className="p-3 text-center">
                        {payment.allocationCount}
                      </td>

                      <td className="p-3 text-right font-semibold">
                        {money(payment.amount)}
                      </td>

                      <td className="p-3 text-center">
                        <Badge
                          variant={
                            payment.status === "SUCCESS"
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {payment.status}
                        </Badge>
                      </td>

                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              window.open(
                                `/${schoolSlug}/fees/receipts/${payment.id}`,
                                "_blank",
                              )
                            }
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Receipt
                          </Button>

                          {payment.status === "SUCCESS" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => {
                                setSelectedPayment(payment);
                                setVoidDialogOpen(true);
                              }}
                            >
                              Void
                            </Button>
                          )}
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
      {selectedPayment && (
        <VoidPaymentDialog
          open={voidDialogOpen}
          onOpenChange={setVoidDialogOpen}
          paymentId={selectedPayment.id}
          receiptNo={selectedPayment.receiptNo}
          onSuccess={() => {
            loadPayments();
            setSelectedPayment(null);
          }}
        />
      )}
    </div>
  );
}
