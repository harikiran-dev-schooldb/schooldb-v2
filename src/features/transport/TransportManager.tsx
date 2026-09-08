"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  BusFront,
  CircleParking,
  MapPin,
  Navigation,
  Phone,
  Plus,
  Route,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";

import { SearchableStudentSelect } from "@/components/common/select/SearchableStudentSelect";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

export type TransportDashboardData = {
  vehicles: Array<{
    id: string;
    registrationNo: string;
    name: string | null;
    type: string;
    capacity: number;
    driverName: string;
    driverPhone: string;
    attendantName: string | null;
    attendantPhone: string | null;
    active: boolean;
    _count: { routes: number };
  }>;
  routes: Array<{
    id: string;
    code: string;
    name: string;
    pickupStart: string | null;
    dropStart: string | null;
    active: boolean;
    vehicle: { id: string; registrationNo: string; name: string | null } | null;
    stops: Array<{
      id: string;
      name: string;
      sequence: number;
      pickupTime: string | null;
      dropTime: string | null;
      monthlyFee: string | null;
      active: boolean;
    }>;
    _count: { assignments: number };
  }>;
  assignments: Array<{
    id: string;
    pickupEnabled: boolean;
    dropEnabled: boolean;
    startDate: string;
    notes: string | null;
    studentEnrollment: {
      student: { id: string; admissionNo: string; fullName: string | null };
      class: { name: string };
      section: { name: string };
    };
    route: {
      id: string;
      code: string;
      name: string;
      vehicle: { registrationNo: string } | null;
    };
    stop: {
      id: string;
      name: string;
      pickupTime: string | null;
      dropTime: string | null;
    };
  }>;
};

async function saveTransport(action: string, data: unknown) {
  const response = await fetch("/api/v1/transport", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, data }),
  });
  const result = await response.json();
  if (!response.ok || !result.success)
    throw new Error(result.message || "Unable to save transport details.");
  return result.data;
}

function formObject(form: HTMLFormElement) {
  return Object.fromEntries(new FormData(form));
}

