"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Edit3, Plus, Search, ShieldCheck, UploadCloud } from "lucide-react";
import { toast } from "sonner";

import { AcademicYearSelect } from "@/components/common/select/AcademicYearSelect";
import { TeacherSelect } from "@/components/common/select/TeacherSelect";
import { RemoteCombobox } from "@/components/common/combobox/RemoteCombobox";
import { SectionSelect } from "@/components/common/select/SectionSelect";
import { FormField } from "@/components/common/forms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useSchool } from "@/contexts/school-context";
import { isRouteAllowed } from "@/lib/route-access";
import {
  classTeacherAssignmentSchema,
  type ClassTeacherAssignmentInput,
} from "./schema";

type Item = {
  id: string;
  academicYearId: string;
  teacherId: string;
  classId: string;
  sectionId: string;
  active: boolean;
  remarks: string | null;
  academicYear: { name: string };
  teacher: { fullName: string; employeeId: string };
  class: { name: string };
  section: { name: string };
};

const emptyForm: ClassTeacherAssignmentInput = {
  academicYearId: "",
  teacherId: "",
  classId: "",
  sectionId: "",
  remarks: "",
  active: true,
};

export function ClassTeacherManager() {
  const { school } = useSchool();
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ClassTeacherAssignmentInput>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      const response = await fetch(`/api/v1/class-teachers?${params}`, {
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to load class teachers.");
      }
      setItems(result.data ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load class teachers.");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
    setOpen(true);
  }

  function startEdit(item: Item) {
    setEditingId(item.id);
    setForm({
      academicYearId: item.academicYearId,
      teacherId: item.teacherId,
      classId: item.classId,
      sectionId: item.sectionId,
      remarks: item.remarks ?? "",
      active: item.active,
    });
    setErrors({});
    setOpen(true);
  }

  async function save() {
    const parsed = classTeacherAssignmentSchema.safeParse(form);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        next[String(issue.path[0])] = issue.message;
      }
      setErrors(next);
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(
        editingId ? `/api/v1/class-teachers/${editingId}` : "/api/v1/class-teachers",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
        },
      );
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to save class teacher.");
      }
      toast.success(result.message || "Class teacher saved.");
      setOpen(false);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save class teacher.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search teacher, class, section or year…"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {isRouteAllowed(school, "bulk-operations/class-teachers") && (
            <Button asChild variant="outline">
              <Link href={`/${school.slug}/bulk-operations/class-teachers`}>
                <UploadCloud className="size-4" /> Bulk import
              </Link>
            </Button>
          )}
          <Button onClick={startCreate}>
            <Plus className="size-4" /> Assign class teacher
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full min-w-[780px] text-sm">
          <thead className="border-b bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-5 py-3">Academic year</th>
              <th className="px-5 py-3">Class & section</th>
              <th className="px-5 py-3">Class teacher</th>
              <th className="px-5 py-3">Responsibilities</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">Loading class teachers…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">No class teacher assignments found.</td></tr>
            ) : items.map((item) => (
              <tr key={item.id} className="hover:bg-muted/20">
                <td className="px-5 py-4 font-medium">{item.academicYear.name}</td>
                <td className="px-5 py-4"><span className="font-semibold">{item.class.name}</span> · {item.section.name}</td>
                <td className="px-5 py-4"><p className="font-semibold">{item.teacher.fullName}</p><p className="text-xs text-muted-foreground">{item.teacher.employeeId}</p></td>
                <td className="px-5 py-4 text-xs text-muted-foreground">Attendance · fees view · homework · notices · results</td>
                <td className="px-5 py-4"><Badge variant={item.active ? "default" : "secondary"}>{item.active ? "Active" : "Inactive"}</Badge></td>
                <td className="px-5 py-4 text-right"><Button variant="ghost" size="sm" onClick={() => startEdit(item)}><Edit3 className="size-4" /> Edit</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit class teacher" : "Assign class teacher"}</DialogTitle>
            <DialogDescription>
              One class teacher can be active for each class and section in an academic year.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
            <div className="rounded-xl border bg-indigo-50/50 p-4 text-sm text-indigo-950">
              <div className="flex gap-3"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-indigo-600" /><p>This assignment grants class-level access to attendance, outstanding fee visibility, homework, announcements and exam results.</p></div>
            </div>
            <FormField label="Academic year" required error={errors.academicYearId}>
              <AcademicYearSelect value={form.academicYearId} onChange={(academicYearId) => setForm((value) => ({ ...value, academicYearId }))} />
            </FormField>
            <FormField label="Teacher" required error={errors.teacherId}>
              <TeacherSelect value={form.teacherId} onChange={(teacherId) => setForm((value) => ({ ...value, teacherId }))} />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Class" required error={errors.classId}>
                <RemoteCombobox
                  url="/api/v1/classes/options"
                  value={form.classId}
                  placeholder="Select class"
                  onChange={(classId) => setForm((value) => ({ ...value, classId, sectionId: "" }))}
                />
              </FormField>
              <FormField label="Section" required error={errors.sectionId}>
                <SectionSelect
                  classId={form.classId}
                  value={form.sectionId}
                  allowAll={false}
                  onChange={(sectionId) => setForm((value) => ({ ...value, sectionId }))}
                />
              </FormField>
            </div>
            <FormField label="Remarks" error={errors.remarks}>
              <Textarea value={form.remarks ?? ""} maxLength={500} onChange={(event) => setForm((value) => ({ ...value, remarks: event.target.value }))} placeholder="Optional notes about this assignment" />
            </FormField>
            <div className="flex items-center justify-between rounded-xl border px-4 py-3">
              <div><p className="text-sm font-semibold">Active assignment</p><p className="text-xs text-muted-foreground">Inactive assignments do not grant class access.</p></div>
              <Switch checked={form.active} onCheckedChange={(active) => setForm((value) => ({ ...value, active }))} />
            </div>
            <Button className="w-full" disabled={saving} onClick={() => void save()}>{saving ? "Saving…" : editingId ? "Update assignment" : "Assign class teacher"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
