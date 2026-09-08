import { BusFront, Clock3, MapPin, Navigation, Phone, Route, ShieldCheck, UserRound } from "lucide-react";

import { SelfServiceEmptyState, SelfServicePage } from "@/components/self-service/SelfServicePage";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireStudentAccess } from "@/lib/student-access";

export default async function StudentTransportPage({ params }: { params: Promise<{ schoolSlug: string; studentId: string }> }) {
  const { schoolSlug, studentId } = await params;
  const { membership, enrollment } = await requireStudentAccess(schoolSlug, studentId);
  const assignment = enrollment ? await prisma.studentTransportAssignment.findFirst({
    where: {
      schoolId: membership.schoolId,
      studentEnrollmentId: enrollment.id,
      active: true,
      route: { active: true },
      stop: { active: true },
    },
    orderBy: { createdAt: "desc" },
    select: {
      pickupEnabled: true,
      dropEnabled: true,
      startDate: true,
      notes: true,
      route: {
        select: {
          code: true,
          name: true,
          pickupStart: true,
          dropStart: true,
          vehicle: {
            select: {
              registrationNo: true,
              name: true,
              type: true,
              driverName: true,
              driverPhone: true,
              attendantName: true,
              attendantPhone: true,
            },
          },
          stops: {
            where: { active: true },
            orderBy: { sequence: "asc" },
            select: { id: true, name: true, sequence: true, pickupTime: true, dropTime: true },
          },
        },
      },
      stop: { select: { id: true, name: true, pickupTime: true, dropTime: true, monthlyFee: true } },
    },
  }) : null;

  return (
    <SelfServicePage title="School transport" description="Your assigned vehicle, boarding stop and daily travel timing.">
      {!assignment ? (
        <Card><CardContent className="p-0"><SelfServiceEmptyState icon={BusFront} title="No active transport assignment" description="Your school transport details will appear here after the office assigns a route and boarding stop." className="min-h-64" /></CardContent></Card>
      ) : (
        <div className="space-y-5">
          <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-950 via-indigo-950 to-blue-900 p-6 text-white shadow-[0_26px_65px_rgba(30,41,99,0.22)] sm:p-8">
            <div className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-cyan-400/20 blur-3xl" />
            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-cyan-200"><Navigation className="size-4" />Your daily journey</p><h2 className="mt-3 text-3xl font-black tracking-[-0.04em]">{assignment.route.name}</h2><div className="mt-3 flex flex-wrap gap-2"><Badge className="border-white/20 bg-white/10 text-white">{assignment.route.code}</Badge><Badge className="border-white/20 bg-white/10 text-white">{assignment.pickupEnabled && assignment.dropEnabled ? "Pickup & drop" : assignment.pickupEnabled ? "Pickup only" : "Drop only"}</Badge></div></div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm"><p className="text-xs font-semibold text-indigo-100">Boarding stop</p><p className="mt-1 text-xl font-black">{assignment.stop.name}</p></div>
            </div>
          </section>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card><CardContent className="p-6"><div className="flex items-start gap-4"><div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><Clock3 className="size-5" /></div><div><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Daily timing</p><p className="mt-2 text-lg font-bold">Pickup {assignment.stop.pickupTime || "To be confirmed"}</p><p className="mt-1 text-sm text-muted-foreground">Drop {assignment.stop.dropTime || "To be confirmed"}</p>{assignment.stop.monthlyFee && <p className="mt-3 text-sm font-semibold text-indigo-700">₹{Number(assignment.stop.monthlyFee).toLocaleString("en-IN")} per month</p>}</div></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="flex items-start gap-4"><div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700"><BusFront className="size-5" /></div><div><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Assigned vehicle</p><p className="mt-2 text-lg font-bold">{assignment.route.vehicle?.name || assignment.route.vehicle?.registrationNo || "Vehicle to be assigned"}</p>{assignment.route.vehicle && <p className="mt-1 text-sm text-muted-foreground">{assignment.route.vehicle.registrationNo} · {assignment.route.vehicle.type.replaceAll("_", " ")}</p>}</div></div></CardContent></Card>
          </div>

          {assignment.route.vehicle && <Card><CardContent className="grid gap-5 p-6 sm:grid-cols-2"><Contact icon={UserRound} title="Driver" name={assignment.route.vehicle.driverName} phone={assignment.route.vehicle.driverPhone} />{assignment.route.vehicle.attendantName && <Contact icon={ShieldCheck} title="Attendant" name={assignment.route.vehicle.attendantName} phone={assignment.route.vehicle.attendantPhone} />}</CardContent></Card>}

          <Card><CardContent className="p-6"><div className="flex items-center gap-3"><Route className="size-5 text-indigo-600" /><div><h3 className="font-bold">Route stops</h3><p className="text-sm text-muted-foreground">Your boarding point is highlighted.</p></div></div><div className="mt-6 space-y-0">{assignment.route.stops.map((stop, index) => <div key={stop.id} className="relative flex gap-3 pb-5 last:pb-0">{index < assignment.route.stops.length - 1 && <div className="absolute left-[13px] top-7 h-[calc(100%-8px)] w-px bg-indigo-200" />}<div className={`relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${stop.id === assignment.stop.id ? "bg-indigo-600 text-white ring-4 ring-indigo-100" : "bg-slate-100 text-slate-500"}`}>{stop.sequence}</div><div className="flex min-w-0 flex-1 items-start justify-between gap-3"><div><p className={stop.id === assignment.stop.id ? "font-bold text-indigo-700" : "font-semibold"}>{stop.name}</p>{stop.id === assignment.stop.id && <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-indigo-600"><MapPin className="size-3" />Your stop</p>}</div><p className="text-xs text-muted-foreground">{stop.pickupTime || "—"}</p></div></div>)}</div></CardContent></Card>
          {assignment.notes && <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 text-sm leading-6 text-indigo-950">{assignment.notes}</div>}
        </div>
      )}
    </SelfServicePage>
  );
}

function Contact({ icon: Icon, title, name, phone }: { icon: typeof UserRound; title: string; name: string; phone: string | null }) {
  return <div className="flex gap-4"><div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600"><Icon className="size-5" /></div><div><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</p><p className="mt-1 font-bold">{name}</p>{phone && <a href={`tel:+91${phone}`} className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-indigo-600"><Phone className="size-3.5" />+91 {phone}</a>}</div></div>;
}
