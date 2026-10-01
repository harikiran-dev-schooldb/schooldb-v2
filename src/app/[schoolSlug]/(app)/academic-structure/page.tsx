"use client";

import { useCallback, useEffect, useState } from "react";
import { BookOpen, GitBranch, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Syllabus = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  displayOrder: number;
  _count: { branches: number };
};

type AcademicBranch = {
  id: string;
  syllabusId: string;
  name: string;
  code: string | null;
  description: string | null;
  displayOrder: number;
  syllabus: { id: string; name: string };
  _count: { classes: number };
};

const emptySyllabus = { name: "", code: "", description: "", displayOrder: 0 };
const emptyBranch = { syllabusId: "", name: "", code: "", description: "", displayOrder: 0 };

export default function AcademicStructurePage() {
  const [syllabi, setSyllabi] = useState<Syllabus[]>([]);
  const [branches, setBranches] = useState<AcademicBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syllabusForm, setSyllabusForm] = useState(emptySyllabus);
  const [branchForm, setBranchForm] = useState(emptyBranch);
  const [editingSyllabusId, setEditingSyllabusId] = useState<string | null>(null);
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [syllabusResponse, branchResponse] = await Promise.all([
        fetch("/api/v1/syllabi", { cache: "no-store" }),
        fetch("/api/v1/academic-branches", { cache: "no-store" }),
      ]);
      const [syllabusResult, branchResult] = await Promise.all([
        syllabusResponse.json(),
        branchResponse.json(),
      ]);
      if (!syllabusResult.success) throw new Error(syllabusResult.message);
      if (!branchResult.success) throw new Error(branchResult.message);
      setSyllabi(syllabusResult.data);
      setBranches(branchResult.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load academic structure.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.all([
      fetch("/api/v1/syllabi", { cache: "no-store" }).then((response) => response.json()),
      fetch("/api/v1/academic-branches", { cache: "no-store" }).then((response) => response.json()),
    ]).then(([syllabusResult, branchResult]) => {
      if (!active) return;
      if (!syllabusResult.success || !branchResult.success) {
        toast.error(syllabusResult.message || branchResult.message || "Unable to load academic structure.");
        return;
      }
      setSyllabi(syllabusResult.data);
      setBranches(branchResult.data);
    }).catch(() => {
      if (active) toast.error("Unable to load academic structure.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  async function saveSyllabus() {
    if (!syllabusForm.name.trim()) return toast.error("Syllabus name is required.");
    setSaving(true);
    try {
      const response = await fetch(
        editingSyllabusId ? `/api/v1/syllabi/${editingSyllabusId}` : "/api/v1/syllabi",
        {
          method: editingSyllabusId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(syllabusForm),
        },
      );
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Unable to save syllabus.");
      toast.success(result.message);
      setSyllabusForm(emptySyllabus);
      setEditingSyllabusId(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save syllabus.");
    } finally {
      setSaving(false);
    }
  }

  async function saveBranch() {
    if (!branchForm.syllabusId || !branchForm.name.trim()) {
      return toast.error("Syllabus and branch name are required.");
    }
    setSaving(true);
    try {
      const response = await fetch(
        editingBranchId ? `/api/v1/academic-branches/${editingBranchId}` : "/api/v1/academic-branches",
        {
          method: editingBranchId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(branchForm),
        },
      );
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Unable to save branch.");
      toast.success(result.message);
      setBranchForm(emptyBranch);
      setEditingBranchId(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save branch.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        eyebrow="Academic Setup"
        title="Syllabi & Branches"
        description="Organize classes as Syllabus → Branch → Class → Section. Branches represent divisions such as KG, Primary, Secondary, and Higher Secondary."
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <StructureCard icon={<BookOpen className="size-5" />} title="Syllabi" description="State, CBSE, ICSE, IB, Cambridge, and other curricula.">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="Syllabus name" value={syllabusForm.name} onChange={(event) => setSyllabusForm({ ...syllabusForm, name: event.target.value })} />
            <Input placeholder="Code (optional)" value={syllabusForm.code} onChange={(event) => setSyllabusForm({ ...syllabusForm, code: event.target.value })} />
            <Input className="sm:col-span-2" placeholder="Description (optional)" value={syllabusForm.description} onChange={(event) => setSyllabusForm({ ...syllabusForm, description: event.target.value })} />
          </div>
          <FormActions editing={Boolean(editingSyllabusId)} saving={saving} onSave={() => void saveSyllabus()} onCancel={() => { setEditingSyllabusId(null); setSyllabusForm(emptySyllabus); }} />
          <StructureList loading={loading} empty="No syllabi configured.">
            {syllabi.map((item) => (
              <StructureRow key={item.id} title={item.name} subtitle={`${item._count.branches} ${item._count.branches === 1 ? "branch" : "branches"}`} code={item.code} onEdit={() => { setEditingSyllabusId(item.id); setSyllabusForm({ name: item.name, code: item.code ?? "", description: item.description ?? "", displayOrder: item.displayOrder }); }} />
            ))}
          </StructureList>
        </StructureCard>

        <StructureCard icon={<GitBranch className="size-5" />} title="Academic Branches" description="KG, Primary, Secondary, Higher Secondary, or custom divisions.">
          <div className="grid gap-3 sm:grid-cols-2">
            <Select value={branchForm.syllabusId} onValueChange={(syllabusId) => setBranchForm({ ...branchForm, syllabusId })}>
              <SelectTrigger><SelectValue placeholder="Select syllabus" /></SelectTrigger>
              <SelectContent>{syllabi.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent>
            </Select>
            <Input placeholder="Branch name" value={branchForm.name} onChange={(event) => setBranchForm({ ...branchForm, name: event.target.value })} />
            <Input placeholder="Code (optional)" value={branchForm.code} onChange={(event) => setBranchForm({ ...branchForm, code: event.target.value })} />
            <Input placeholder="Description (optional)" value={branchForm.description} onChange={(event) => setBranchForm({ ...branchForm, description: event.target.value })} />
          </div>
          <FormActions editing={Boolean(editingBranchId)} saving={saving} onSave={() => void saveBranch()} onCancel={() => { setEditingBranchId(null); setBranchForm(emptyBranch); }} />
          <StructureList loading={loading} empty="No academic branches configured.">
            {branches.map((item) => (
              <StructureRow key={item.id} title={item.name} subtitle={`${item.syllabus.name} · ${item._count.classes} ${item._count.classes === 1 ? "class" : "classes"}`} code={item.code} onEdit={() => { setEditingBranchId(item.id); setBranchForm({ syllabusId: item.syllabusId, name: item.name, code: item.code ?? "", description: item.description ?? "", displayOrder: item.displayOrder }); }} />
            ))}
          </StructureList>
        </StructureCard>
      </div>
    </div>
  );
}

function StructureCard({ icon, title, description, children }: { icon: React.ReactNode; title: string; description: string; children: React.ReactNode }) {
  return <Card className="premium-card overflow-hidden rounded-3xl"><CardHeader className="border-b"><div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</div><div><CardTitle>{title}</CardTitle><p className="mt-1 text-xs text-muted-foreground">{description}</p></div></div></CardHeader><CardContent className="space-y-5 p-5">{children}</CardContent></Card>;
}

function FormActions({ editing, saving, onSave, onCancel }: { editing: boolean; saving: boolean; onSave: () => void; onCancel: () => void }) {
  return <div className="flex gap-2"><Button onClick={onSave} disabled={saving}>{saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}{editing ? "Save Changes" : "Add"}</Button>{editing && <Button variant="outline" onClick={onCancel}>Cancel</Button>}</div>;
}

function StructureList({ loading, empty, children }: { loading: boolean; empty: string; children: React.ReactNode }) {
  if (loading) return <div className="flex h-24 items-center justify-center"><Loader2 className="size-5 animate-spin" /></div>;
  if (!children || (Array.isArray(children) && children.length === 0)) return <p className="rounded-xl bg-muted/40 p-4 text-sm text-muted-foreground">{empty}</p>;
  return <div className="divide-y rounded-2xl border">{children}</div>;
}

function StructureRow({ title, subtitle, code, onEdit }: { title: string; subtitle: string; code: string | null; onEdit: () => void }) {
  return <div className="flex items-center justify-between gap-4 p-4"><div><p className="font-semibold">{title}{code ? <span className="ml-2 text-xs text-primary">{code}</span> : null}</p><p className="mt-1 text-xs text-muted-foreground">{subtitle}</p></div><Button size="sm" variant="ghost" onClick={onEdit}>Edit</Button></div>;
}
