"use client";

import { useMemo, useState, type FormEvent } from "react";
import { BookOpen, DoorOpen, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  queuePwaAction,
  type PwaOfflineSnapshot,
} from "@/lib/pwa-storage";

type AttendanceRecord = {
  studentId: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "LEAVE";
  remarks?: string | null;
  student?: { admissionNo?: string; fullName?: string };
};

type AttendanceSession = {
  id: string;
  locked?: boolean;
  class?: { name?: string };
  section?: { name?: string };
  records?: AttendanceRecord[];
};

type StaffStudent = {
  id: string;
  admissionNo?: string;
  fullName?: string;
  enrollments?: Array<{
    class?: { id?: string; name?: string };
    section?: { id?: string; name?: string };
  }>;
};

async function queue(
  ownerKey: string,
  url: string,
  method: "POST" | "PUT",
  body: Record<string, unknown>,
) {
  const id = crypto.randomUUID();
  await queuePwaAction({
    id,
    ownerKey,
    url,
    method,
    body,
    createdAt: new Date().toISOString(),
  });
  window.dispatchEvent(new Event("schooldb:offline-queue-changed"));
}

export function OfflineOperationsWorkbench({
  ownerKey,
  snapshot,
  onQueued,
}: {
  ownerKey: string;
  snapshot: PwaOfflineSnapshot;
  onQueued: () => void;
}) {
  const capabilities = new Set(snapshot.capabilities ?? []);
  const sessions = (snapshot.attendance as AttendanceSession[]).filter(
    (session) => Array.isArray(session.records),
  );
  const students = snapshot.students as StaffStudent[];

  if (!capabilities.size) return null;

  return (
    <section className="space-y-4 rounded-3xl border border-indigo-100 bg-white/95 p-5 shadow-sm">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">
          Offline workbench
        </p>
        <h2 className="mt-1 text-xl font-bold text-slate-950">
          Continue essential work
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Changes stay only on this device until SchoolDB reconnects and verifies your access.
        </p>
      </div>

      {capabilities.has("ATTENDANCE") && sessions.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-slate-900">Today&apos;s attendance</h3>
          {sessions.map((session) => (
            <OfflineAttendanceSession
              key={session.id}
              ownerKey={ownerKey}
              session={session}
              onQueued={onQueued}
            />
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {capabilities.has("HOMEWORK") && (
          <OfflineHomeworkForm
            ownerKey={ownerKey}
            students={students}
            onQueued={onQueued}
          />
        )}
        {capabilities.has("VISITORS") && (
          <OfflineVisitorForm ownerKey={ownerKey} onQueued={onQueued} />
        )}
        {capabilities.has("PICKUP") && (
          <OfflinePickupForm
            ownerKey={ownerKey}
            students={students}
            onQueued={onQueued}
          />
        )}
      </div>
    </section>
  );
}

function OfflineAttendanceSession({
  ownerKey,
  session,
  onQueued,
}: {
  ownerKey: string;
  session: AttendanceSession;
  onQueued: () => void;
}) {
  const original = session.records ?? [];
  const [records, setRecords] = useState(original);
  const [savedRecords, setSavedRecords] = useState(original);
  const [saving, setSaving] = useState(false);

  async function save() {
    const changes = records
      .filter((record) => {
        const before = savedRecords.find((item) => item.studentId === record.studentId);
        return before?.status !== record.status || before?.remarks !== record.remarks;
      })
      .map(({ studentId, status, remarks }) => ({ studentId, status, remarks: remarks ?? "" }));
    if (!changes.length) {
      toast.info("No attendance changes to save.");
      return;
    }
    setSaving(true);
    try {
      await queue(
        ownerKey,
        `/api/v1/attendance/session/${session.id}/correction`,
        "POST",
        { changes },
      );
      setSavedRecords(records);
      onQueued();
      toast.success("Attendance saved on this device.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border bg-slate-50/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-semibold">
          {[session.class?.name, session.section?.name].filter(Boolean).join(" - ") || "Attendance session"}
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={session.locked || saving}
          onClick={() => setRecords((current) => current.map((record) => ({ ...record, status: "PRESENT" })))}
        >
          Mark all present
        </Button>
      </div>
      <div className="mt-3 max-h-72 divide-y overflow-y-auto rounded-xl border bg-white">
        {records.map((record) => (
          <label key={record.studentId} className="flex items-center gap-3 p-3 text-sm">
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{record.student?.fullName || record.student?.admissionNo || "Student"}</span>
              <span className="block text-xs text-slate-500">{record.student?.admissionNo}</span>
            </span>
            <select
              className="h-9 rounded-lg border bg-white px-2 text-xs font-semibold"
              value={record.status}
              disabled={session.locked}
              onChange={(event) => setRecords((current) => current.map((item) => item.studentId === record.studentId ? { ...item, status: event.target.value as AttendanceRecord["status"] } : item))}
            >
              <option value="PRESENT">Present</option>
              <option value="ABSENT">Absent</option>
              <option value="LATE">Late</option>
              <option value="LEAVE">Leave</option>
            </select>
          </label>
        ))}
      </div>
      <Button type="button" className="mt-3" disabled={session.locked || saving} onClick={() => void save()}>
        <Save className="size-4" /> {session.locked ? "Session locked" : saving ? "Saving…" : "Save attendance offline"}
      </Button>
    </div>
  );
}

function OfflineHomeworkForm({ ownerKey, students, onQueued }: { ownerKey: string; students: StaffStudent[]; onQueued: () => void }) {
  const options = useMemo(() => {
    const found = new Map<string, { classId: string; sectionId: string; label: string }>();
    for (const student of students) {
      const enrollment = student.enrollments?.[0];
      const classId = enrollment?.class?.id;
      const sectionId = enrollment?.section?.id;
      if (!classId || !sectionId) continue;
      found.set(`${classId}:${sectionId}`, {
        classId,
        sectionId,
        label: `${enrollment.class?.name ?? "Class"} - ${enrollment.section?.name ?? "Section"}`,
      });
    }
    return [...found.values()].sort((left, right) => left.label.localeCompare(right.label));
  }, [students]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const target = options.find((option) => `${option.classId}:${option.sectionId}` === values.get("target"));
    if (!target) return toast.error("Choose a saved class and section.");
    await queue(ownerKey, "/api/v1/homework", "POST", {
      classId: target.classId,
      sectionId: target.sectionId,
      title: String(values.get("title") || ""),
      description: String(values.get("description") || ""),
      assignedDate: String(values.get("assignedDate") || ""),
      dueDate: String(values.get("dueDate") || ""),
      active: true,
    });
    form.reset();
    onQueued();
    toast.success("Homework saved on this device.");
  }

  const today = new Date().toISOString().slice(0, 10);
  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-3 rounded-2xl border p-4">
      <h3 className="flex items-center gap-2 font-semibold"><BookOpen className="size-4 text-indigo-600" />Create homework</h3>
      <select name="target" required className="h-10 w-full rounded-xl border bg-white px-3 text-sm">
        <option value="">Choose class and section</option>
        {options.map((option) => <option key={`${option.classId}:${option.sectionId}`} value={`${option.classId}:${option.sectionId}`}>{option.label}</option>)}
      </select>
      <Input name="title" required minLength={2} maxLength={200} placeholder="Homework title" />
      <Textarea name="description" maxLength={2000} placeholder="Instructions" />
      <div className="grid grid-cols-2 gap-2">
        <Input name="assignedDate" type="date" defaultValue={today} required />
        <Input name="dueDate" type="date" min={today} />
      </div>
      <Button type="submit" className="w-full">Save homework offline</Button>
    </form>
  );
}

function OfflineVisitorForm({ ownerKey, onQueued }: { ownerKey: string; onQueued: () => void }) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    await queue(ownerKey, "/api/v1/operations", "POST", { action: "CHECK_IN_VISITOR", data: values });
    form.reset();
    onQueued();
    toast.success("Visitor check-in saved on this device.");
  }
  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-3 rounded-2xl border p-4">
      <h3 className="flex items-center gap-2 font-semibold"><DoorOpen className="size-4 text-cyan-600" />Visitor check-in</h3>
      <Input name="visitorName" required minLength={2} maxLength={160} placeholder="Visitor name" />
      <Input name="phone" type="tel" required minLength={7} maxLength={24} placeholder="Mobile number" />
      <Input name="purpose" required minLength={2} maxLength={300} placeholder="Purpose" />
      <Input name="personToMeet" maxLength={160} placeholder="Person to meet" />
      <Button type="submit" className="w-full">Save check-in offline</Button>
    </form>
  );
}

function OfflinePickupForm({ ownerKey, students, onQueued }: { ownerKey: string; students: StaffStudent[]; onQueued: () => void }) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    await queue(ownerKey, "/api/v1/operations", "POST", {
      action: "AUTHORIZE_PICKUP",
      data: { ...values, recurring: false },
    });
    form.reset();
    onQueued();
    toast.success("Pickup authorization saved on this device.");
  }
  const today = new Date().toISOString().slice(0, 10);
  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-3 rounded-2xl border p-4">
      <h3 className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-4 text-violet-600" />Pickup authorization</h3>
      <select name="studentId" required className="h-10 w-full rounded-xl border bg-white px-3 text-sm">
        <option value="">Choose student</option>
        {students.map((student) => <option key={student.id} value={student.id}>{student.fullName || student.admissionNo} · {student.admissionNo}</option>)}
      </select>
      <Input name="authorizedName" required minLength={2} maxLength={160} placeholder="Authorized person" />
      <Input name="relationship" required minLength={2} maxLength={80} placeholder="Relationship" />
      <Input name="phone" required type="tel" minLength={7} maxLength={24} placeholder="Mobile number" />
      <div className="grid grid-cols-2 gap-2">
        <Input name="validFrom" type="date" defaultValue={today} required />
        <Input name="validUntil" type="date" min={today} />
      </div>
      <Button type="submit" className="w-full">Save authorization offline</Button>
    </form>
  );
}
