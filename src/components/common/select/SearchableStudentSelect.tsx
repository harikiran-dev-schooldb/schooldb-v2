"use client";

import { useEffect, useMemo, useState } from "react";

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

type StudentOption = {
  id: string;
  label: string;
  className: string | null;
  sectionName: string | null;
};

type Props = {
  value?: string;
  onChange: (value: string) => void;
  academicYearId?: string;
  disabled?: boolean;
};

export function SearchableStudentSelect({
  value,
  onChange,
  academicYearId,
  disabled,
}: Props) {
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!academicYearId) {
      setStudents([]);
      return;
    }

    const selectedAcademicYearId = academicYearId;

    const controller = new AbortController();

    async function load() {
      try {
        setLoading(true);

        const params = new URLSearchParams();
        params.set("academicYearId", selectedAcademicYearId);

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
          setStudents((result.data ?? []) as StudentOption[]);
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

  const selectedStudent = useMemo(
    () => students.find((student) => student.id === value),
    [students, value],
  );

  const isDisabled = disabled || loading || !academicYearId;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={isDisabled}
          className="h-10 w-full justify-between font-normal"
        >
          <span className="flex min-w-0 items-center gap-2 truncate">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />

            <span className="truncate">
              {!academicYearId
                ? "Select Academic Year first"
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
          <CommandInput placeholder="Search student name..." />

          <CommandList>
            <CommandEmpty>No student found.</CommandEmpty>

            <CommandGroup>
              {students.map((student) => (
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
                      {student.className ?? "No Class"}
                      {student.sectionName ? ` — ${student.sectionName}` : ""}
                    </p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
