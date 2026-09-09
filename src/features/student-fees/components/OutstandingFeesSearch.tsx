"use client";

import { Search, SlidersHorizontal } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ClassSelect, SectionSelect } from "@/components/common/select";

type Props = {
  value: string;
  loading?: boolean;
  onChange: (value: string) => void;
  classId: string;
  sectionId: string;
  onClassChange: (value: string) => void;
  onSectionChange: (value: string) => void;
  onSearch: () => void;
};

export function OutstandingFeesSearch({
  value,
  loading = false,
  onChange,
  classId,
  sectionId,
  onClassChange,
  onSectionChange,
  onSearch,
}: Props) {
  return (
    <Card className="w-full overflow-hidden rounded-2xl border-border/60 bg-card shadow-[0_8px_30px_rgba(15,23,42,0.045)]">
      <CardContent className="p-0">
        {/* Header */}
        <div className="border-b border-border/60 bg-muted/20 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <SlidersHorizontal className="size-4" />
            </div>

            <div>
              <h2 className="text-sm font-bold tracking-tight text-foreground">
                Find Outstanding Fees
              </h2>

              <p className="mt-0.5 text-xs text-muted-foreground">
                Search students or narrow the list by class and section.
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="p-5 sm:p-6">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(260px,1fr)_180px_180px_auto]">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                value={value}
                onChange={(event) => onChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    onSearch();
                  }
                }}
                placeholder="Search student or admission number..."
                className="h-11 rounded-xl border-border/70 bg-background pl-11 shadow-none transition-all focus-visible:ring-2 focus-visible:ring-primary/20"
              />
            </div>

            <ClassSelect
              value={classId}
              onChange={onClassChange}
              allowAll
              placeholder="All Classes"
              triggerClassName="h-11 rounded-xl"
            />

            <SectionSelect
              classId={classId}
              value={sectionId}
              onChange={onSectionChange}
              placeholder="All Sections"
              triggerClassName="h-11 rounded-xl"
            />

            <Button
              onClick={onSearch}
              disabled={loading}
              className="h-11 rounded-xl px-6 sm:min-w-32"
            >
              <Search className="mr-2 size-4" />

              {loading ? "Searching..." : "Search"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
