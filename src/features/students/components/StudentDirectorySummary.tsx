"use client";

import {
  CalendarCheck2,
  IndianRupee,
  UserRound,
  Users,
  WalletCards,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { subscribeTableRefresh } from "@/lib/table-event";

type GenderFilter = "ALL" | "MALE" | "FEMALE" | "OTHER";
type RteFilter = "ALL" | "RTE" | "NON_RTE";

type Summary = {
  academicYearName: string | null;
  activeStudents: number;
  genderCounts: { male: number; female: number; other: number };
  attendance: {
    present: number;
    marked: number;
    percentage: number;
  } | null;
  fees: { paid: number; outstanding: number } | null;
  classes: Array<{
    classId: string;
    className: string;
    branchName: string;
    syllabusName: string;
    students: number;
    attendancePresent: number;
    attendanceMarked: number;
    attendancePercentage: number | null;
    feesPaid: number;
    feesOutstanding: number;
  }>;
};

type Props = {
  syllabusId: string;
  branchId: string;
  classId: string;
  sectionId: string;
  gender: GenderFilter;
  rteFilter: RteFilter;
};

function number(value: number) {
  return value.toLocaleString("en-IN");
}

function money(value: number) {
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export function StudentDirectorySummary({
  syllabusId,
  branchId,
  classId,
  sectionId,
  gender,
  rteFilter,
}: Props) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadVersion, setReloadVersion] = useState(0);

  const reload = useCallback(() => {
    setReloadVersion((version) => version + 1);
  }, []);

  useEffect(() => subscribeTableRefresh("students", reload), [reload]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadSummary() {
      setLoading(true);
      const params = new URLSearchParams();
      if (syllabusId) params.set("syllabusId", syllabusId);
      if (branchId) params.set("branchId", branchId);
      if (classId) params.set("classId", classId);
      if (sectionId) params.set("sectionId", sectionId);
      if (gender !== "ALL") params.set("gender", gender);
      if (rteFilter !== "ALL") {
        params.set("isRte", String(rteFilter === "RTE"));
      }

      try {
        const response = await fetch(`/api/v1/students/summary?${params}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.message ?? "Unable to load student summary.");
        }
        setSummary(result.data);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setSummary(null);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadSummary();
    return () => controller.abort();
  }, [
    syllabusId,
    branchId,
    classId,
    sectionId,
    gender,
    rteFilter,
    reloadVersion,
  ]);

  if (loading && !summary) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="h-32 animate-pulse rounded-2xl border border-border/50 bg-muted/40"
          />
        ))}
      </div>
    );
  }

  if (!summary) return null;

  const cards = [
    {
      title: "Active students",
      value: number(summary.activeStudents),
      description: "Current student directory",
      icon: Users,
      iconClass: "bg-indigo-500/10 text-indigo-600",
    },
    {
      title: "Gender split",
      value: `${number(summary.genderCounts.female)} / ${number(summary.genderCounts.male)}`,
      description: `Female / Male${summary.genderCounts.other ? ` · ${number(summary.genderCounts.other)} other` : ""}`,
      icon: UserRound,
      iconClass: "bg-violet-500/10 text-violet-600",
    },
    ...(summary.attendance
      ? [{
          title: "Today's attendance",
          value: `${summary.attendance.percentage}%`,
          description: `${number(summary.attendance.present)} present of ${number(summary.attendance.marked)} marked`,
          icon: CalendarCheck2,
          iconClass: "bg-emerald-500/10 text-emerald-600",
        }]
      : []),
    ...(summary.fees
      ? [
          {
            title: "Fees paid",
            value: money(summary.fees.paid),
            description: summary.academicYearName ?? "Active academic year",
            icon: IndianRupee,
            iconClass: "bg-sky-500/10 text-sky-600",
          },
          {
            title: "Outstanding fees",
            value: money(summary.fees.outstanding),
            description: "Remaining amount to collect",
            icon: WalletCards,
            iconClass: "bg-orange-500/10 text-orange-600",
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className="border-border/60 shadow-sm">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-muted-foreground">
                      {card.title}
                    </p>
                    <p className="mt-2 truncate text-2xl font-bold tracking-tight">
                      {card.value}
                    </p>
                  </div>
                  <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${card.iconClass}`}>
                    <Icon className="size-5" />
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {card.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <Card className="overflow-hidden border-border/60 shadow-sm">
        <div className="flex flex-col gap-1 border-b border-border/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h3 className="font-bold tracking-tight">Class-wise summary</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Active students{summary.academicYearName ? ` · ${summary.academicYearName}` : ""}
            </p>
          </div>
          <p className="text-xs font-medium text-muted-foreground">
            {number(summary.classes.length)} classes
          </p>
        </div>

        {summary.classes.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class</TableHead>
                <TableHead>Branch / Syllabus</TableHead>
                <TableHead className="text-right">Students</TableHead>
                {summary.attendance && (
                  <TableHead className="text-right">Attendance today</TableHead>
                )}
                {summary.fees && (
                  <>
                    <TableHead className="text-right">Fees paid</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary.classes.map((item) => (
                <TableRow key={item.classId}>
                  <TableCell className="font-semibold">{item.className}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.branchName} · {item.syllabusName}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {number(item.students)}
                  </TableCell>
                  {summary.attendance && (
                    <TableCell className="text-right">
                      {item.attendancePercentage === null
                        ? "Not marked"
                        : `${item.attendancePercentage}% (${item.attendancePresent}/${item.attendanceMarked})`}
                    </TableCell>
                  )}
                  {summary.fees && (
                    <>
                      <TableCell className="text-right text-emerald-700">
                        {money(item.feesPaid)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-orange-700">
                        {money(item.feesOutstanding)}
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="px-6 py-8 text-center text-sm text-muted-foreground">
            No active enrollments match the selected filters.
          </p>
        )}
      </Card>
    </div>
  );
}
