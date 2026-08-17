"use client";

import { useState } from "react";
import { Search, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type Student = {
  id: string;
  admissionNo: string;
  fullName: string | null;

  className: string | null;
  sectionName: string | null;
};

type StudentResponse = {
  data: Student[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type Props = {
  onSelectStudent: (student: Student) => void;
};

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export function StudentFeeSearch({ onSelectStudent }: Props) {
  const [search, setSearch] = useState("");

  const [students, setStudents] = useState<Student[]>([]);

  const [searchLoading, setSearchLoading] = useState(false);

  const [hasSearched, setHasSearched] = useState(false);

  /* ------------------------------------------------------------------------ */
  /* Search Students                                                          */
  /* ------------------------------------------------------------------------ */

  async function searchStudents() {
    const searchValue = search.trim();

    if (!searchValue) {
      setStudents([]);
      setHasSearched(false);

      return;
    }

    try {
      setSearchLoading(true);
      setHasSearched(true);

      const response = await fetch(
        `/api/v1/students?page=1&pageSize=25&search=${encodeURIComponent(
          searchValue,
        )}`,
        {
          cache: "no-store",
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        setStudents([]);

        return;
      }

      const studentResponse: StudentResponse = result.data;

      setStudents(studentResponse.data ?? []);
    } catch (error) {
      console.error("Student search error:", error);

      setStudents([]);
    } finally {
      setSearchLoading(false);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* Render                                                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="space-y-6">
      {/* Search */}

      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    void searchStudents();
                  }
                }}
                placeholder="Search by student name or admission number..."
                className="pl-9"
              />
            </div>

            <Button
              onClick={() => void searchStudents()}
              disabled={searchLoading}
            >
              {searchLoading ? "Searching..." : "Search"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading */}

      {searchLoading && (
        <div className="py-6 text-center text-sm text-muted-foreground">
          Searching students...
        </div>
      )}

      {/* Results */}

      {!searchLoading && students.length > 0 && (
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

                <Button size="sm" onClick={() => onSelectStudent(student)}>
                  Select
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* No Results */}

      {!searchLoading && hasSearched && students.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No students found.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
