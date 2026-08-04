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

type Props = {
  studentId: string;
};

export function StudentProfile({ studentId }: Props) {
  const [student, setStudent] = useState<any>();

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/v1/students/${studentId}/profile`);

      const result = await res.json();

      if (result.success) {
        setStudent(result.data);
      }
    }

    load();
  }, [studentId]);

  if (!student) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <StudentProfileHeader student={student} />

      <Tabs defaultValue="overview">
        <TabsList>
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
          <StudentFeeTab />
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
