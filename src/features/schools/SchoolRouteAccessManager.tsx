"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCheck, Loader2, Route, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { navigation } from "@/lib/navigation";
import {
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

export function SchoolRouteAccessManager() {
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
        const firstSchool = loadedSchools[0];
        setSelectedSchoolId(firstSchool?.id ?? "");
        if (firstSchool) {
          setDraft({
            routeAccessRestricted: firstSchool.routeAccessRestricted,
            allowedRoutes: firstSchool.allowedRoutes,
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
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  function toggleRestricted(checked: boolean) {
    setDraft((current) => ({
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

  return (
    <div className="space-y-6 p-4 pb-12 sm:p-6">
      <PageHeader
        eyebrow="Super Admin"
        title="School Route Access"
        description="Choose exactly which SchoolDB areas appear for each school. User role permissions still apply."
      />

      <Card className="premium-card rounded-3xl border-0">
        <CardContent className="space-y-5 p-5 sm:p-6">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div className="space-y-2">
              <label htmlFor="route-access-school" className="text-xs font-semibold">
                School
              </label>
              <select
                id="route-access-school"
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
            </div>

            <Button onClick={() => void save()} disabled={!selectedSchool || saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {saving ? "Saving..." : "Save route access"}
            </Button>
          </div>

          <div className="flex flex-col gap-4 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-xl bg-indigo-100 p-2 text-indigo-700">
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

          {draft.routeAccessRestricted && (
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setDraft((current) => ({ ...current, allowedRoutes: ALL_ROUTES }))}>
                <CheckCheck className="size-4" /> Select all
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setDraft((current) => ({ ...current, allowedRoutes: [] }))}>
                Clear all
              </Button>
              <span className="self-center text-xs text-muted-foreground">
                {draft.allowedRoutes.length} of {ALL_ROUTES.length} routes selected
              </span>
            </div>
          )}
        </CardContent>
      </Card>

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
        <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
          {ROUTE_GROUPS.map((group) => (
            <Card key={group.title} className="premium-card rounded-2xl border-0">
              <CardContent className="p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="font-bold">{group.title}</h2>
                  <span className="text-[11px] text-muted-foreground">
                    {group.routes.filter((route) => draft.allowedRoutes.includes(route.href)).length}/{group.routes.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {group.routes.map((route) => {
                    const checked = draft.allowedRoutes.includes(route.href);
                    return (
                      <label
                        key={route.href}
                        className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/70 px-3 py-2.5 transition hover:bg-muted/40"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) => toggleRoute(route.href, value === true)}
                        />
                        <span className="min-w-0 flex-1 text-sm font-medium">{route.title}</span>
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