export function TransportManager({
  data,
  academicYearId,
}: {
  data: TransportDashboardData;
  academicYearId: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const activeVehicles = useMemo(() => data.vehicles.filter((vehicle) => vehicle.active), [data.vehicles]);
  const activeRoutes = useMemo(() => data.routes.filter((route) => route.active), [data.routes]);
  const [stopRouteId, setStopRouteId] = useState(activeRoutes[0]?.id ?? "");
  const [assignmentRouteId, setAssignmentRouteId] = useState(
    activeRoutes[0]?.id ?? "",
  );
  const [assignmentStopId, setAssignmentStopId] = useState(
    activeRoutes[0]?.stops.find((stop) => stop.active)?.id ?? "",
  );
  const [studentId, setStudentId] = useState("");
  const [pickupEnabled, setPickupEnabled] = useState(true);
  const [dropEnabled, setDropEnabled] = useState(true);

  const assignmentStops = useMemo(
    () =>
      activeRoutes
        .find((route) => route.id === assignmentRouteId)
        ?.stops.filter((stop) => stop.active) ?? [],
    [activeRoutes, assignmentRouteId],
  );

  function submit(
    action: string,
    form: HTMLFormElement,
    extra: Record<string, unknown> = {},
  ) {
    startTransition(async () => {
      try {
        await saveTransport(action, { ...formObject(form), ...extra });
        toast.success("Transport details saved.");
        form.reset();
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to save transport details.",
        );
      }
    });
  }

  const occupiedSeats = data.assignments.length;
  const totalSeats = activeVehicles.reduce(
    (total, vehicle) => total + vehicle.capacity,
    0,
  );

  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-slate-950 via-indigo-950 to-blue-900 p-6 text-white shadow-[0_30px_80px_rgba(30,41,99,0.24)] sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-20 size-72 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 size-64 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-end">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-200">
              <Navigation className="size-4" />
              Safe journeys, clearly managed
            </div>
            <h2 className="mt-3 max-w-2xl text-3xl font-black tracking-[-0.04em]">
              Every route, vehicle and student in one transport desk.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-indigo-100/80">
              Build stops in travel order, assign responsible staff, and give
              families the pickup information they need.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Metric
              icon={BusFront}
              value={activeVehicles.length}
              label="Vehicles"
            />
            <Metric icon={Route} value={activeRoutes.length} label="Routes" />
            <Metric icon={UsersRound} value={occupiedSeats} label="Students" />
          </div>
        </div>
        <div className="relative mt-6 flex flex-wrap items-center gap-2 border-t border-white/10 pt-5 text-xs text-indigo-100">
          <ShieldCheck className="size-4 text-emerald-300" />{" "}
          {totalSeats
            ? `${Math.max(totalSeats - occupiedSeats, 0)} of ${totalSeats} seats available`
            : "Add a vehicle to begin capacity tracking"}
        </div>
      </section>

      <Tabs defaultValue="fleet">
        <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
          <TabsTrigger value="fleet">
            <BusFront className="mr-2 size-4" />
            Fleet
          </TabsTrigger>
          <TabsTrigger value="routes">
            <Route className="mr-2 size-4" />
            Routes & stops
          </TabsTrigger>
          <TabsTrigger value="students">
            <UsersRound className="mr-2 size-4" />
            Student assignments
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="fleet"
          className="grid gap-5 xl:grid-cols-[0.9fr_1.4fr]"
        >
          <Card>
            <CardHeader>
              <CardTitle>Add a vehicle</CardTitle>
              <CardDescription>
                Record capacity and the responsible transport team.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                className="grid gap-4"
                onSubmit={(event: FormEvent<HTMLFormElement>) => {
                  event.preventDefault();
                  submit("CREATE_VEHICLE", event.currentTarget);
                }}
              >
                <Field label="Registration number">
                  <Input
                    name="registrationNo"
                    required
                    placeholder="AP 31 AB 1234"
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Vehicle name">
                    <Input name="name" placeholder="Blue Bird" />
                  </Field>
                  <Field label="Type">
                    <Select name="type" defaultValue="BUS">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BUS">Bus</SelectItem>
                        <SelectItem value="MINI_BUS">Mini bus</SelectItem>
                        <SelectItem value="VAN">Van</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <Field label="Seat capacity">
                  <Input
                    name="capacity"
                    type="number"
                    min="1"
                    max="100"
                    required
                    placeholder="40"
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Driver name">
                    <Input name="driverName" required />
                  </Field>
                  <Field label="Driver mobile">
                    <Input
                      name="driverPhone"
                      inputMode="numeric"
                      maxLength={10}
                      required
                    />
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Attendant name">
                    <Input name="attendantName" />
                  </Field>
                  <Field label="Attendant mobile">
                    <Input
                      name="attendantPhone"
                      inputMode="numeric"
                      maxLength={10}
                    />
                  </Field>
                </div>
                <Button disabled={pending}>
                  <Plus className="size-4" />
                  Add vehicle
                </Button>
              </form>
            </CardContent>
          </Card>
          <div className="grid content-start gap-4 md:grid-cols-2">
            {data.vehicles.length === 0 ? (
              <Empty
                icon={BusFront}
                title="No vehicles added"
                description="Your active fleet will appear here."
              />
            ) : (
              data.vehicles.map((vehicle) => (
                <Card
                  key={vehicle.id}
                  className={!vehicle.active ? "opacity-60" : ""}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex size-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                        <BusFront className="size-5" />
                      </div>
                      <Badge variant={vehicle.active ? "success" : "outline"}>
                        {vehicle.active ? "Active" : "Archived"}
                      </Badge>
                    </div>
                    <CardTitle className="mt-3">
                      {vehicle.name || vehicle.registrationNo}
                    </CardTitle>
                    <CardDescription>
                      {vehicle.registrationNo} ·{" "}
                      {vehicle.type.replaceAll("_", " ")} · {vehicle.capacity}{" "}
                      seats
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <Info icon={UserRound}>{vehicle.driverName}</Info>
                    <Info icon={Phone}>{vehicle.driverPhone}</Info>
                    {vehicle.attendantName && (
                      <Info icon={ShieldCheck}>
                        Attendant: {vehicle.attendantName}
                      </Info>
                    )}
                    <p className="border-t pt-3 text-xs text-muted-foreground">
                      Assigned to {vehicle._count.routes} route
                      {vehicle._count.routes === 1 ? "" : "s"}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="routes" className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Create a route</CardTitle>
                <CardDescription>
                  Connect a vehicle and set the journey start times.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  className="grid gap-4"
                  onSubmit={(event: FormEvent<HTMLFormElement>) => {
                    event.preventDefault();
                    submit("CREATE_ROUTE", event.currentTarget);
                  }}
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Route code">
                      <Input name="code" required placeholder="R-01" />
                    </Field>
                    <Field label="Route name">
                      <Input
                        name="name"
                        required
                        placeholder="MVP Colony – School"
                      />
                    </Field>
                  </div>
                  <Field label="Vehicle">
                    <Select name="vehicleId" defaultValue="none">
                      <SelectTrigger>
                        <SelectValue placeholder="Choose vehicle" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Assign later</SelectItem>
                        {activeVehicles.map((vehicle) => (
                          <SelectItem key={vehicle.id} value={vehicle.id}>
                            {vehicle.registrationNo}
                            {vehicle.name ? ` · ${vehicle.name}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Pickup starts">
                      <Input name="pickupStart" type="time" />
                    </Field>
                    <Field label="Drop starts">
                      <Input name="dropStart" type="time" />
                    </Field>
                  </div>
                  <Button disabled={pending}>
                    <Plus className="size-4" />
                    Create route
                  </Button>
                </form>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Add a stop</CardTitle>
                <CardDescription>
                  Stops appear to families in the exact sequence entered.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  className="grid gap-4"
                  onSubmit={(event: FormEvent<HTMLFormElement>) => {
                    event.preventDefault();
                    submit("CREATE_STOP", event.currentTarget, {
                      routeId: stopRouteId,
                    });
                  }}
                >
                  <Field label="Route">
                    <Select value={stopRouteId} onValueChange={setStopRouteId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose route" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeRoutes.map((route) => (
                          <SelectItem key={route.id} value={route.id}>
                            {route.code} · {route.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-[1fr_110px]">
                    <Field label="Stop name">
                      <Input
                        name="name"
                        required
                        placeholder="MVP Double Road"
                      />
                    </Field>
                    <Field label="Sequence">
                      <Input name="sequence" type="number" min="1" required />
                    </Field>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="Pickup time">
                      <Input name="pickupTime" type="time" />
                    </Field>
                    <Field label="Drop time">
                      <Input name="dropTime" type="time" />
                    </Field>
                    <Field label="Monthly fee">
                      <Input
                        name="monthlyFee"
                        type="number"
                        min="0"
                        step="0.01"
                      />
                    </Field>
                  </div>
                  <Button disabled={pending || !stopRouteId}>
                    <Plus className="size-4" />
                    Add stop
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
          {data.routes.length === 0 ? (
            <Empty
              icon={Route}
              title="No routes created"
              description="Create your first route, then add its stops."
            />
          ) : (
            <div className="grid gap-5 xl:grid-cols-2">
              {data.routes.map((route) => (
                <RouteCard key={route.id} route={route} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent
          value="students"
          className="grid gap-5 xl:grid-cols-[0.9fr_1.4fr]"
        >
          <Card>
            <CardHeader>
              <CardTitle>Assign student transport</CardTitle>
              <CardDescription>
                A new assignment automatically closes the student’s previous
                active route.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                className="grid gap-4"
                onSubmit={(event: FormEvent<HTMLFormElement>) => {
                  event.preventDefault();
                  submit("ASSIGN_STUDENT", event.currentTarget, {
                    studentId,
                    academicYearId,
                    routeId: assignmentRouteId,
                    stopId: assignmentStopId,
                    pickupEnabled,
                    dropEnabled,
                  });
                }}
              >
                <Field label="Student">
                  <SearchableStudentSelect
                    value={studentId}
                    onChange={setStudentId}
                    academicYearId={academicYearId ?? undefined}
                  />
                </Field>
                <Field label="Route">
                  <Select
                    value={assignmentRouteId}
                    onValueChange={(value) => {
                      setAssignmentRouteId(value);
                      setAssignmentStopId(
                        activeRoutes
                          .find((route) => route.id === value)
                          ?.stops.find((stop) => stop.active)?.id ?? "",
                      );
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose route" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeRoutes.map((route) => (
                        <SelectItem key={route.id} value={route.id}>
                          {route.code} · {route.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Boarding stop">
                  <Select
                    value={assignmentStopId}
                    onValueChange={setAssignmentStopId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose stop" />
                    </SelectTrigger>
                    <SelectContent>
                      {assignmentStops.map((stop) => (
                        <SelectItem key={stop.id} value={stop.id}>
                          {stop.sequence}. {stop.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Service starts">
                  <Input
                    name="startDate"
                    type="date"
                    required
                    defaultValue={new Date().toISOString().slice(0, 10)}
                  />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Toggle
                    label="Morning pickup"
                    checked={pickupEnabled}
                    onCheckedChange={setPickupEnabled}
                  />
                  <Toggle
                    label="Afternoon drop"
                    checked={dropEnabled}
                    onCheckedChange={setDropEnabled}
                  />
                </div>
                <Field label="Notes">
                  <Textarea
                    name="notes"
                    placeholder="Optional transport instructions"
                  />
                </Field>
                <Button
                  disabled={
                    pending ||
                    !academicYearId ||
                    !studentId ||
                    !assignmentRouteId ||
                    !assignmentStopId
                  }
                >
                  <CircleParking className="size-4" />
                  Assign transport
                </Button>
              </form>
            </CardContent>
          </Card>
          <div className="space-y-4">
            {data.assignments.length === 0 ? (
              <Empty
                icon={UsersRound}
                title="No students assigned"
                description="Active transport assignments will appear here."
              />
            ) : (
              data.assignments.map((assignment) => (
                <Card key={assignment.id}>
                  <CardContent className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex gap-4">
                        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-50 to-indigo-100 font-black text-indigo-700">
                          {(
                            assignment.studentEnrollment.student.fullName || "S"
                          )
                            .split(" ")
                            .slice(0, 2)
                            .map((part) => part[0])
                            .join("")}
                        </div>
                        <div>
                          <h3 className="font-bold">
                            {assignment.studentEnrollment.student.fullName ||
                              `Student ${assignment.studentEnrollment.student.admissionNo}`}
                          </h3>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Admission{" "}
                            {assignment.studentEnrollment.student.admissionNo} ·{" "}
                            {assignment.studentEnrollment.class.name}{" "}
                            {assignment.studentEnrollment.section.name}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Badge variant="info">
                              {assignment.route.code}
                            </Badge>
                            <Badge variant="outline">
                              {assignment.stop.name}
                            </Badge>
                            <Badge variant="outline">
                              {assignment.pickupEnabled &&
                              assignment.dropEnabled
                                ? "Pickup & drop"
                                : assignment.pickupEnabled
                                  ? "Pickup only"
                                  : "Drop only"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <ArchiveAssignment
                        assignmentId={assignment.id}
                        name={
                          assignment.studentEnrollment.student.fullName ||
                          assignment.studentEnrollment.student.admissionNo
                        }
                        pending={pending}
                        onArchive={(assignmentId) =>
                          startTransition(async () => {
                            try {
                              await saveTransport("ARCHIVE_ASSIGNMENT", {
                                assignmentId,
                              });
                              toast.success("Transport assignment ended.");
                              router.refresh();
                            } catch (error) {
                              toast.error(
                                error instanceof Error
                                  ? error.message
                                  : "Unable to end assignment.",
                              );
                            }
                          })
                        }
                      />
                    </div>
                    <div className="mt-4 grid gap-2 border-t pt-4 text-sm sm:grid-cols-3">
                      <Info icon={Route}>{assignment.route.name}</Info>
                      <Info icon={MapPin}>{assignment.stop.name}</Info>
                      <Info icon={BusFront}>
                        {assignment.route.vehicle?.registrationNo ||
                          "Vehicle not assigned"}
                      </Info>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Metric({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof BusFront;
  value: number;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
      <Icon className="size-5 text-cyan-300" />
      <p className="mt-3 text-3xl font-black">{value}</p>
      <p className="text-xs font-semibold text-indigo-100">{label}</p>
    </div>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
function Info({
  icon: Icon,
  children,
}: {
  icon: typeof BusFront;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <Icon className="size-4 shrink-0 text-indigo-500" />
      <span>{children}</span>
    </div>
  );
}
function Toggle({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border bg-slate-50/70 px-4 py-3">
      <Label>{label}</Label>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
function Empty({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof BusFront;
  title: string;
  description: string;
}) {
  return (
    <Card className="min-h-48">
      <CardContent className="flex flex-1 flex-col items-center justify-center p-8 text-center">
        <Icon className="size-8 text-muted-foreground" />
        <p className="mt-3 font-bold">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function RouteCard({
  route,
}: {
  route: TransportDashboardData["routes"][number];
}) {
  return (
    <Card className={!route.active ? "opacity-60" : ""}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
            <Route className="size-5" />
          </div>
          <div className="flex gap-2">
            <Badge variant="info">{route.code}</Badge>
            <Badge variant={route.active ? "success" : "outline"}>
              {route.active ? "Active" : "Archived"}
            </Badge>
          </div>
        </div>
        <CardTitle className="mt-3">{route.name}</CardTitle>
        <CardDescription>
          {route.vehicle
            ? `${route.vehicle.registrationNo}${route.vehicle.name ? ` · ${route.vehicle.name}` : ""}`
            : "Vehicle not assigned"}{" "}
          · {route._count.assignments} students
        </CardDescription>
      </CardHeader>
      <CardContent>
        {route.stops.length === 0 ? (
          <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
            No stops added yet.
          </p>
        ) : (
          <div className="relative space-y-0">
            {route.stops.map((stop, index) => (
              <div key={stop.id} className="relative flex gap-3 pb-4 last:pb-0">
                {index < route.stops.length - 1 && (
                  <div className="absolute left-[11px] top-6 h-[calc(100%-8px)] w-px bg-indigo-200" />
                )}
                <div className="relative z-10 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-black text-white">
                  {stop.sequence}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{stop.name}</p>
                    {stop.monthlyFee && (
                      <Badge variant="outline">
                        ₹{Number(stop.monthlyFee).toLocaleString("en-IN")}/month
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>Pickup {stop.pickupTime || "—"}</span>
                    <span>Drop {stop.dropTime || "—"}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ArchiveAssignment({
  assignmentId,
  name,
  pending,
  onArchive,
}: {
  assignmentId: string;
  name: string;
  pending: boolean;
  onArchive: (id: string) => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={pending}>
          End assignment
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>End transport assignment?</AlertDialogTitle>
          <AlertDialogDescription>
            {name} will stop appearing on this route. Their assignment history
            will be preserved.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => onArchive(assignmentId)}>
            End assignment
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
