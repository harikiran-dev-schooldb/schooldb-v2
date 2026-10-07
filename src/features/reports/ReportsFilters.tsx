"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BookmarkPlus, Filter, RotateCcw } from "lucide-react";

import { AcademicYearSelect } from "@/components/common/select/AcademicYearSelect";
import { ClassSelect } from "@/components/common/select/ClassSelect";
import { SectionSelect } from "@/components/common/select/SectionSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  schoolSlug: string;
  routePath?: "reports" | "management-analytics";
  initial: {
    academicYearId: string;
    classId: string;
    sectionId: string;
    from: string;
    to: string;
  };
};

export function ReportsFilters({ schoolSlug, routePath = "reports", initial }: Props) {
  const router = useRouter();
  const [academicYearId, setAcademicYearId] = useState(initial.academicYearId);
  const [classId, setClassId] = useState(initial.classId);
  const [sectionId, setSectionId] = useState(initial.sectionId);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [savedView, setSavedView] = useState<Props["initial"] | null>(null);
  const storageKey = `schooldb:report-view:${schoolSlug}:${routePath}`;

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) setSavedView(JSON.parse(stored) as Props["initial"]);
    } catch {
      setSavedView(null);
    }
  }, [storageKey]);

  const query = useMemo(() => {
    const params = new URLSearchParams({ academicYearId, from, to });
    if (classId) params.set("classId", classId);
    if (sectionId) params.set("sectionId", sectionId);
    return params.toString();
  }, [academicYearId, classId, sectionId, from, to]);

  function applyFilters() {
    router.push(`/${schoolSlug}/${routePath}?${query}`);
  }

  function resetFilters() {
    router.push(`/${schoolSlug}/${routePath}`);
  }

  function saveView() {
    const view = { academicYearId, classId, sectionId, from, to };
    window.localStorage.setItem(storageKey, JSON.stringify(view));
    setSavedView(view);
  }

  function loadSavedView() {
    if (!savedView) return;
    setAcademicYearId(savedView.academicYearId);
    setClassId(savedView.classId);
    setSectionId(savedView.sectionId);
    setFrom(savedView.from);
    setTo(savedView.to);
    const params = new URLSearchParams({
      academicYearId: savedView.academicYearId,
      from: savedView.from,
      to: savedView.to,
    });
    if (savedView.classId) params.set("classId", savedView.classId);
    if (savedView.sectionId) params.set("sectionId", savedView.sectionId);
    router.push(`/${schoolSlug}/${routePath}?${params.toString()}`);
  }

  return (
    <section className="print:hidden rounded-2xl border bg-card p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-indigo-600" />
          <div>
            <h2 className="font-bold">Report filters</h2>
            <p className="text-xs text-muted-foreground">
              Every download below follows this scope.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {savedView ? (
            <Button variant="outline" size="sm" onClick={loadSavedView}>
              Load saved view
            </Button>
          ) : null}
          <Button variant="outline" size="sm" onClick={saveView} disabled={!academicYearId || !from || !to}>
            <BookmarkPlus className="size-3.5" />
            Save view
          </Button>
          <Button variant="outline" size="sm" onClick={resetFilters}>
            <RotateCcw className="size-3.5" />
            Reset
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

              router.push(
                `/${schoolSlug}/${routePath}?academicYearId=${encodeURIComponent(value)}`,
              );
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
