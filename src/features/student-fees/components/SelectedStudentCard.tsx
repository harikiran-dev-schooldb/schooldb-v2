"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Student = {
  id: string;
  admissionNo: string;
  fullName: string | null;
  className: string | null;
  sectionName: string | null;
};

type Props = {
  student: Student;
  onChangeStudent: () => void;
};

export function SelectedStudentCard({ student, onChangeStudent }: Props) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4 p-5">
        <div>
          <div className="text-lg font-semibold">{student.fullName || "—"}</div>

          <div className="mt-1 text-sm text-muted-foreground">
            Admission No: {student.admissionNo}
          </div>

          <div className="text-sm text-muted-foreground">
            {student.className || "No Class"}

            {student.sectionName ? ` - ${student.sectionName}` : ""}
          </div>
        </div>

        <Button variant="outline" onClick={onChangeStudent}>
          Change Student
        </Button>
      </CardContent>
    </Card>
  );
}
