"use client";

import { UserRound } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import type { Student } from "../types";

type Props = {
  students: Student[];
  loading: boolean;
  hasSearched: boolean;
  onSelect: (student: Student) => void;
};

export function StudentSearchResults({
  students,
  loading,
  hasSearched,
  onSelect,
}: Props) {
  if (loading) {
    return (
      <div className="py-6 text-center text-sm text-muted-foreground">
        Searching students...
      </div>
    );
  }

  if (hasSearched && students.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No students found.
        </CardContent>
      </Card>
    );
  }

  if (students.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Students ({students.length})</CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {students.map((student) => (
          <div
            key={student.id}
            className="flex items-center justify-between gap-4 rounded-lg border p-4"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                <UserRound className="h-5 w-5 text-muted-foreground" />
              </div>

              <div className="min-w-0">
                <div className="truncate font-medium">
                  {student.fullName || "—"}
                </div>

                <div className="text-sm text-muted-foreground">
                  Admission No: {student.admissionNo}
                </div>

                <div className="text-xs text-muted-foreground">
                  {student.className || "No Class"}

                  {student.sectionName ? ` - ${student.sectionName}` : ""}
                </div>
              </div>
            </div>

            <Button size="sm" onClick={() => onSelect(student)}>
              Select
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
