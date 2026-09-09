"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Filter, Printer, RotateCcw } from "lucide-react";

import { AcademicYearSelect } from "@/components/common/select/AcademicYearSelect";
import { ClassSelect } from "@/components/common/select/ClassSelect";
import { SectionSelect } from "@/components/common/select/SectionSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  schoolSlug: string;
  initial: {
    academicYearId: string;
    classId: string;
    sectionId: string;
    from: string;
    to: string;
  };
};

export function ReportsFilters({ schoolSlug, initial }: Props) {
  const router = useRouter();
  const [academicYearId, setAcademicYearId] = useState(initial.academicYearId);
  const [classId, setClassId] = useState(initial.classId);
  const [sectionId, setSectionId] = useState(initial.sectionId);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);

  const query = useMemo(() => {
    const params = new URLSearchParams({ academicYearId, from, to });
    if (classId) params.set("classId", classId);
    if (sectionId) params.set("sectionId", sectionId);
    return params.toString();
  }, [academicYearId, classId, sectionId, from, to]);

  function applyFilters() {
    router.push(`/${schoolSlug}/reports?${query}`);
  }

  function resetFilters() {
    router.push(`/${schoolSlug}/reports`);
  }

  return (
    <section className="print:hidden rounded-2xl border bg-card p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-indigo-600" />
          <div>
            <h2 className="font-bold">Report filters</h2>
            <p className="text-xs text-muted-foreground">
              Every metric below follows this scope.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={resetFilters}>
            <RotateCcw className="size-3.5" />
            Reset
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href={`/api/v1/reports/export?${query}`}>
              <Download className="size-3.5" />
              Download CSV
            </a>
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="size-3.5" />
            Print / PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <label className="space-y-1.5 text-sm font-medium xl:col-span-1">
          Academic year
          <AcademicYearSelect
            value={academicYearId}
            onChange={(value) => {
              setAcademicYearId(value);
              setClassId("");
              setSectionId("");
            }}
          />
        </label>
        <label className="space-y-1.5 text-sm font-medium xl:col-span-1">
          Class
          <ClassSelect
            value={classId}
            allowAll
            placeholder="All Classes"
            onChange={(value) => {
              setClassId(value);
              setSectionId("");
            }}
          />
        </label>
        <label className="space-y-1.5 text-sm font-medium xl:col-span-1">
          Section
          <SectionSelect
            classId={classId}
            value={sectionId}
            allowAll
            placeholder="All Sections"
            onChange={setSectionId}
          />
        </label>
        <label className="space-y-1.5 text-sm font-medium">
          From
          <Input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </label>
        <label className="space-y-1.5 text-sm font-medium">
          To
          <Input
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </label>
        <div className="flex items-end">
          <Button
            className="w-full"
            disabled={!academicYearId || !from || !to}
            onClick={applyFilters}
          >
            Apply filters
          </Button>
        </div>
      </div>
    </section>
  );
}
