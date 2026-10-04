"use client";

import { useEffect, useId, useMemo, useState } from "react";

import { Check, ChevronsUpDown, Search } from "lucide-react";

import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type StudentOption = {
  id: string;
  label: string;
  className: string | null;
  sectionName: string | null;
  classId: string | null;
  sectionId: string | null;
  branchId: string | null;
  branchName: string | null;
  syllabusId: string | null;
  syllabusName: string | null;
};

type Props = {
  value?: string;
  id?: string;
  onChange: (value: string) => void;
  academicYearId?: string;
  disabled?: boolean;
};

export function SearchableStudentSelect({
  value,
  id,
  onChange,
  academicYearId,
  disabled,
}: Props) {
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [syllabusId, setSyllabusId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const generatedId = useId().replaceAll(":", "");

  useEffect(() => {
    if (!academicYearId) {
      return;
    }

    const selectedAcademicYearId = academicYearId;

    const controller = new AbortController();

    async function load() {
      try {
        setLoading(true);

        const params = new URLSearchParams();
        params.set("academicYearId", selectedAcademicYearId);
        params.set("mode", "enrolled");

        const res = await fetch(
          `/api/v1/students/options?${params.toString()}`,
          {
            signal: controller.signal,
          },
        );

        const result = await res.json();

        if (controller.signal.aborted) {
          return;
        }

        if (result.success) {
          const nextStudents = (result.data ?? []) as StudentOption[];
          const nextSyllabi = uniqueOptions(
            nextStudents,
            "syllabusId",
            "syllabusName",
          );

          setStudents(nextStudents);
          setSyllabusId(nextSyllabi.length === 1 ? nextSyllabi[0].value : "");
          setBranchId("");
          setClassId("");
          setSectionId("");
        } else {
          setStudents([]);
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        console.error("Failed to load students:", error);
        setStudents([]);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      controller.abort();
    };
  }, [academicYearId]);

  const syllabi = useMemo(
    () => uniqueOptions(students, "syllabusId", "syllabusName"),
    [students],
  );
  const branches = useMemo(
    () =>
      uniqueOptions(
        syllabusId
          ? students.filter(
              (student) => student.syllabusId === syllabusId,
            )
          : students,
        "branchId",
        "branchName",
      ),
    [students, syllabusId],
  );
  const classes = useMemo(
    () =>
      uniqueOptions(
        students.filter(
          (student) =>
            (!syllabusId || student.syllabusId === syllabusId) &&
            (!branchId || student.branchId === branchId),
        ),
        "classId",
        "className",
      ),
    [branchId, students, syllabusId],
  );
  const sections = useMemo(
    () =>
      uniqueOptions(
        students.filter(
          (student) =>
            (!syllabusId || student.syllabusId === syllabusId) &&
            (!branchId || student.branchId === branchId) &&
            (!classId || student.classId === classId),
        ),
        "sectionId",
        "sectionName",
      ),
    [branchId, classId, students, syllabusId],
  );

  const availableStudents = useMemo(
    () =>
      academicYearId
        ? students.filter(
            (student) =>
              (!syllabusId || student.syllabusId === syllabusId) &&
              (!branchId || student.branchId === branchId) &&
              (!classId || student.classId === classId) &&
              (!sectionId || student.sectionId === sectionId),
          )
        : [],
    [academicYearId, branchId, classId, sectionId, students, syllabusId],
  );

  const selectedStudent = useMemo(
    () => availableStudents.find((student) => student.id === value),
    [availableStudents, value],
  );

  const isDisabled = disabled || loading || !academicYearId;

  function clearStudent() {
    if (value) onChange("");
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <AcademicFilter
          id={`student-syllabus-${generatedId}`}
          label="Syllabus"
          value={syllabusId}
          options={syllabi}
          placeholder="All syllabi"
          disabled={isDisabled}
          onChange={(next) => {
            setSyllabusId(next);
            setBranchId("");
            setClassId("");
            setSectionId("");
            clearStudent();
          }}
        />
        <AcademicFilter
          id={`student-branch-${generatedId}`}
          label="Branch"
          value={branchId}
          options={branches}
          placeholder="All branches"
          disabled={isDisabled || !syllabusId}
          onChange={(next) => {
            setBranchId(next);
            setClassId("");
            setSectionId("");
            clearStudent();
          }}
        />
        <AcademicFilter
          id={`student-class-${generatedId}`}
          label="Class"
          value={classId}
          options={classes}
          placeholder="All classes"
          disabled={isDisabled || !branchId}
          onChange={(next) => {
            setClassId(next);
            setSectionId("");
            clearStudent();
          }}
        />
        <AcademicFilter
          id={`student-section-${generatedId}`}
          label="Section"
          value={sectionId}
          options={sections}
          placeholder="All sections"
          disabled={isDisabled || !classId}
          onChange={(next) => {
            setSectionId(next);
            clearStudent();
          }}
        />
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id ?? `student-picker-${generatedId}`}
            type="button"
            variant="outline"
            role="combobox"
            aria-label="Student"
            aria-expanded={open}
            disabled={isDisabled}
            className="h-10 w-full justify-between font-normal"
          >
            <span className="flex min-w-0 items-center gap-2 truncate">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />

              <span className="truncate">
                {!academicYearId
                  ? "Select or activate an academic year first"
                  : loading
                    ? "Loading students..."
                    : selectedStudent?.label || "Search Student"}
              </span>
            </span>

            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          className="w-[--radix-popover-trigger-width] p-0"
        >
          <Command
            filter={(value, search) => {
              if (!search) {
                return 1;
              }

              return value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
            }}
          >
            <CommandInput placeholder="Search student name or admission number..." />

            <CommandList>
              <CommandEmpty>No student found.</CommandEmpty>

              <CommandGroup>
                {availableStudents.map((student) => (
                  <CommandItem
                    key={student.id}
                    value={student.label}
                    onSelect={() => {
                      onChange(student.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === student.id ? "opacity-100" : "opacity-0",
                      )}
                    />

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{student.label}</p>

                      <p className="truncate text-xs text-muted-foreground">
                        {student.syllabusName
                          ? `${student.syllabusName} · `
                          : ""}
                        {student.branchName ? `${student.branchName} · ` : ""}
                        {student.className ?? "No Class"}
                        {student.sectionName
                          ? ` — ${student.sectionName}`
                          : ""}
                      </p>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {academicYearId && !loading ? (
        <p className="text-xs text-muted-foreground">
          {availableStudents.length} student
          {availableStudents.length === 1 ? "" : "s"} available in this
          selection.
        </p>
      ) : null}
    </div>
  );
}

function uniqueOptions(
  students: StudentOption[],
  idKey: "syllabusId" | "branchId" | "classId" | "sectionId",
  labelKey: "syllabusName" | "branchName" | "className" | "sectionName",
) {
  const options = new Map<string, string>();
  for (const student of students) {
    const optionId = student[idKey];
    const label = student[labelKey];
    if (optionId && label) options.set(optionId, label);
  }
  return [...options]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function AcademicFilter({
  id,
  label,
  value,
  options,
  placeholder,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  placeholder: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Select
        value={value || "ALL"}
        disabled={disabled}
        onValueChange={(next) => onChange(next === "ALL" ? "" : next)}
      >
        <SelectTrigger id={id} className="h-10 w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">{placeholder}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
