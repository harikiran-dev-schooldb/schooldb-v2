import Link from "next/link";
import { CalendarCheck, ClipboardList, Clock3, GraduationCap } from "lucide-react";

import { requireCurrentTeacher, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function TeacherDashboardPage({
  params,
}: {
  params: Promise<{ schoolSlug: string }>;
}) {
  const { schoolSlug } = await params;
  const membership = await requireRole(["TEACHER"], schoolSlug);
  const teacher = await requireCurrentTeacher(membership.schoolId);

  const academicYear = await prisma.academicYear.findFirst({
    where: { schoolId: membership.schoolId, active: true },
    orderBy: { startDate: "desc" },
    select: { id: true, name: true },
  });

  const allocations = academicYear
    ? await prisma.teacherAllocation.findMany({
        where: {
          schoolId: membership.schoolId,
          academicYearId: academicYear.id,
          teacherId: teacher.id,
          active: true,
        },
        orderBy: [
          { class: { displayOrder: "asc" } },
          { section: { displayOrder: "asc" } },
        ],
        select: {
          id: true,
          class: { select: { name: true } },
          section: { select: { name: true } },
          subject: { select: { name: true } },
        },
      })
    : [];

  const links = [
    {
      title: "Mark Attendance",
      description: "Open attendance for your assigned classes and sections.",
      href: `/${schoolSlug}/attendance`,
      icon: CalendarCheck,
    },
    {
      title: "Homework",
      description: "Create and review homework for your assigned classes.",
      href: `/${schoolSlug}/homework`,
      icon: ClipboardList,
    },
    {
      title: "Exams & Results",
      description: "Enter marks for the subjects allocated to you.",
      href: `/${schoolSlug}/exams`,
      icon: GraduationCap,
    },
    {
      title: "My Timetable",
      description: "View your teaching schedule.",
      href: `/${schoolSlug}/timetable/teacher`,
      icon: Clock3,
    },
  ];

  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/60 to-violet-50/60 p-6 shadow-sm sm:p-8">
        <div className="absolute -right-20 -top-20 size-56 rounded-full bg-violet-200/30 blur-3xl" />
        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">
            Teacher workspace
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Welcome, {teacher.fullName}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            {academicYear
              ? `${academicYear.name} · Your classes, attendance, homework and results in one place.`
              : "Your teaching workspace. No active academic year is configured yet."}
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {links.map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <item.icon className="size-5" />
            </span>
            <h2 className="mt-4 font-bold text-slate-900">{item.title}</h2>
            <p className="mt-1 text-sm leading-5 text-slate-500">{item.description}</p>
          </Link>
        ))}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">
              My allocations
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">Assigned classes & subjects</h2>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {allocations.length} allocations
          </span>
        </div>

        {allocations.length === 0 ? (
          <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
            No active teaching allocations found.
          </p>
        ) : (
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {allocations.map((allocation) => (
              <div key={allocation.id} className="rounded-2xl border border-slate-200 p-4">
                <p className="font-bold text-slate-900">
                  {allocation.class.name} · {allocation.section.name}
                </p>
                <p className="mt-1 text-sm text-slate-500">{allocation.subject.name}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
