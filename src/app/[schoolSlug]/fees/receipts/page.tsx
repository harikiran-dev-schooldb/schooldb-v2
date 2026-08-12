"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Search } from "lucide-react";

import { useParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

type ReceiptData = {
  rows: PaymentRow[];

  summary: {
    paymentCount: number;
    totalAmount: number;
  };
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

export default function ReceiptsPage() {
  const params = useParams();

  const schoolSlug = params.schoolSlug as string;

  const [data, setData] = useState<ReceiptData | null>(null);

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [paymentMode, setPaymentMode] = useState("");

  const [fromDate, setFromDate] = useState("");

  const [toDate, setToDate] = useState("");

  const [academicYearId, setAcademicYearId] = useState("");

  async function loadPayments() {
    try {
      setLoading(true);
      setError(null);

      const query = new URLSearchParams();

      if (search.trim()) {
        query.set("search", search.trim());
      }

      if (paymentMode) {
        query.set("paymentMode", paymentMode);
      }

      if (academicYearId) {
        query.set("academicYearId", academicYearId);
      }

      if (fromDate) {
        query.set("fromDate", fromDate);
      }

      if (toDate) {
        query.set("toDate", toDate);
      }

      const response = await fetch(
        `/api/v1/fee-payments${query.toString() ? `?${query.toString()}` : ""}`,
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

  if (loading && !data) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Loading receipts...</p>
      </div>
    );
  }

  if (error && !data) {
    return <div className="p-6 text-destructive">{error}</div>;
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}

      <div>
        <h1 className="text-2xl font-semibold">Fee Receipts</h1>

        <p className="text-sm text-muted-foreground">
          View all fee payments and receipts.
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
            <p className="text-2xl font-bold">{data.summary.paymentCount}</p>
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
              {money(data.summary.totalAmount)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}

      <Card>
        <CardContent className="p-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {/* Search */}

            <div className="relative xl:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    loadPayments();
                  }
                }}
                placeholder="Receipt, student or admission no..."
                className="pl-9"
              />
            </div>

            {/* Payment Mode */}

            <Select
              value={paymentMode || "ALL"}
              onValueChange={(value) =>
                setPaymentMode(value === "ALL" ? "" : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Payment Mode" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="ALL">All Modes</SelectItem>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="UPI">UPI</SelectItem>
                <SelectItem value="CARD">Card</SelectItem>
                <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
              </SelectContent>
            </Select>

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

          <div className="mt-3 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setSearch("");
                setPaymentMode("");
                setAcademicYearId("");
                setFromDate("");
                setToDate("");

                setTimeout(() => {
                  loadPayments();
                }, 0);
              }}
            >
              Clear
            </Button>

            <Button onClick={loadPayments} disabled={loading}>
              {loading ? "Loading..." : "Apply Filters"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}

      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>

        <CardContent>
          {data.rows.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No payments found.
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
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3 text-center">Action</th>
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

                      <td className="p-3">{payment.paymentMode}</td>

                      <td className="p-3 text-right font-semibold">
                        {money(payment.amount)}
                      </td>

                      <td className="p-3 text-center">
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
