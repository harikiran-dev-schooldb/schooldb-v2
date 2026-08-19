"use client";

import { useEffect, useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { StudentProfileHeader } from "./StudentProfileHeader";
import { StudentOverviewTab } from "./StudentOverviewTab";
import { StudentEnrollmentTab } from "./StudentEnrollmentTab";
import { StudentAttendanceTab } from "./StudentAttendanceTab";
import { StudentFeeTab } from "./StudentFeeTab";
import { StudentDocumentsTab } from "./StudentDocumentsTab";
import { StudentActivityTab } from "./StudentActivityTab";

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
  phone: string | null;
  email: string | null;
  status: string;

  enrollments: Enrollment[];
};

type Props = {
  studentId: string;
};

export function StudentProfile({ studentId }: Props) {
  const [student, setStudent] = useState<StudentProfileData | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadStudent() {
      try {
        const res = await fetch(`/api/v1/students/${studentId}/profile`, {
          cache: "no-store",
        });

        const result = await res.json();

        if (cancelled) {
          return;
        }

        if (result.success) {
          setStudent(result.data);
        }
      } catch (error) {
        console.error("Failed to load student profile:", error);
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
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        Loading student profile...
      </div>
    );
  }

  if (!student) {
    return (
      <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
        Student profile not found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <StudentProfileHeader student={student} />

      <Tabs defaultValue="overview">
        <TabsList className="flex h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>

          <TabsTrigger value="enrollment">Enrollment</TabsTrigger>

          <TabsTrigger value="attendance">Attendance</TabsTrigger>

          <TabsTrigger value="fees">Fees</TabsTrigger>

          <TabsTrigger value="documents">Documents</TabsTrigger>

          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <StudentOverviewTab student={student} />
        </TabsContent>

        <TabsContent value="enrollment">
          <StudentEnrollmentTab student={student} />
        </TabsContent>

        <TabsContent value="attendance">
          <StudentAttendanceTab />
        </TabsContent>

        <TabsContent value="fees">
          <StudentFeeTab studentId={studentId} />
        </TabsContent>

        <TabsContent value="documents">
          <StudentDocumentsTab />
        </TabsContent>

        <TabsContent value="activity">
          <StudentActivityTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
