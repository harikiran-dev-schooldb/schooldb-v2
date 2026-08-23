"use client";

import { CalendarDays, GraduationCap, Hash, UsersRound } from "lucide-react";

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

type Student = {
  enrollments: Enrollment[];
};

type Props = {
  student: Student;
};

export function StudentEnrollmentTab({ student }: Props) {
  const enrollments = student.enrollments;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <GraduationCap className="size-5" />
          </div>

          <div>
            <h2 className="font-semibold">Enrollment History</h2>

            <p className="mt-0.5 text-sm text-muted-foreground">
              Academic year, class, section and roll number history.
            </p>
          </div>
        </div>

        <div className="flex w-fit items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm">
          <CalendarDays className="size-4 text-muted-foreground" />

          <span className="font-medium">{enrollments.length}</span>

          <span className="text-muted-foreground">
            {enrollments.length === 1 ? "Record" : "Records"}
          </span>
        </div>
      </div>

      {/* Empty State */}
      {enrollments.length === 0 ? (
        <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-dashed bg-card">
          <div className="max-w-sm px-6 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-muted">
              <GraduationCap className="size-6 text-muted-foreground" />
            </div>

            <h3 className="mt-4 font-semibold">No enrollment records</h3>

            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              There are no enrollment records available for this student.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden overflow-hidden rounded-2xl border bg-card shadow-sm md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Academic Year
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Class
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Section
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Roll No
                  </th>
                </tr>
              </thead>

              <tbody>
                {enrollments.map((item, index) => (
                  <tr
                    key={item.id}
                    className={`
                      transition-colors hover:bg-muted/20
                      ${index !== enrollments.length - 1 ? "border-b" : ""}
                    `}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="size-4 text-primary" />

                        <span className="font-medium">
                          {item.academicYear.name}
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span className="inline-flex items-center rounded-md bg-primary/10 px-2.5 py-1 text-sm font-medium text-primary">
                        {item.class.name}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <UsersRound className="size-4 text-muted-foreground" />

                        <span className="font-medium">{item.section.name}</span>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Hash className="size-4 text-muted-foreground" />

                        <span className="font-medium">
                          {item.rollNo ?? "—"}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="grid gap-3 md:hidden">
            {enrollments.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border bg-card p-4 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <CalendarDays className="size-4" />
                    </div>

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Academic Year
                      </p>

                      <p className="font-semibold">{item.academicYear.name}</p>
                    </div>
                  </div>

                  <span className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                    {item.class.name}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 border-t pt-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Section</p>

                    <div className="mt-1 flex items-center gap-1.5">
                      <UsersRound className="size-3.5 text-muted-foreground" />

                      <p className="text-sm font-medium">{item.section.name}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">Roll Number</p>

                    <div className="mt-1 flex items-center gap-1.5">
                      <Hash className="size-3.5 text-muted-foreground" />

                      <p className="text-sm font-medium">
                        {item.rollNo ?? "—"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
