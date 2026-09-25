"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Cake,
  CalendarDays,
  Gift,
  Loader2,
  Send,
  Sparkles,
  PartyPopper,
  Users,
  Clock3,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type BirthdayStudent = {
  id: string;
  admissionNo: string;
  fullName: string | null;
  dob: string;
  imageUrl: string | null;
  whatsappOptIn: boolean;
  birthdayMonth: number;
  birthdayDay: number;
  nextBirthday: string;
  ageTurning: number;
  wishStatus: {
    status: string;
    sentCount: number;
    deliveredCount: number;
    readCount: number;
    failedCount: number;
  } | null;
  enrollments: Array<{
    class: { name: string };
    section: { name: string };
  }>;
};

type ResponseData = {
  birthdays: BirthdayStudent[];
  next7: BirthdayStudent[];
  thisMonth: BirthdayStudent[];
  total: number;
};

const EMPTY: ResponseData = {
  birthdays: [],
  next7: [],
  thisMonth: [],
  total: 0,
};

function birthdayDate(student: BirthdayStudent) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
  }).format(new Date(student.nextBirthday));
}

function StudentCard({
  student,
  showDate = false,
  onWish,
  sending = false,
}: {
  student: BirthdayStudent;
  showDate?: boolean;
  onWish?: (student: BirthdayStudent) => void;
  sending?: boolean;
}) {
  const enrollment = student.enrollments[0];

  return (
    <Link href={`students/${student.id}`} className="group block h-full">
      <Card className="relative h-full overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-white via-white to-violet-50/45 shadow-[0_8px_24px_rgba(15,23,42,0.04)] transition-all duration-200 before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-gradient-to-r before:from-violet-500 before:via-fuchsia-400 before:to-amber-300 group-hover:-translate-y-0.5 group-hover:border-violet-200 group-hover:shadow-[0_16px_36px_rgba(124,58,237,0.12)]">
        <CardContent className="flex items-center gap-4 p-4 sm:p-5">
          {student.imageUrl ? (
            <img
              src={student.imageUrl}
              alt=""
              className="size-14 rounded-2xl object-cover ring-1 ring-slate-200"
            />
          ) : (
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 via-fuchsia-50 to-amber-50 text-xl font-bold text-violet-700 ring-1 ring-violet-100">
              {student.fullName?.charAt(0) || "S"}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-bold tracking-tight text-slate-900">
                {student.fullName || "Unnamed Student"}
              </p>
              {showDate && (
                <Badge variant="outline" className="rounded-full border-fuchsia-100 bg-fuchsia-50/80 text-[10px] font-bold text-fuchsia-700">{birthdayDate(student)}</Badge>
              )}
            </div>

            <p className="mt-1 text-xs font-medium text-slate-500">
              {student.admissionNo}
              {enrollment
                ? ` · ${enrollment.class.name} - ${enrollment.section.name}`
                : ""}
              {" · Turns "}
              {student.ageTurning}
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              {student.whatsappOptIn ? (
                <Badge variant="secondary" className="rounded-full bg-emerald-50 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-50">
                  <CheckCircle2 className="mr-1 size-3" />
                  WhatsApp enabled
                </Badge>
              ) : (
                <Badge variant="outline" className="rounded-full text-[10px] font-medium text-slate-500">WhatsApp not opted in</Badge>
              )}
              {student.wishStatus && (
                <Badge variant="outline" className="rounded-full text-[10px] font-semibold">{student.wishStatus.status}</Badge>
              )}
            </div>
          </div>

          {onWish && (
            <button
              type="button"
              disabled={!student.whatsappOptIn || sending}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onWish(student);
              }}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-violet-200 bg-gradient-to-r from-violet-600 to-indigo-600 px-3 text-xs font-bold text-white shadow-sm transition-all hover:from-violet-700 hover:to-indigo-700 hover:shadow-md disabled:opacity-50"
            >
              {sending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Send className="size-3.5" />
              )}
              {student.wishStatus ? "Retry" : "Send Wish"}
            </button>
          )}

          {!onWish && <ChevronRight className="size-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-fuchsia-500" />}
        </CardContent>
      </Card>
    </Link>
  );
}

