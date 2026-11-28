"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Eye, Layers3, Loader2, Route, Save, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { navigation } from "@/lib/navigation";
import {
  ADMISSIONS_ONLY_ROUTES,
  ADMISSIONS_SUPPORT_DEMO_ROUTES,
  SCHOOL_MODULES,
  toggleSchoolModule,
  isRouteAllowed,
  ALWAYS_AVAILABLE_ROUTES,
  BULK_OPERATION_ROUTES,
  CONFIGURABLE_ROUTES,
  type RouteAccessConfig,
} from "@/lib/route-access";

type SchoolRouteAccess = {
  id: string;
  name: string;
  slug: string;
  routeAccessRestricted: boolean;
  allowedRoutes: string[];
  defaultLandingRoute?: string|null;
  moduleAccessRestricted?:boolean;
};

type RouteOption = { title: string; href: string };
type RouteGroup = { title: string; routes: RouteOption[] };

function routeGroups(): RouteGroup[] {
  const primaryRoutes: RouteOption[] = [];
  const groups: RouteGroup[] = [];

  for (const item of navigation) {
    if (item.children?.length) {
      const routes = item.children.filter((child) =>
        CONFIGURABLE_ROUTES.has(child.href),
      );
      if (routes.length) groups.push({ title: item.title, routes });
      continue;
    }

    if (
      item.href &&
      CONFIGURABLE_ROUTES.has(item.href) &&
      !ALWAYS_AVAILABLE_ROUTES.has(item.href) &&
      item.href !== "bulk-operations"
    ) {
      primaryRoutes.push({ title: item.title, href: item.href });
    }
  }

  return [
    ...(primaryRoutes.length
      ? [{ title: "Main navigation", routes: primaryRoutes }]
      : []),
    ...groups,
    { title: "Bulk Operations", routes: [...BULK_OPERATION_ROUTES] },
    {
      title: "Workspace",
      routes: [
        { title: "Notification Inbox", href: "notification-inbox" },
        { title: "Settings & Profile", href: "settings" },
      ],
    },
  ];
}

const ROUTE_GROUPS = routeGroups();
const ALL_ROUTES = [...CONFIGURABLE_ROUTES];
const OPTIONAL_CAMPUS_ROUTES = new Set([
  "presentation", "staff-operations", "visitors", "student-health", "inventory",
  "student-pickup", "maintenance", "library", "transport", "whatsapp",
]);
const CORE_SCHOOL_ROUTES = ALL_ROUTES.filter(
  (route) => !route.startsWith("bulk-operations/") && !OPTIONAL_CAMPUS_ROUTES.has(route),
);
const ACADEMIC_ONLY_ROUTES = CORE_SCHOOL_ROUTES.filter(
  (route) => !route.startsWith("fees/") && !["expenses", "reports", "management-analytics"].includes(route),
);

