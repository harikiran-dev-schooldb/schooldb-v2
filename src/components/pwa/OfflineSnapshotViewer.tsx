"use client";

import { BookOpen, Bell, CalendarDays, Clock3, DoorOpen, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useState } from "react";

import { activePwaOwner, listPwaActions, readPwaSnapshot, type PwaOfflineSnapshot } from "@/lib/pwa-storage";
import { OfflineOperationsWorkbench } from "@/components/pwa/OfflineOperationsWorkbench";

export function OfflineSnapshotViewer() {
  const [snapshot, setSnapshot] = useState<PwaOfflineSnapshot | null>(null);
  const [pendingActions, setPendingActions] = useState(0);
  const [ownerKey, setOwnerKey] = useState<string | null>(null);

  useEffect(() => {
    const ownerKey = activePwaOwner();
    if (!ownerKey) return;
    void Promise.all([readPwaSnapshot(ownerKey), listPwaActions(ownerKey)])
      .then(([saved, actions]) => {
        setOwnerKey(ownerKey);
        setSnapshot(saved);
        setPendingActions(actions.length);
      })
      .catch(() => undefined);
  }, []);

  if (!snapshot) return null;
  const homework = snapshot.homework.slice(0, 6) as Array<{ id?: string; title?: string; dueDate?: string; subject?: { name?: string } }>;
  const notifications = snapshot.notifications.slice(0, 6) as Array<{ id?: string; title?: string; body?: string; publishedAt?: string }>;

  return (
    <section className="mt-6 w-full max-w-3xl space-y-4 text-left">
      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/80 p-4">
        <p className="font-semibold text-indigo-950">Saved from {snapshot.school.name}</p>
        <p className="mt-1 text-xs text-indigo-700">Last synced {new Date(snapshot.generatedAt).toLocaleString("en-IN")}</p>
      </div>
      {pendingActions > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
          <p className="font-semibold">{pendingActions} pending change{pendingActions === 1 ? "" : "s"}</p>
          <p className="mt-1 text-xs text-amber-800">SchoolDB will submit these automatically after the internet reconnects.</p>
        </div>
      )}
      {ownerKey && (
        <OfflineOperationsWorkbench
          ownerKey={ownerKey}
          snapshot={snapshot}
          onQueued={() => setPendingActions((count) => count + 1)}
        />
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <OfflineGroup icon={UserRound} title="Student directory" empty="No saved students">
          {snapshot.students.slice(0, 8).map((raw, index) => {
            const item = raw as { id?: string; admissionNo?: string; fullName?: string; enrollment?: { className?: string; sectionName?: string }; enrollments?: Array<{ class?: { name?: string }; section?: { name?: string } }> };
            const enrollment = item.enrollment;
            const staffEnrollment = item.enrollments?.[0];
            const className = enrollment?.className ?? staffEnrollment?.class?.name;
            const sectionName = enrollment?.sectionName ?? staffEnrollment?.section?.name;
            return <OfflineItem key={item.id ?? index} title={item.fullName ?? item.admissionNo ?? "Student"} detail={[item.admissionNo, className, sectionName].filter(Boolean).join(" · ")} />;
          })}
        </OfflineGroup>
        <OfflineGroup icon={BookOpen} title="Recent homework" empty="No saved homework">
          {homework.map((item, index) => <OfflineItem key={item.id ?? index} title={item.title ?? "Homework"} detail={`${item.subject?.name ?? "Subject"}${item.dueDate ? ` · Due ${new Date(item.dueDate).toLocaleDateString("en-IN")}` : ""}`} />)}
        </OfflineGroup>
        <OfflineGroup icon={Bell} title="Recent notifications" empty="No saved notifications">
          {notifications.map((item, index) => <OfflineItem key={item.id ?? index} title={item.title ?? "School update"} detail={item.body ?? ""} />)}
        </OfflineGroup>
        <OfflineGroup icon={Clock3} title="Timetable" empty="No saved timetable">
          {snapshot.timetable.slice(0, 6).map((raw, index) => {
            const item = raw as { id?: string; day?: string; period?: { name?: string }; teacherAllocation?: { subject?: { name?: string } } };
            return <OfflineItem key={item.id ?? index} title={item.teacherAllocation?.subject?.name ?? "Class"} detail={`${item.day ?? ""} · ${item.period?.name ?? ""}`} />;
          })}
        </OfflineGroup>
        <OfflineGroup icon={CalendarDays} title="Attendance" empty="No saved attendance">
          {snapshot.attendance.slice(0, 6).map((raw, index) => {
            const item = raw as { id?: string; status?: string; session?: { attendanceDate?: string }; attendanceDate?: string; class?: { name?: string }; section?: { name?: string }; records?: Array<{ status?: string }> };
            if (item.records) {
              const present = item.records.filter((record) => record.status === "PRESENT").length;
              return <OfflineItem key={item.id ?? index} title={[item.class?.name, item.section?.name].filter(Boolean).join(" - ") || "Attendance session"} detail={`${present} of ${item.records.length} present${item.attendanceDate ? ` · ${new Date(item.attendanceDate).toLocaleDateString("en-IN")}` : ""}`} />;
            }
            return <OfflineItem key={item.id ?? index} title={item.status ?? "Attendance"} detail={item.session?.attendanceDate ? new Date(item.session.attendanceDate).toLocaleDateString("en-IN") : ""} />;
          })}
        </OfflineGroup>
        <OfflineGroup icon={DoorOpen} title="Visitor register" empty="No saved visitors">
          {(snapshot.visitors ?? []).slice(0, 6).map((raw, index) => {
            const item = raw as { id?: string; visitorName?: string; purpose?: string; status?: string };
            return <OfflineItem key={item.id ?? index} title={item.visitorName ?? "Visitor"} detail={[item.purpose, item.status?.replaceAll("_", " ")].filter(Boolean).join(" · ")} />;
          })}
        </OfflineGroup>
        <OfflineGroup icon={ShieldCheck} title="Pickup authorizations" empty="No saved pickup authorizations">
          {(snapshot.pickupAuthorizations ?? []).slice(0, 6).map((raw, index) => {
            const item = raw as { id?: string; pickupCode?: string; authorizedName?: string; status?: string; student?: { fullName?: string } };
            return <OfflineItem key={item.id ?? index} title={item.student?.fullName ?? "Student pickup"} detail={[item.authorizedName, item.pickupCode, item.status].filter(Boolean).join(" · ")} />;
          })}
        </OfflineGroup>
      </div>
    </section>
  );
}

function OfflineGroup({ icon: Icon, title, empty, children }: { icon: typeof Bell; title: string; empty: string; children: React.ReactNode }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return <div className="rounded-2xl border bg-white p-4"><h2 className="flex items-center gap-2 font-semibold"><Icon className="size-4 text-indigo-600" />{title}</h2><div className="mt-3 divide-y">{hasChildren ? children : <p className="py-3 text-sm text-slate-500">{empty}</p>}</div></div>;
}

function OfflineItem({ title, detail }: { title: string; detail: string }) {
  return <div className="py-3"><p className="text-sm font-semibold text-slate-900">{title}</p><p className="mt-1 line-clamp-2 text-xs text-slate-500">{detail}</p></div>;
}
