import Link from "next/link";
import { Home, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";

export function StudentContextHeader({
  schoolSlug,
  student,
}: {
  schoolSlug: string;
  student: {
    id: string;
    fullName: string | null;
    admissionNo: string;
    imageUrl?: string | null;
    relationship: string | null;
    enrollments: Array<{
      class: { name: string };
      section: { name: string };
      academicYear: { name: string };
    }>;
  };
}) {
  const base = `/${schoolSlug}/my/${student.id}`;
  const enrollment = student.enrollments[0];
  const initials = (student.fullName || "Student")
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  return (
    <section className="flex flex-col gap-4 rounded-[26px] border border-border/60 bg-card/90 p-4 shadow-[0_18px_55px_rgba(15,23,42,0.06)] backdrop-blur-xl sm:flex-row sm:items-center sm:p-5 print:hidden">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <div
          className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-blue-600 bg-cover bg-center font-black text-white shadow-[0_10px_26px_rgba(79,70,229,0.25)]"
          style={student.imageUrl ? { backgroundImage: `url(${JSON.stringify(student.imageUrl)})` } : undefined}
          role={student.imageUrl ? "img" : undefined}
          aria-label={student.imageUrl ? `${student.fullName || "Student"} profile photo` : undefined}
        >
          {!student.imageUrl && initials}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-base font-bold tracking-[-0.02em] text-foreground">
              {student.fullName || "Student"}
            </p>
            {student.relationship && student.relationship !== "Self" && (
              <Badge variant="outline" className="rounded-full">
                {student.relationship}
              </Badge>
            )}
          </div>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {enrollment
              ? `${enrollment.class.name} · Section ${enrollment.section.name} · ${enrollment.academicYear.name}`
              : "No active enrollment"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="hidden rounded-xl bg-muted/60 px-3 py-2 text-xs font-semibold text-muted-foreground sm:inline-flex">
          Admission {student.admissionNo}
        </span>
        <Link
          href={base}
          className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-foreground px-4 text-sm font-bold text-background shadow-sm transition hover:opacity-90 sm:flex-none"
        >
          <Home className="size-4" />
          Dashboard
          <Sparkles className="size-3.5 opacity-70" />
        </Link>
      </div>
    </section>
  );
}