export function SchoolRouteAccessManager({ targetSchoolId, schoolSlug, embedded = false }: { targetSchoolId?: string; schoolSlug: string; embedded?: boolean }) {
  const [schools, setSchools] = useState<SchoolRouteAccess[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState("");
  const [draft, setDraft] = useState<RouteAccessConfig>({
    routeAccessRestricted: false,
    allowedRoutes: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const selectedSchool = useMemo(
    () => schools.find((school) => school.id === selectedSchoolId) ?? null,
    [schools, selectedSchoolId],
  );
  const enabledModuleCount = SCHOOL_MODULES.filter((module) =>
    module.routes.every((route) => draft.allowedRoutes.includes(route)),
  ).length;

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/v1/schools/route-access", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok || !payload.success) {
          throw new Error(payload.message ?? "Unable to load route access.");
        }
        const loadedSchools = payload.data.schools as SchoolRouteAccess[];
        setSchools(loadedSchools);
        const firstSchool = targetSchoolId === undefined
          ? loadedSchools[0]
          : loadedSchools.find((school) => school.id === targetSchoolId);
        setSelectedSchoolId(firstSchool?.id ?? "");
        if (firstSchool) {
          setDraft({
            routeAccessRestricted: firstSchool.routeAccessRestricted,
            allowedRoutes: firstSchool.allowedRoutes,
            defaultLandingRoute:firstSchool.defaultLandingRoute,
            moduleAccessRestricted:firstSchool.moduleAccessRestricted,
          });
        }
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          toast.error(
            error instanceof Error ? error.message : "Unable to load route access.",
          );
        }
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });

    return () => controller.abort();
  }, [targetSchoolId]);

  function toggleRestricted(checked: boolean) {
    setDraft((current) => ({
      ...current,
      routeAccessRestricted: checked,
      allowedRoutes:
        checked && current.allowedRoutes.length === 0
          ? ALL_ROUTES
          : current.allowedRoutes,
    }));
  }

  function toggleRoute(href: string, checked: boolean) {
    setDraft((current) => ({
      ...current,
      allowedRoutes: checked
        ? [...new Set([...current.allowedRoutes, href])]
        : current.allowedRoutes.filter((route) => route !== href),
    }));
  }

  async function save() {
    if (!selectedSchool) return;
    setSaving(true);

    try {
      const response = await fetch("/api/v1/schools/route-access", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId: selectedSchool.id,
          routeAccessRestricted: draft.routeAccessRestricted,
          allowedRoutes: draft.allowedRoutes,
          moduleAccessRestricted:draft.moduleAccessRestricted===true,
          defaultLandingRoute:draft.defaultLandingRoute&&isRouteAllowed(draft,draft.defaultLandingRoute)?draft.defaultLandingRoute:null,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Unable to save route access.");
      }

      const updated = payload.data.school as SchoolRouteAccess;
      setSchools((current) =>
        current.map((school) => (school.id === updated.id ? updated : school)),
      );
      setDraft({
        routeAccessRestricted: updated.routeAccessRestricted,
        allowedRoutes: updated.allowedRoutes,
        defaultLandingRoute:updated.defaultLandingRoute,
            moduleAccessRestricted:updated.moduleAccessRestricted,
      });
      toast.success(payload.message ?? "Route access saved.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to save route access.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-7 animate-spin text-primary" />
      </div>
    );
  }

  if (!selectedSchool) {
    return (
      <div className="space-y-4 p-4 sm:p-6">
        <PageHeader eyebrow="Super Admin" title="School settings unavailable" description="No school could be selected. Return to Schools and try again." />
        <Button asChild variant="outline"><Link href={`/${schoolSlug}/schools`}><ArrowLeft className="size-4" /> Back to Schools</Link></Button>
      </div>
    );
  }

  return (
    <div className={embedded ? "min-w-0 space-y-4" : "space-y-6 p-4 pb-12 sm:p-6"}>
      {!embedded && <><Button asChild variant="outline" size="sm" className="rounded-xl">
        <Link href={`/${schoolSlug}/schools`}><ArrowLeft className="size-4" /> Back to Schools</Link>
      </Button>
      <PageHeader
        eyebrow="Super Admin"
        title={targetSchoolId === undefined ? "School Route Access" : "School Settings"}
        description={targetSchoolId === undefined ? "Choose exactly which SchoolDB areas appear for each school. User role permissions still apply." : `Manage modules, route access and the default landing page for ${selectedSchool.name}.`}
      /></>}

      <Card className="premium-card rounded-3xl border border-border/70">
        <CardContent className="space-y-5 p-5 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-3">
            {[{label:"Access mode",value:draft.routeAccessRestricted?"Curated":"Full access",detail:draft.routeAccessRestricted?"Selected routes only":"Every workspace available",icon:ShieldCheck},{label:"Routes enabled",value:draft.routeAccessRestricted?`${draft.allowedRoutes.length} / ${ALL_ROUTES.length}`:"All",detail:"Navigation destinations",icon:Route},{label:"Modules enabled",value:draft.routeAccessRestricted?`${enabledModuleCount} / ${SCHOOL_MODULES.length}`:"All",detail:"School capabilities",icon:Layers3}].map(({label,value,detail,icon:Icon})=><div key={label} className="flex min-w-0 items-center gap-3 rounded-2xl border border-border/60 bg-muted/20 p-3.5"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="size-4.5"/></span><span className="min-w-0"><span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</span><span className="block truncate text-base font-black">{value}</span><span className="block truncate text-[11px] text-muted-foreground">{detail}</span></span></div>)}
          </div>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div className="space-y-2">
              <label htmlFor="route-access-school" className="text-xs font-semibold">
                School
              </label>
              {targetSchoolId !== undefined ? (
                <div id="route-access-school" className="rounded-xl border border-border bg-muted/30 px-3 py-2.5">
                  <p className="text-sm font-semibold">{selectedSchool.name}</p>
                  <p className="text-xs text-muted-foreground">/{selectedSchool.slug}</p>
                </div>
              ) : (
              <select
                id="route-access-school"
                disabled={saving}
                value={selectedSchoolId}
                onChange={(event) => {
                  const nextSchool = schools.find(
                    (school) => school.id === event.target.value,
                  );
                  setSelectedSchoolId(event.target.value);
                  if (nextSchool) {
                    setDraft({
                      routeAccessRestricted: nextSchool.routeAccessRestricted,
                      allowedRoutes: nextSchool.allowedRoutes,
                      defaultLandingRoute:nextSchool.defaultLandingRoute,
            moduleAccessRestricted:nextSchool.moduleAccessRestricted,
                    });
                  }
                }}
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              >
                {schools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name} /{school.slug}
                  </option>
                ))}
              </select>
              )}
            </div>

            <Button className="rounded-xl" onClick={() => void save()} disabled={!selectedSchool || saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {saving ? "Saving..." : targetSchoolId === undefined ? "Save route access" : "Save settings"}
            </Button>
          </div>

          <div className="flex flex-col gap-4 rounded-2xl border border-primary/15 bg-primary/[0.045] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-xl bg-primary/10 p-2 text-primary">
                <ShieldCheck className="size-4" />
              </div>
              <div>
                <p className="text-sm font-bold">Use selected routes only</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Off gives this school every route. On limits it to the checked routes below.
                </p>
              </div>
            </div>
            <Switch
              checked={draft.routeAccessRestricted}
              onCheckedChange={toggleRestricted}
              aria-label="Use selected routes only"
            />
          </div>

          <div className="space-y-2"><label htmlFor="landing-route" className="text-xs font-semibold">Default landing page</label><Select disabled={saving} value={draft.defaultLandingRoute&&isRouteAllowed(draft,draft.defaultLandingRoute)?draft.defaultLandingRoute:"__automatic__"} onValueChange={value=>setDraft(current=>({...current,defaultLandingRoute:value==="__automatic__"?null:value}))}><SelectTrigger id="landing-route" className="h-11 w-full rounded-xl"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="__automatic__">Automatic (first permitted workspace)</SelectItem>{["admissions/dashboard",...ALL_ROUTES.filter(r=>!r.startsWith("bulk-operations/"))].filter(r=>isRouteAllowed(draft,r)).map(r=><SelectItem key={r} value={r}>{r==="admissions/dashboard"?"Admissions dashboard":r.replaceAll("/"," / ").replaceAll("-"," ")}</SelectItem>)}</SelectContent></Select><p className="text-xs text-muted-foreground">A user without permission for this page is sent to another permitted page.</p></div>
          {draft.routeAccessRestricted && (
            <div className="rounded-2xl border border-border/60 bg-muted/15 p-4"><div className="mb-3 flex items-center gap-2"><Sparkles className="size-4 text-primary"/><p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Quick presets</p></div><div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setDraft({routeAccessRestricted:true,allowedRoutes:[...ADMISSIONS_ONLY_ROUTES],defaultLandingRoute:"admissions/dashboard",moduleAccessRestricted:true})}>Admissions only</Button>
              <Button type="button" variant="outline" size="sm" onClick={()=>setDraft({routeAccessRestricted:true,moduleAccessRestricted:true,allowedRoutes:[...ADMISSIONS_SUPPORT_DEMO_ROUTES],defaultLandingRoute:"admissions/dashboard"})}>Admissions + Support demo</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setDraft((current) => ({ ...current, moduleAccessRestricted:false, defaultLandingRoute:null, allowedRoutes: ACADEMIC_ONLY_ROUTES }))}>
                Academic only
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setDraft((current) => ({ ...current, moduleAccessRestricted:false, defaultLandingRoute:null, allowedRoutes: CORE_SCHOOL_ROUTES }))}>
                Core school
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setDraft((current) => ({ ...current, moduleAccessRestricted:false, defaultLandingRoute:null, allowedRoutes: ALL_ROUTES }))}>
                Full campus
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setDraft((current) => ({ ...current, moduleAccessRestricted:false, defaultLandingRoute:null, allowedRoutes: [] }))}>
                Clear all
              </Button>
              <span className="self-center rounded-full bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground ring-1 ring-inset ring-border">
                {draft.allowedRoutes.length} of {ALL_ROUTES.length} routes selected
              </span>
            </div></div>
          )}
        </CardContent>
      </Card>

      {draft.routeAccessRestricted&&<Card className="premium-card overflow-hidden rounded-3xl border border-border/70"><CardContent className="p-0"><div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 bg-gradient-to-r from-primary/[0.05] to-transparent p-5 sm:p-6"><div><p className="section-label">Workspace capabilities</p><h2 className="mt-1 text-lg font-black tracking-tight">School subscription modules</h2><p className="mt-1 max-w-3xl text-sm text-muted-foreground">Choose the operational areas this school can use. Staff permissions continue to apply inside every enabled module.</p></div><span className="rounded-full border bg-background/80 px-3 py-1.5 text-xs font-bold">{enabledModuleCount} enabled</span></div><div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6">{SCHOOL_MODULES.map(module=>{const selected=module.routes.every(route=>draft.allowedRoutes.includes(route));const partial=!selected&&module.routes.some(route=>draft.allowedRoutes.includes(route));return <label key={module.key} className={"group flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-sm "+(selected?"border-primary/35 bg-primary/[0.06] ring-1 ring-inset ring-primary/10":"border-border/70 bg-background hover:border-primary/25")}><span className={"grid size-9 shrink-0 place-items-center rounded-xl "+(selected?"bg-primary text-primary-foreground":"bg-muted text-muted-foreground")}><Checkbox className={selected?"border-primary-foreground/70 data-[state=checked]:bg-transparent data-[state=checked]:text-primary-foreground":""} checked={selected?true:partial?"indeterminate":false} onCheckedChange={value=>setDraft(current=>({...current,moduleAccessRestricted:true,allowedRoutes:toggleSchoolModule(current.allowedRoutes,module.key,value===true)}))}/></span><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><span className="block text-sm font-bold">{module.label}</span>{selected&&<CheckCircle2 className="size-4 shrink-0 text-primary"/>}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{module.description}</span><span className="mt-2 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{module.routes.length} routes</span></span></label>})}</div><p className="border-t border-border/60 px-5 py-4 text-xs leading-5 text-muted-foreground sm:px-6">Advanced routes remain below. Unclassified operational APIs are blocked when strict module filtering is enabled.</p></CardContent></Card>}
      {!draft.routeAccessRestricted ? (
        <div className="flex min-h-40 items-center justify-center rounded-3xl border border-dashed bg-muted/20 p-8 text-center">
          <div>
            <Route className="mx-auto size-7 text-muted-foreground" />
            <p className="mt-3 font-semibold">All routes are available</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Turn on selected-route access to customize this school.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {ROUTE_GROUPS.map((group) => (
            <Card key={group.title} className="premium-card overflow-hidden rounded-3xl border border-border/70">
              <CardContent className="p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="font-bold">{group.title}</h2>
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
                    {group.routes.filter((route) => draft.allowedRoutes.includes(route.href)).length}/{group.routes.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {group.routes.map((route) => {
                    const checked = draft.allowedRoutes.includes(route.href);
                    return (
                      <label
                        key={route.href}
                        className={"flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition "+(checked?"border-primary/20 bg-primary/[0.04]":"border-border/70 hover:bg-muted/40")}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) => toggleRoute(route.href, value === true)}
                        />
                        <span className="min-w-0 flex-1 text-sm font-semibold">{route.title}</span>
                        {checked&&<Eye className="size-3.5 shrink-0 text-primary"/>}
                        <span className="hidden truncate font-mono text-[9px] text-muted-foreground sm:block">
                          /{route.href}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