export default function BirthdaysPage() {
  const [data, setData] = useState<ResponseData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);

  async function load() {
    try {
      const response = await fetch("/api/v1/birthdays", {
        cache: "no-store",
      });
      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.message || "Failed to load birthdays.");
      }

      setData(json.data);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load birthdays.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Initial client-side fetch. The async loader owns the loading/data state updates.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  async function sendWish(student: BirthdayStudent) {
    setSendingId(student.id);

    try {
      const response = await fetch(
        `/api/v1/birthdays/${student.id}/wish`,
        { method: "POST" },
      );
      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.message || "Unable to send birthday wish.");
      }

      toast.success(json.message || "Birthday wish processed.");
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to send birthday wish.",
      );
    } finally {
      setSendingId(null);
    }
  }

  return (
    <div className="space-y-6 p-4 pb-10 sm:p-6">
      <PageHeader
        title="Birthdays"
        description="Today's celebrations and upcoming student birthdays."
      />

      <section className="relative overflow-hidden rounded-3xl border border-violet-100 bg-gradient-to-br from-white via-violet-50/70 to-amber-50/50 px-5 py-6 shadow-[0_16px_45px_rgba(15,23,42,0.06)] sm:px-6 md:px-8 md:py-7">
        <div className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-fuchsia-400/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 size-64 rounded-full bg-amber-300/20 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 via-fuchsia-500 to-amber-400 text-white shadow-[0_10px_25px_rgba(168,85,247,0.24)]">
              <PartyPopper className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="size-3 text-indigo-500" />
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-600">
                  Student Celebrations
                </p>
              </div>
              <h2 className="mt-2 text-xl font-bold tracking-[-0.025em] text-slate-950 md:text-2xl">
                Make every birthday feel special
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                See today&apos;s celebrations, plan upcoming wishes, and keep birthday communication in one polished workspace.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-violet-100 bg-white/90 px-4 py-3 shadow-[0_10px_30px_rgba(79,70,229,0.06)]">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-50 to-amber-50 text-violet-600 ring-1 ring-violet-100">
              <Cake className="size-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Birthday Records</p>
              <p className="mt-0.5 text-sm font-semibold text-slate-800">
                {loading ? "Loading..." : `${data.total} students`}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="rounded-2xl border border-violet-100 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Today</p>
              <p className="mt-1 text-3xl font-bold tracking-tight text-slate-950">{loading ? "—" : data.birthdays.length}</p>
              <p className="mt-1 text-xs text-slate-500">Celebrating today</p>
            </div>
            <div className="flex size-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 ring-1 ring-violet-100">
              <Cake className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-blue-100 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Next 7 Days</p>
              <p className="mt-1 text-3xl font-bold tracking-tight text-slate-950">{loading ? "—" : data.next7.length}</p>
              <p className="mt-1 text-xs text-slate-500">Coming up soon</p>
            </div>
            <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
              <Clock3 className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-amber-100 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">This Month</p>
              <p className="mt-1 text-3xl font-bold tracking-tight text-slate-950">{loading ? "—" : data.thisMonth.length}</p>
              <p className="mt-1 text-xs text-slate-500">Monthly celebrations</p>
            </div>
            <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-amber-100">
              <CalendarDays className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex min-h-52 items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 size-4 animate-spin" />
          Loading birthdays...
        </div>
      ) : (
        <>
          <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_12px_34px_rgba(15,23,42,0.05)]">
            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-5 md:px-7">
              <div className="flex size-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600 ring-1 ring-violet-100"><PartyPopper className="size-4" /></div>
              <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-600">Celebrate Today</p>
              <h2 className="mt-0.5 text-lg font-bold text-slate-950">Today&apos;s Birthdays</h2>
              <p className="text-xs text-slate-500">Students celebrating today.</p></div>
            </div>
            <div className="p-4 md:p-6">
            {data.birthdays.length ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {data.birthdays.map((student) => (
                  <StudentCard
                    key={student.id}
                    student={student}
                    onWish={sendWish}
                    sending={sendingId === student.id}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex min-h-36 flex-col items-center justify-center">
                  <Gift className="size-8 text-violet-400" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    No birthdays today.
                  </p>
                </CardContent>
              </Card>
            )}
            </div>
          </section>

          <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_12px_34px_rgba(15,23,42,0.05)]">
            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-5 md:px-7">
              <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100"><Clock3 className="size-4" /></div>
              <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">Coming Up</p>
              <h2 className="mt-0.5 text-lg font-bold text-slate-950">Next 7 Days</h2>
              <p className="text-xs text-slate-500">Upcoming birthdays after today.</p></div>
            </div>
            <div className="p-4 md:p-6">
            {data.next7.length ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {data.next7.map((student) => (
                  <StudentCard
                    key={student.id}
                    student={student}
                    showDate
                  />
                ))}
              </div>
            ) : (
              <div className="flex min-h-28 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 text-center"><Clock3 className="mb-2 size-6 text-slate-300" /><p className="text-sm text-slate-500">No birthdays in the next 7 days.</p></div>
            )}
            </div>
          </section>

          <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_12px_34px_rgba(15,23,42,0.05)]">
            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-5 md:px-7">
              <div className="flex size-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-100"><Users className="size-4" /></div>
              <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-600">Monthly View</p>
              <h2 className="mt-0.5 text-lg font-bold text-slate-950">This Month</h2>
              <p className="text-xs text-slate-500">All student birthdays in the current month.</p></div>
            </div>
            <div className="p-4 md:p-6">
            {data.thisMonth.length ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {data.thisMonth.map((student) => (
                  <StudentCard
                    key={student.id}
                    student={student}
                    showDate
                  />
                ))}
              </div>
            ) : (
              <div className="flex min-h-28 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 text-center"><Gift className="mb-2 size-6 text-slate-300" /><p className="text-sm text-slate-500">No birthdays this month.</p></div>
            )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
