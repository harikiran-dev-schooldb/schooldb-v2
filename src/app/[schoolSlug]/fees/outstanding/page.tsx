"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RecordFeePaymentDialog } from "@/features/student-fees/components/RecordFeePaymentDialog";

type OutstandingRow = {
  id: string;
  installmentName: string;
  dueDate: string;
  status: "PENDING" | "PARTIAL";

  amount: number;
  concession: number;
  payableAmount: number;
  paidAmount: number;
  outstanding: number;

  feeCategory: {
    id: string;
    name: string;
    code: string;
  };

  student: {
    id: string;
    admissionNo: string;
    fullName: string | null;
  };

  class: {
    id: string;
    name: string;
  };

  section: {
    id: string;
    name: string;
  };

  rollNo: number | null;

  studentFeeId: string;
  studentEnrollmentId: string;

  feePlan: {
    id: string;
    name: string;

    academicYear: {
      id: string;
      name: string;
    };
  };
};

type DashboardData = {
  rows: OutstandingRow[];

  summary: {
    installmentCount: number;
    totalPayable: number;
    totalConcession: number;
    totalPaid: number;
    outstanding: number;
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

export default function OutstandingFeesPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");

  const [selectedRow, setSelectedRow] = useState<OutstandingRow | null>(null);

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  async function loadOutstanding(searchValue = "") {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();

      if (searchValue.trim()) {
        params.set("search", searchValue.trim());
      }

      const query = params.toString();

      const response = await fetch(
        `/api/v1/fees/outstanding${query ? `?${query}` : ""}`,
      );

      const result = await response.json();

      if (!result.success) {
        setError(result.message || "Failed to load outstanding fees.");

        return;
      }

      setData(result.data);
    } catch {
      setError("Failed to load outstanding fees.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOutstanding();
  }, []);

  function handleSearch() {
    loadOutstanding(search);
  }

  if (loading && !data) {
    return (
      <div className="p-6">
        <div className="text-sm text-muted-foreground">
          Loading outstanding fees...
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-destructive">{error}</div>

            <Button className="mt-4" onClick={() => loadOutstanding(search)}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}

      <div>
        <h1 className="text-2xl font-semibold">Outstanding Fees</h1>

        <p className="text-sm text-muted-foreground">
          View and collect pending student fees
        </p>
      </div>

      {/* Summary */}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Installments</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold">
              {data.summary.installmentCount}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Payable</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold">
              {money(data.summary.totalPayable)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold">
              {money(data.summary.totalPaid)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold">
              {money(data.summary.outstanding)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}

      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleSearch();
                  }
                }}
                placeholder="Search student or admission number..."
                className="pl-9"
              />
            </div>

            <Button onClick={handleSearch} disabled={loading}>
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report */}

      <Card>
        <CardHeader>
          <CardTitle>Outstanding Installments</CardTitle>
        </CardHeader>

        <CardContent>
          {data.rows.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No outstanding fees found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="p-3">Student</th>

                    <th className="p-3">Class</th>

                    <th className="p-3">Category</th>

                    <th className="p-3">Installment</th>

                    <th className="p-3">Due Date</th>

                    <th className="p-3 text-right">Payable</th>

                    <th className="p-3 text-right">Paid</th>

                    <th className="p-3 text-right">Outstanding</th>

                    <th className="p-3">Status</th>

                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {data.rows.map((row) => (
                    <tr key={row.id} className="border-b">
                      <td className="p-3">
                        <div className="font-medium">
                          {row.student.fullName || "—"}
                        </div>

                        <div className="text-xs text-muted-foreground">
                          {row.student.admissionNo}
                        </div>
                      </td>

                      <td className="p-3">
                        {row.class.name} - {row.section.name}
                      </td>

                      <td className="p-3">{row.feeCategory.name}</td>

                      <td className="p-3">{row.installmentName}</td>

                      <td className="p-3">{formatDate(row.dueDate)}</td>

                      <td className="p-3 text-right">
                        {money(row.payableAmount)}
                      </td>

                      <td className="p-3 text-right">
                        {money(row.paidAmount)}
                      </td>

                      <td className="p-3 text-right font-semibold">
                        {money(row.outstanding)}
                      </td>

                      <td className="p-3">
                        <Badge
                          variant={
                            row.status === "PARTIAL" ? "secondary" : "outline"
                          }
                        >
                          {row.status}
                        </Badge>
                      </td>

                      <td className="p-3 text-right">
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedRow(row);
                            setPaymentDialogOpen(true);
                          }}
                        >
                          Collect
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
      {selectedRow && (
        <RecordFeePaymentDialog
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          studentFeeId={selectedRow.studentFeeId}
          studentEnrollmentId={selectedRow.studentEnrollmentId}
          installments={[
            {
              id: selectedRow.id,
              name: selectedRow.installmentName,
              payableAmount: selectedRow.payableAmount,
              paidAmount: selectedRow.paidAmount,
              outstanding: selectedRow.outstanding,
            },
          ]}
          onSuccess={() => {
            loadOutstanding(search);
          }}
        />
      )}
    </div>
  );
}
