"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { IdCard, ImageUp, LayoutPanelLeft, Loader2, Save, Search, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import { AcademicYearSelect, ClassSelect, SectionSelect } from "@/components/common/select";
import { SearchableStudentSelect } from "@/components/common/select/SearchableStudentSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { IdCardSetting } from "@/features/students/components/id-cards/StudentIdCard";

type Props = {
  initialAcademicYearId: string;
  initialClassId?: string;
  initialSectionId?: string;
  initialStudentId?: string;
  initialSetting: IdCardSetting;
};

export function IdCardFilters({ initialAcademicYearId, initialClassId = "", initialSectionId = "", initialStudentId = "", initialSetting }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<"CLASS" | "STUDENT">(initialStudentId ? "STUDENT" : "CLASS");
  const [academicYearId, setAcademicYearId] = useState(initialAcademicYearId);
  const [classId, setClassId] = useState(initialClassId);
  const [sectionId, setSectionId] = useState(initialSectionId);
  const [studentId, setStudentId] = useState(initialStudentId);
  const [orientation, setOrientation] = useState<IdCardSetting["orientation"]>(initialSetting.orientation);
  const [widthMm, setWidthMm] = useState(String(initialSetting.widthMm));
  const [heightMm, setHeightMm] = useState(String(initialSetting.heightMm));
  const [showBack, setShowBack] = useState(initialSetting.showBack);
  const [backImageUrl, setBackImageUrl] = useState(initialSetting.backImageUrl ?? "");
  const [backContent, setBackContent] = useState(initialSetting.backContent ?? "");
  const [saving, setSaving] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);

  function generate() {
    const params = new URLSearchParams({ academicYearId });
    if (mode === "STUDENT") params.set("studentId", studentId);
    else {
      params.set("classId", classId);
      if (sectionId) params.set("sectionId", sectionId);
    }
    startTransition(() => router.push(`?${params.toString()}`));
  }

  const canGenerate = Boolean(academicYearId && (mode === "STUDENT" ? studentId : classId));

  function changeOrientation(value: IdCardSetting["orientation"]) {
    setOrientation(value);
    setWidthMm(value === "PORTRAIT" ? "54" : "85.6");
    setHeightMm(value === "PORTRAIT" ? "85.6" : "54");
  }

  async function saveDesign() {
    const width = Number(widthMm);
    const height = Number(heightMm);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width < 40 || width > 150 || height < 40 || height > 150) {
      toast.error("Width and height must be between 40 mm and 150 mm.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/v1/id-card-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orientation, widthMm: width, heightMm: height, showBack, backContent }),
      });
      const payload = (await response.json()) as { success?: boolean; message?: string };
      if (!response.ok || !payload.success) throw new Error(payload.message || "Unable to save the ID card design.");
      toast.success("ID card format saved for this school.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save the ID card design.");
    } finally {
      setSaving(false);
    }
  }

  async function uploadBackImage(file: File) {
    setImageBusy(true);
    try {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch("/api/v1/id-card-settings/back-image", {
        method: "POST",
        body,
      });
      const payload = (await response.json()) as {
        success?: boolean;
        message?: string;
        data?: { imageUrl?: string };
      };
      if (!response.ok || !payload.success || !payload.data?.imageUrl) {
        throw new Error(payload.message || "Unable to upload the back image.");
      }
      setBackImageUrl(payload.data.imageUrl);
      toast.success("ID card back image uploaded.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to upload the back image.");
    } finally {
      setImageBusy(false);
    }
  }

  async function removeBackImage() {
    setImageBusy(true);
    try {
      const response = await fetch("/api/v1/id-card-settings/back-image", {
        method: "DELETE",
      });
      const payload = (await response.json()) as {
        success?: boolean;
        message?: string;
      };
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Unable to remove the back image.");
      }
      setBackImageUrl("");
      toast.success("ID card back image removed. The school logo will be used.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to remove the back image.");
    } finally {
      setImageBusy(false);
    }
  }

  return (
    <section className="premium-card rounded-3xl border-0 p-5 print:hidden md:p-6">
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 to-violet-50/50 p-4 md:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-indigo-700"><LayoutPanelLeft className="size-4" /><p className="text-xs font-black uppercase tracking-[0.14em]">School card format</p></div>
            <p className="mt-1 text-xs text-slate-500">Saved once and used for individual and class-wise cards.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[auto_auto_110px_110px_auto_auto] xl:items-end">
            <Button type="button" variant={orientation === "PORTRAIT" ? "default" : "outline"} onClick={() => changeOrientation("PORTRAIT")}>Portrait</Button>
            <Button type="button" variant={orientation === "LANDSCAPE" ? "default" : "outline"} onClick={() => changeOrientation("LANDSCAPE")}>Landscape</Button>
            <div className="space-y-1.5"><Label htmlFor="card-width" className="text-xs">Width (mm)</Label><Input id="card-width" type="number" min="40" max="150" step="0.1" value={widthMm} onChange={(event) => setWidthMm(event.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="card-height" className="text-xs">Height (mm)</Label><Input id="card-height" type="number" min="40" max="150" step="0.1" value={heightMm} onChange={(event) => setHeightMm(event.target.value)} /></div>
            <div className="flex h-10 items-center gap-2 rounded-xl border bg-white px-3"><Switch id="show-card-back" checked={showBack} onCheckedChange={setShowBack} /><Label htmlFor="show-card-back" className="whitespace-nowrap text-xs">Print back</Label></div>
            <Button type="button" onClick={() => void saveDesign()} disabled={saving}>{saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}{saving ? "Saving..." : "Save format"}</Button>
          </div>
        </div>
        {showBack ? (
          <div className="mt-4 grid gap-4 border-t border-indigo-100 pt-4 lg:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs">ID card back image (optional)</Label>
              <div className="flex items-center gap-3 rounded-2xl border border-indigo-100 bg-white/80 p-3">
                <div
                  className="flex size-16 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 bg-contain bg-center bg-no-repeat text-indigo-400"
                  style={backImageUrl ? { backgroundImage: `url(${JSON.stringify(backImageUrl)})` } : undefined}
                  role={backImageUrl ? "img" : undefined}
                  aria-label={backImageUrl ? "Current ID card back image" : undefined}
                >
                  {!backImageUrl && <ImageUp className="size-6" />}
                </div>
                <div className="flex min-w-0 flex-1 flex-wrap gap-2">
                  <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 text-sm font-semibold transition hover:bg-muted/50 has-[:disabled]:pointer-events-none has-[:disabled]:opacity-50">
                    {imageBusy ? <Loader2 className="size-4 animate-spin" /> : <ImageUp className="size-4" />}
                    {backImageUrl ? "Replace image" : "Upload image"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="sr-only"
                      disabled={imageBusy}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        if (file) void uploadBackImage(file);
                      }}
                    />
                  </label>
                  {backImageUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-10 rounded-xl text-destructive hover:text-destructive"
                      disabled={imageBusy}
                      onClick={() => void removeBackImage()}
                      aria-label="Remove ID card back image"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-slate-500">PNG, JPG, or WebP · maximum 5 MB. The school logo is used when no image is uploaded.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="card-back-content" className="text-xs">School information on back (optional)</Label>
              <Textarea id="card-back-content" rows={3} maxLength={1000} value={backContent} onChange={(event) => setBackContent(event.target.value)} placeholder={"Address, phone, email, website or return instructions"} />
            </div>
          </div>
        ) : null}
      </div>

      <div className="my-5 h-px bg-border/60" />

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant={mode === "CLASS" ? "default" : "outline"} onClick={() => { setMode("CLASS"); setStudentId(""); }}>
          <Users className="size-4" /> Class-wise
        </Button>
        <Button type="button" variant={mode === "STUDENT" ? "default" : "outline"} onClick={() => { setMode("STUDENT"); setClassId(""); setSectionId(""); }}>
          <IdCard className="size-4" /> Individual student
        </Button>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-4">
        <div className="space-y-2">
          <Label>Academic year</Label>
          <AcademicYearSelect value={academicYearId} onChange={(value) => { setAcademicYearId(value); setStudentId(""); }} />
        </div>
        {mode === "CLASS" ? (
          <>
            <div className="space-y-2">
              <Label>Class</Label>
              <ClassSelect value={classId} onChange={(value) => { setClassId(value); setSectionId(""); }} />
            </div>
            <div className="space-y-2">
              <Label>Section</Label>
              <SectionSelect classId={classId} value={sectionId} onChange={setSectionId} />
            </div>
          </>
        ) : (
          <div className="space-y-2 lg:col-span-2">
            <Label>Student</Label>
            <SearchableStudentSelect academicYearId={academicYearId} value={studentId} onChange={setStudentId} />
          </div>
        )}
        <div className="flex items-end">
          <Button className="w-full" disabled={!canGenerate || pending} onClick={generate}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            {pending ? "Loading..." : "Generate ID Cards"}
          </Button>
        </div>
      </div>
    </section>
  );
}
