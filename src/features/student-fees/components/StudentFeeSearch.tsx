"use client";

import { useState } from "react";
import {
  ArrowRight,
  GraduationCap,
  Search,
  UserRound,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

  const handleSelectStudent = (student: Student) => {
    onSelectStudent(student);

    setSearch("");
    setStudents([]);
    setHasSearched(false);
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      {/* Search workspace */}
      <Card className="overflow-hidden rounded-3xl border-border/60 shadow-sm">
        <CardContent className="p-0">
          <div className="border-b border-border/60 bg-muted/20 px-5 py-5 sm:px-6">
            <div className="flex items-start gap-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                <Search className="size-5 text-primary" />
              </div>

              <div>
                <h2 className="text-base font-bold text-foreground">
                  Find a student
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  Search using admission number or student name to view and
                  collect fee installments.
                </p>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void searchStudents();
                    }
                  }}
                  placeholder="Enter admission number or student name..."
                  className="h-11 rounded-xl pl-11"
                />
              </div>

              <Button
                size="lg"
                onClick={() => void searchStudents()}
                disabled={searchLoading || !search.trim()}
                className="h-11 min-w-32 rounded-xl"
              >
                <Search className="mr-2 size-4" />

                {searchLoading ? "Searching..." : "Search"}
              </Button>
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              Tip: Enter at least part of the student&apos;s name or the exact
              admission number.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {searchLoading && (
        <Card className="rounded-3xl">
          <CardContent className="flex flex-col items-center justify-center py-14">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10">
              <Search className="size-5 animate-pulse text-primary" />
            </div>

            <p className="mt-4 font-medium">Searching students...</p>

            <p className="mt-1 text-sm text-muted-foreground">
              Please wait while we find matching student records.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Initial empty state */}
      {!searchLoading && !hasSearched && (
        <Card className="rounded-3xl border-dashed border-border/80">
          <CardContent className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
            <div className="flex size-16 items-center justify-center rounded-3xl bg-primary/10">
              <GraduationCap className="size-8 text-primary" />
            </div>

            <h3 className="mt-5 text-lg font-bold">Ready to collect fees</h3>

            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Find a student to view their fee installments, payment history,
              and outstanding balances.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Search results */}
      {!searchLoading && hasSearched && students.length > 0 && (
        <Card className="overflow-hidden rounded-3xl">
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10">
                <Users className="size-4 text-primary" />
              </div>

              <div>
                <h3 className="font-semibold">Matching students</h3>

                <p className="text-xs text-muted-foreground">
                  {students.length} student
                  {students.length === 1 ? "" : "s"} found
                </p>
              </div>
            </div>
          </div>

          <CardContent className="divide-y divide-border/60 p-0">
            {students.map((student) => (
              <div
                key={student.id}
                className="group flex flex-col gap-4 px-5 py-5 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between sm:px-6"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-muted transition-colors group-hover:bg-primary/10">
                    <UserRound className="size-5 text-muted-foreground group-hover:text-primary" />
                  </div>

                  <div className="min-w-0">
                    <h4 className="truncate font-semibold text-foreground">
                      {student.fullName || "Unnamed Student"}
                    </h4>

                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                      <span>Adm. No: {student.admissionNo}</span>

                      <span className="hidden size-1 rounded-full bg-muted-foreground/40 sm:block" />

                      <span>
                        {student.className || "No Class"}
                        {student.sectionName ? ` · ${student.sectionName}` : ""}
                      </span>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => handleSelectStudent(student)}
                  className="w-full rounded-xl sm:w-auto"
                >
                  Select Student
                  <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* No results */}
      {!searchLoading && hasSearched && students.length === 0 && (
        <Card className="rounded-3xl border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-14 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
              <UserRound className="size-6 text-muted-foreground" />
            </div>

            <h3 className="mt-4 font-semibold">No students found</h3>

            <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
              We couldn&apos;t find a student matching{" "}
              <span className="font-medium text-foreground">
                &quot;{search}&quot;
              </span>
              . Check the admission number or try a different name.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
