"use client";

import { FormEvent, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { RotateCcw, Search } from "lucide-react";

import { ClassSelect, SectionSelect } from "@/components/common/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  initialQuery: string;
  initialType: string;
  initialStatus: string;
  initialClassId: string;
  initialSectionId: string;
};

export function CertificateRegisterFilters({
  initialQuery,
  initialType,
  initialStatus,
  initialClassId,
  initialSectionId,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(initialQuery);
  const [type, setType] = useState(initialType);
  const [status, setStatus] = useState(initialStatus);
  const [classId, setClassId] = useState(initialClassId);
  const [sectionId, setSectionId] = useState(initialSectionId);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (type) params.set("type", type);
    if (status) params.set("status", status);
    if (classId) params.set("classId", classId);
    if (sectionId) params.set("sectionId", sectionId);
    router.push(params.size ? `${pathname}?${params.toString()}` : pathname);
  }

  function clearFilters() {
    setQuery("");
    setType("");
    setStatus("");
    setClassId("");
    setSectionId("");
    router.push(pathname);
  }

  return (
    <form
      onSubmit={applyFilters}
      className="mt-7 grid gap-3 rounded-2xl border bg-card p-4 shadow-sm md:grid-cols-2 xl:grid-cols-[minmax(260px,1fr)_170px_170px_180px_180px_auto]"
    >
      <div className="relative">
        <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="pl-9"
          placeholder="Student, admission or certificate number"
        />
      </div>

      <ClassSelect
        value={classId}
        onChange={(value) => {
          setClassId(value);
          setSectionId("");
        }}
        allowAll
        placeholder="All Classes"
      />
      <SectionSelect
        classId={classId}
        value={sectionId}
        onChange={setSectionId}
        placeholder="All Sections"
      />

      <Select value={type || "ALL"} onValueChange={(value) => setType(value === "ALL" ? "" : value)}>
        <SelectTrigger><SelectValue placeholder="All Types" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Types</SelectItem>
          <SelectItem value="BONAFIDE">Bonafide</SelectItem>
          <SelectItem value="STUDY">Study</SelectItem>
          <SelectItem value="TRANSFER">Transfer</SelectItem>
        </SelectContent>
      </Select>

      <Select value={status || "ALL"} onValueChange={(value) => setStatus(value === "ALL" ? "" : value)}>
        <SelectTrigger><SelectValue placeholder="All Statuses" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Statuses</SelectItem>
          <SelectItem value="ISSUED">Issued</SelectItem>
          <SelectItem value="CANCELLED">Cancelled</SelectItem>
        </SelectContent>
      </Select>

      <div className="flex gap-2">
        <Button type="submit" className="flex-1">Apply</Button>
        <Button type="button" variant="outline" size="icon" onClick={clearFilters} aria-label="Clear filters">
          <RotateCcw className="size-4" />
        </Button>
      </div>
    </form>
  );
}
