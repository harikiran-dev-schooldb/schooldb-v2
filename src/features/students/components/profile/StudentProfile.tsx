"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  CalendarDays,
  CreditCard,
  FileText,
  GraduationCap,
  LayoutDashboard,
  UserRound,
  Users,
} from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { StudentProfileHeader } from "./StudentProfileHeader";
import { StudentOverviewTab } from "./StudentOverviewTab";
import { StudentEnrollmentTab } from "./StudentEnrollmentTab";
import { StudentAttendanceTab } from "./StudentAttendanceTab";
import { StudentFeeTab } from "./StudentFeeTab";
import { StudentDocumentsTab } from "./StudentDocumentsTab";
import { StudentActivityTab } from "./StudentActivityTab";
import { StudentParentsTab } from "./StudentParents";

type Enrollment = {
  id: string;
  rollNo: string | null;

  academicYear: {
    id: string;
    name: string;
  };

  class: {
    id: string;
    name: string;
  };

  section: {
    id: string;
    name: string;
  };
};

type StudentProfileData = {
  id: string;
  admissionNo: string;
  fullName: string;
  gender: string;
  dob: string | null;
  joinedDate: string | null;
  phone: string | null;
  email: string | null;
  status: string;

  fatherName: string | null;
  fatherPhone: string | null;
  fatherEmail: string | null;
  fatherOccupation: string | null;
  fatherQualification: string | null;
  fatherIncome: number | string | null;
  fatherAadhar: string | null;

  motherName: string | null;
  motherPhone: string | null;
  motherEmail: string | null;
  motherOccupation: string | null;
  motherQualification: string | null;
  motherIncome: number | string | null;
  motherAadhar: string | null;

  guardianName: string | null;
  guardianRelation: string | null;
  guardianPhone: string | null;

  enrollments: Enrollment[];
};

type Props = {
  studentId: string;
};

const tabs = [
  {
    value: "overview",
    label: "Overview",
    icon: LayoutDashboard,
  },
  {
    value: "enrollment",
    label: "Enrollment",
    icon: GraduationCap,
  },
  {
    value: "attendance",
    label: "Attendance",
    icon: CalendarDays,
  },
  {
    value: "fees",
    label: "Fees",
    icon: CreditCard,
  },
  {
    value: "documents",
    label: "Documents",
    icon: FileText,
  },
  {
    value: "activity",
    label: "Activity",
    icon: Activity,
  },
  {
    value: "parents",
    label: "Parents",
    icon: Users,
  },
] as const;

function StudentProfileSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="animate-pulse p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="size-20 shrink-0 rounded-2xl bg-muted" />

            <div className="flex-1 space-y-3">
              <div className="h-6 w-56 rounded bg-muted" />
              <div className="h-4 w-40 rounded bg-muted" />
              <div className="h-4 w-72 max-w-full rounded bg-muted" />
            </div>
          </div>
        </div>

        <div className="grid animate-pulse border-t sm:grid-cols-3">
          <div className="h-20 border-b bg-muted/30 p-4 sm:border-b-0 sm:border-r" />
          <div className="h-20 border-b bg-muted/20 p-4 sm:border-b-0 sm:border-r" />
          <div className="h-20 bg-muted/30 p-4" />
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="space-y-4">
        <div className="h-12 animate-pulse rounded-xl bg-muted" />

        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-32 animate-pulse rounded-xl bg-muted" />
          <div className="h-32 animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
    </div>
  );
}

function StudentProfileNotFound() {
  return (
    <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-dashed bg-card">
      <div className="max-w-sm px-6 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted">
          <UserRound className="size-7 text-muted-foreground" />
        </div>

        <h2 className="mt-4 text-lg font-semibold">
          Student profile not found
        </h2>

        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          The student record could not be loaded. It may have been removed or
          you may not have access to it.
        </p>
      </div>
    </div>
  );
}

export function StudentProfile({ studentId }: Props) {
  const [student, setStudent] = useState<StudentProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadStudent() {
      try {
        setLoading(true);

        const response = await fetch(`/api/v1/students/${studentId}/profile`, {
          cache: "no-store",
        });

        const result = await response.json();

        if (cancelled) return;

        if (!response.ok || !result.success) {
          setStudent(null);
          return;
        }

        setStudent(result.data);
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load student profile:", error);
          setStudent(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadStudent();

    return () => {
      cancelled = true;
    };
  }, [studentId]);

  if (loading) {
    return <StudentProfileSkeleton />;
  }

  if (!student) {
    return <StudentProfileNotFound />;
  }

  return (
    <div className="space-y-6">
      {/* ============================================================ */}
      {/* PROFILE HEADER                                                */}
      {/* ============================================================ */}

      <StudentProfileHeader student={student} />

      {/* ============================================================ */}
      {/* PROFILE NAVIGATION                                            */}
      {/* ============================================================ */}

      <Tabs defaultValue="overview" className="w-full">
        <div className="sticky top-0 z-10 -mx-1 bg-background/95 px-1 pb-2 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
            <TabsList className="flex h-auto min-w-max w-full justify-start gap-1 bg-transparent p-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;

                return (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="
                      group
                      relative
                      min-h-10
                      shrink-0
                      gap-2
                      rounded-lg
                      px-3
                      text-sm
                      font-medium
                      text-muted-foreground
                      transition-all
                      data-[state=active]:bg-primary
                      data-[state=active]:text-primary-foreground
                      data-[state=active]:shadow-sm
                    "
                  >
                    <Icon className="size-4" />

                    <span>{tab.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>
        </div>

        {/* ========================================================== */}
        {/* OVERVIEW                                                    */}
        {/* ========================================================== */}

        <TabsContent value="overview" className="mt-5">
          <StudentOverviewTab student={student} />
        </TabsContent>

        {/* ========================================================== */}
        {/* ENROLLMENT                                                  */}
        {/* ========================================================== */}

        <TabsContent value="enrollment" className="mt-5">
          <StudentEnrollmentTab student={student} />
        </TabsContent>

        {/* ========================================================== */}
        {/* ATTENDANCE                                                  */}
        {/* ========================================================== */}

        <TabsContent value="attendance" className="mt-5">
          <StudentAttendanceTab studentId={studentId} />
        </TabsContent>

        {/* ========================================================== */}
        {/* FEES                                                        */}
        {/* ========================================================== */}

        <TabsContent value="fees" className="mt-5">
          <StudentFeeTab studentId={studentId} />
        </TabsContent>

        {/* ========================================================== */}
        {/* DOCUMENTS                                                   */}
        {/* ========================================================== */}

        <TabsContent value="documents" className="mt-5">
          <StudentDocumentsTab />
        </TabsContent>

        {/* ========================================================== */}
        {/* ACTIVITY                                                    */}
        {/* ========================================================== */}

        <TabsContent value="activity" className="mt-5">
          <StudentActivityTab studentId={studentId} />
        </TabsContent>

        {/* ========================================================== */}
        {/* PARENTS                                                    */}
        {/* ========================================================== */}

        <TabsContent value="parents" className="mt-5">
          <StudentParentsTab student={student} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
