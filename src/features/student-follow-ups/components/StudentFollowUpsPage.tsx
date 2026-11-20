"use client";

import { useId, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, ClipboardList, LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSchool } from "@/contexts/school-context";
import { isMemberRouteAllowed } from "@/lib/navigation-access";
import { isRouteAllowed } from "@/lib/route-access";
import {
  fetchFollowUpData,
  FOLLOW_UP_SOURCES,
  FOLLOW_UP_STATUSES,
  followUpOriginParams,
  followUpStudentName,
  formatFollowUpDate,
  type FollowUp,
  type FollowUpList,
  type FollowUpOptions,
  type FollowUpOrigin,
  type FollowUpStatus,
} from "../follow-up-ui";
import { useFollowUpData } from "../use-follow-up-data";

const followUpApi = "/api/v1/student-follow-ups";
const selectClassName = "h-11 w-full rounded-xl border border-input bg-card px-3 text-sm focus-visible:ring-4 focus-visible:ring-primary/15 sm:h-10";
const statusVariants = { OPEN: "warning", IN_PROGRESS: "info", COMPLETED: "success" } as const;

export function StudentFollowUpsPage({ schoolSlug, origin }: {
  schoolSlug: string;
  origin?: FollowUpOrigin;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<FollowUpStatus | "">("");
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const path = `/${schoolSlug}/student-follow-ups`;
  const query = new URLSearchParams({ page: String(page) });
  if (filter) query.set("status", filter);
  const result = useFollowUpData<FollowUpList>(`${followUpApi}?${query}`, revision);

  function created() {
    setFilter("");
    setPage(1);
    setRevision((value) => value + 1);
    router.replace(path, { scroll: false });
  }

  function refresh() {
    setRevision((value) => value + 1);
  }

  return (
    <div className="space-y-6 p-4 pb-10 sm:p-6">
      <PageHeader
        title="Student Follow-Ups"
        description="Assign next steps for students who need academic or attendance support."
      />

      {origin ? (
        <CreateFollowUp key={followUpOriginParams(origin).toString()} origin={origin} cancelHref={path} onCreated={created} />
      ) : (
        <ReportLinks schoolSlug={schoolSlug} />
      )}

      <section aria-labelledby="follow-up-list-heading" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="follow-up-list-heading" className="text-lg font-semibold">
            {result?.data?.isTeacher ? "My follow-ups" : "Follow-ups"}
            {result?.data && <span className="ml-2 text-sm font-normal text-muted-foreground">({result.data.total})</span>}
          </h2>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Label htmlFor="follow-up-status-filter">Status</Label>
            <select
              id="follow-up-status-filter"
              className={selectClassName}
              value={filter}
              onChange={(event) => {
                setFilter(event.target.value as FollowUpStatus | "");
                setPage(1);
                refresh();
              }}
            >
              <option value="">All statuses</option>
              {Object.entries(FOLLOW_UP_STATUSES).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {!result ? (
          <Card><CardContent className="p-6"><LoadingState>Loading follow-ups…</LoadingState></CardContent></Card>
        ) : result.error ? (
          <Card><CardContent className="p-6"><RequestError message={result.error} onRetry={refresh} /></CardContent></Card>
        ) : result.data ? (
          <>
            {result.data.followUps.length === 0 && (
              <Card>
                <CardContent className="flex items-start gap-3 p-5 text-sm">
                  <ClipboardList aria-hidden="true" className="mt-0.5 size-5 text-muted-foreground" />
                  <div>
                    <p className="font-semibold">No follow-ups {filter ? "with this status" : "yet"}.</p>
                    <p className="mt-1 text-muted-foreground">{filter ? "Choose another status to see more." : "Follow-ups created from the reports appear here."}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            <ul className="grid list-none gap-3" aria-label="Follow-ups">
              {result.data.followUps.map((followUp) => (
                <li key={followUp.id}>
                  <FollowUpCard followUp={followUp} onUpdated={refresh} canReassign={!result.data.isTeacher} />
                </li>
              ))}
            </ul>

            {(page > 1 || result.data.hasMore) && (
              <nav className="flex items-center justify-between gap-3" aria-label="Follow-up pages">
                <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => { setPage(page - 1); refresh(); }}>
                  <ArrowLeft aria-hidden="true" className="size-4" /> Previous
                </Button>
                <span className="text-sm text-muted-foreground">Page {result.data.page}</span>
                <Button type="button" variant="outline" size="sm" disabled={!result.data.hasMore} onClick={() => { setPage(page + 1); refresh(); }}>
                  Next <ArrowRight aria-hidden="true" className="size-4" />
                </Button>
              </nav>
            )}
          </>
        ) : null}
      </section>
    </div>
  );
}

function ReportLinks({ schoolSlug }: { schoolSlug: string }) {
  const { school, role, membership, teacherAccess } = useSchool();
  const reports = [
    { href: "failures", label: "Exam Failures", teacherAccess: teacherAccess?.resultAccess },
    { href: "attendance/reports/low", label: "Low Attendance", teacherAccess: teacherAccess?.attendanceAccess },
  ].filter((report) =>
    (role !== "TEACHER" || report.teacherAccess) &&
    isRouteAllowed(school, report.href) && isMemberRouteAllowed(membership, report.href),
  );

  if (reports.length === 0) return null;

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">To create a follow-up, open a report and choose a student.</p>
        <div className="flex flex-wrap gap-2">
          {reports.map((report) => (
            <Button asChild key={report.href} variant="outline" size="sm">
              <Link href={`/${schoolSlug}/${report.href}`}>{report.label}<ArrowRight className="size-4" aria-hidden="true" /></Link>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function CreateFollowUp({ origin, cancelHref, onCreated }: {
  origin: FollowUpOrigin;
  cancelHref: string;
  onCreated: () => void;
}) {
  const [revision, setRevision] = useState(0);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const id = useId();
  const result = useFollowUpData<FollowUpOptions>(`${followUpApi}/options?${followUpOriginParams(origin)}`, revision);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || submitted) return;
    const values = new FormData(event.currentTarget);
    const nextAction = String(values.get("nextAction") ?? "").trim();
    if (nextAction.length < 3) {
      setError("Enter a next action of at least 3 characters.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await fetchFollowUpData(followUpApi, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...origin,
          teacherId: values.get("teacherId"),
          dueDate: values.get("dueDate"),
          nextAction,
        }),
      });
      setSubmitted(true);
      toast.success("Follow-up created.");
      onCreated();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create the follow-up.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card id="create-follow-up" className="scroll-mt-24">
      <CardContent className="space-y-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Create follow-up</h2>
          <Button asChild variant="ghost" size="sm"><Link href={cancelHref}>Close form</Link></Button>
        </div>
        {!result ? <LoadingState>Loading student and teachers…</LoadingState> : result.error ? (
          <RequestError message={result.error} onRetry={() => setRevision((value) => value + 1)} />
        ) : result.data ? (
          <>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <p className="font-medium">{followUpStudentName(result.data.student)}</p>
              <p className="text-sm text-muted-foreground">{result.data.student.admissionNo}</p>
              <Badge variant="outline">{result.data.exam?.name ?? FOLLOW_UP_SOURCES[origin.source]}</Badge>
            </div>
            {result.data.teachers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No eligible teachers are assigned to this student’s section.</p>
            ) : (
              <form className="space-y-4" onSubmit={submit}>
                <fieldset disabled={saving || submitted} className="space-y-4">
                  <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor={`${id}-teacher`}>Assigned teacher</Label>
                      <select id={`${id}-teacher`} name="teacherId" className={selectClassName} required defaultValue={result.data.teachers.length === 1 ? result.data.teachers[0].id : ""}>
                        <option value="" disabled>Choose a teacher</option>
                        {result.data.teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.fullName}</option>)}
                      </select>
                    </div>
                    <DueDateField id={`${id}-due-date`} />
                  </div>
                  <NextActionField id={`${id}-next-action`} />
                </fieldset>
                {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
                <Button type="submit" disabled={saving || submitted}>{saving ? "Creating…" : "Create follow-up"}</Button>
              </form>
            )}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

function FollowUpCard({ followUp, onUpdated, canReassign }: {
  followUp: FollowUp;
  onUpdated: () => void;
  canReassign: boolean;
}) {
  const id = useId();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const studentName = followUpStudentName(followUp.student);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const values = new FormData(event.currentTarget);
    const nextAction = String(values.get("nextAction") ?? "").trim();
    if (nextAction.length < 3) {
      setError("Enter a next action of at least 3 characters.");
      return;
    }
    setSaving(true);
    setError("");
    const teacherId = values.get("teacherId");
    try {
      await fetchFollowUpData(`${followUpApi}/${encodeURIComponent(followUp.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: values.get("status"),
          dueDate: values.get("dueDate"),
          nextAction,
          ...(canReassign && teacherId ? { teacherId } : {}),
        }),
      });
      setEditing(false);
      toast.success("Follow-up updated.");
      onUpdated();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update the follow-up.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <h3 className="break-words font-semibold">{studentName}</h3>
              <Badge variant={statusVariants[followUp.status]}>{FOLLOW_UP_STATUSES[followUp.status]}</Badge>
            </div>
            <p className="mt-1 break-words text-sm text-muted-foreground">
              {[followUp.student.admissionNo, followUp.className, followUp.sectionName, followUp.exam?.name ?? FOLLOW_UP_SOURCES[followUp.source]].filter(Boolean).join(" · ")}
            </p>
          </div>
          {!editing && <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)} aria-label={`Edit follow-up for ${studentName}`}>Edit</Button>}
        </div>
        {editing ? (
          <form className="space-y-4 border-t pt-4" onSubmit={submit}>
            <fieldset disabled={saving} className="space-y-4">
              <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`${id}-status`}>Status</Label>
                  <select id={`${id}-status`} name="status" className={selectClassName} required defaultValue={followUp.status}>
                    {Object.entries(FOLLOW_UP_STATUSES).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                  </select>
                </div>
                <DueDateField id={`${id}-due-date`} value={followUp.dueDate} />
                {canReassign && <ReassignTeacherField id={`${id}-reassign`} followUp={followUp} />}
              </div>
              <NextActionField id={`${id}-next-action`} value={followUp.nextAction} />
            </fieldset>
            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" size="sm" disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
              <Button type="button" variant="ghost" size="sm" disabled={saving} onClick={() => { setEditing(false); setError(""); }}>Cancel</Button>
            </div>
          </form>
        ) : (
          <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-[1fr_10rem_2fr]">
            <div><dt className="text-xs text-muted-foreground">Assigned teacher</dt><dd className="break-words">{followUp.teacher.fullName}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Due date</dt><dd><time dateTime={followUp.dueDate}>{formatFollowUpDate(followUp.dueDate)}</time></dd></div>
            <div className="sm:col-span-2 lg:col-span-1"><dt className="text-xs text-muted-foreground">Next action</dt><dd className="whitespace-pre-wrap break-words">{followUp.nextAction}</dd></div>
          </dl>
        )}
      </CardContent>
    </Card>
  );
}

function ReassignTeacherField({ id, followUp }: { id: string; followUp: FollowUp }) {
  const context = followUpOriginParams({
    studentId: followUp.student.id,
    source: followUp.source,
    academicYearId: followUp.academicYearId,
    examId: followUp.exam?.id,
  });
  const result = useFollowUpData<FollowUpOptions>(`${followUpApi}/options?${context}`);
  const otherTeachers = (result?.data?.teachers ?? []).filter(({ id }) => id !== followUp.teacher.id);

  return (
    <div className="space-y-2 sm:col-span-2">
      <Label htmlFor={id}>Assigned teacher</Label>
      <select id={id} name="teacherId" className={selectClassName} disabled={otherTeachers.length === 0} defaultValue="">
        <option value="">Keep {followUp.teacher.fullName}</option>
        {otherTeachers.map((teacher) => <option value={teacher.id} key={teacher.id}>{teacher.fullName}</option>)}
      </select>
      {result?.error && <p className="text-xs text-muted-foreground">Reassignment unavailable. {result.error}</p>}
    </div>
  );
}

function DueDateField({ id, value }: { id: string; value?: string }) {
  return <div className="space-y-2"><Label htmlFor={id}>Due date</Label><Input id={id} name="dueDate" type="date" defaultValue={value} required /></div>;
}

function NextActionField({ id, value }: { id: string; value?: string }) {
  return <div className="max-w-2xl space-y-2"><Label htmlFor={id}>Next action</Label><Textarea id={id} name="nextAction" minLength={3} maxLength={500} defaultValue={value} placeholder="Meet with the student to agree on a revision plan." required /></div>;
}

function LoadingState({ children }: { children: string }) {
  return <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status"><LoaderCircle className="size-4 animate-spin" aria-hidden="true" />{children}</p>;
}

function RequestError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="flex flex-wrap items-center gap-3"><p className="text-sm text-destructive" role="alert">{message}</p><Button type="button" variant="outline" size="sm" onClick={onRetry}>Try again</Button></div>;
}
