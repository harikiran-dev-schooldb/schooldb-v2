"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useSyncExternalStore, useState } from "react";
import {
  Building2,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  UserCircle2,
} from "lucide-react";
import { useSchool } from "@/contexts/school-context";
import { navigation } from "@/lib/navigation";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "schooldb-sidebar-collapsed";

/* -------------------------------------------------------------------------- */
/* Sidebar persistence                                                         */
/* -------------------------------------------------------------------------- */

function subscribeToSidebarStorage(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);

  window.addEventListener("schooldb-sidebar-change", onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);

    window.removeEventListener("schooldb-sidebar-change", onStoreChange);
  };
}

function getSidebarSnapshot() {
  return window.localStorage.getItem(STORAGE_KEY) === "true";
}

function getSidebarServerSnapshot() {
  return false;
}

function useSidebarCollapsed() {
  return useSyncExternalStore(
    subscribeToSidebarStorage,
    getSidebarSnapshot,
    getSidebarServerSnapshot,
  );
}

function setSidebarCollapsed(collapsed: boolean) {
  window.localStorage.setItem(STORAGE_KEY, String(collapsed));

  /*
   * The native "storage" event does not fire
   * in the same browser tab that changed
   * localStorage.
   *
   * This custom event updates the sidebar
   * immediately in the current tab.
   */
  window.dispatchEvent(new Event("schooldb-sidebar-change"));
}

/* -------------------------------------------------------------------------- */
/* Route helpers                                                               */
/* -------------------------------------------------------------------------- */

function isRouteActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/* -------------------------------------------------------------------------- */
/* Component                                                                   */
/* -------------------------------------------------------------------------- */

export function AppSidebar() {
  const pathname = usePathname();
  const { school } = useSchool();

  const collapsed = useSidebarCollapsed();

  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  /* ---------------------------------------------------------------------- */
  /* Sidebar controls                                                        */
  /* ---------------------------------------------------------------------- */

  function toggleSidebar() {
    setSidebarCollapsed(!collapsed);
  }

  function toggleMenu(title: string) {
    setOpenMenus((current) => ({
      ...current,
      [title]: !current[title],
    }));
  }

  /* ---------------------------------------------------------------------- */
  /* Active parent menus                                                     */
  /* ---------------------------------------------------------------------- */

  const activeParents = useMemo(() => {
    const active = new Set<string>();

    for (const item of navigation) {
      if (!item.children?.length) {
        continue;
      }

      const hasActiveChild = item.children.some((child) => {
        const href = `/${school.slug}/${child.href}`;

        return isRouteActive(pathname, href);
      });

      if (hasActiveChild) {
        active.add(item.title);
      }
    }

    return active;
  }, [pathname, school.slug]);

  /* ---------------------------------------------------------------------- */
  /* Render                                                                  */
  /* ---------------------------------------------------------------------- */

  return (
    <aside
      className={cn(
        "sticky top-0 z-50 h-screen shrink-0",
        "p-3",
        "transition-[width] duration-300 ease-out",
        collapsed ? "w-[82px]" : "w-[286px]",
      )}
    >
      <div
        className={cn(
          "flex h-full flex-col overflow-hidden",
          "rounded-2xl",
          "border border-sidebar-border/80",
          "bg-sidebar",
          "shadow-[0_12px_40px_rgba(0,0,0,0.12)]",
        )}
      >
        {/* ================================================================ */}
        {/* BRAND                                                             */}
        {/* ================================================================ */}

        <div
          className={cn(
            "flex h-[68px] shrink-0 items-center",
            "border-b border-white/[0.06]",
            collapsed ? "justify-center px-2" : "px-4",
          )}
        >
          <Link
            href={`/${school.slug}/dashboard`}
            className={cn(
              "group flex min-w-0 items-center",
              collapsed ? "justify-center" : "gap-3",
            )}
          >
            <div
              className={cn(
                "flex size-10 shrink-0 items-center justify-center",
                "rounded-xl",
                "bg-gradient-to-br from-sidebar-primary to-emerald-400",
                "text-sidebar-primary-foreground",
                "shadow-[0_8px_24px_rgba(16,185,129,0.18)]",
                "ring-1 ring-white/10",
                "transition-transform duration-200",
                "group-hover:scale-[1.04]",
              )}
            >
              <Building2 className="size-[19px]" strokeWidth={2.3} />
            </div>

            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-[15px] font-bold tracking-tight text-white">
                  SchoolDB
                </p>

                <p className="mt-0.5 truncate text-[9px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/40">
                  School Management
                </p>
              </div>
            )}
          </Link>
        </div>

        {/* ================================================================ */}
        {/* SCHOOL                                                             */}
        {/* ================================================================ */}

        <div className={cn("px-3 pt-3", collapsed && "px-2")}>
          <div
            className={cn(
              "rounded-xl border border-white/[0.07]",
              "bg-white/[0.035]",
              "transition-colors hover:bg-white/[0.05]",
              collapsed ? "flex justify-center p-2" : "p-3",
            )}
          >
            <div
              className={cn(
                "flex items-center",
                collapsed ? "justify-center" : "gap-3",
              )}
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-sidebar-foreground/65">
                <Building2 className="size-4" />
              </div>

              {!collapsed && (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-semibold text-white">
                      {school.name}
                    </p>

                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]" />

                      <span className="text-[10px] text-sidebar-foreground/40">
                        Academic workspace
                      </span>
                    </div>
                  </div>

                  <ChevronDown className="size-4 text-sidebar-foreground/25" />
                </>
              )}
            </div>
          </div>
        </div>

        {/* ================================================================ */}
        {/* SEARCH                                                             */}
        {/* ================================================================ */}

        {!collapsed && (
          <div className="px-3 pt-3">
            <button
              type="button"
              className={cn(
                "flex h-9 w-full items-center gap-2 rounded-lg",
                "border border-white/[0.06]",
                "bg-white/[0.025]",
                "px-3",
                "text-left text-[11px]",
                "text-sidebar-foreground/35",
                "transition-colors hover:bg-white/[0.05]",
              )}
            >
              <Search className="size-3.5" />

              <span className="flex-1">Search...</span>

              <kbd className="rounded border border-white/[0.08] px-1.5 py-0.5 text-[9px]">
                ⌘K
              </kbd>
            </button>
          </div>
        )}

        {/* ================================================================ */}
        {/* NAVIGATION                                                         */}
        {/* ================================================================ */}

        <nav
          className={cn(
            "flex-1 overflow-y-auto py-5",
            collapsed ? "px-2" : "px-3",
          )}
        >
          {!collapsed && (
            <p className="mb-2 px-3 text-[9px] font-bold uppercase tracking-[0.2em] text-sidebar-foreground/30">
              Workspace
            </p>
          )}

          <div className="space-y-1">
            {navigation.map((item) => {
              const hasChildren = Boolean(item.children?.length);

              /* ---------------------------------------------------------- */
              /* Parent item                                                  */
              /* ---------------------------------------------------------- */

              if (hasChildren) {
                const childIsActive = item.children!.some((child) => {
                  const href = `/${school.slug}/${child.href}`;

                  return isRouteActive(pathname, href);
                });

                const isOpen =
                  activeParents.has(item.title) ||
                  openMenus[item.title] === true;

                /* -------------------------------------------------------- */
                /* Collapsed parent                                          */
                /* -------------------------------------------------------- */

                if (collapsed) {
                  return (
                    <div key={item.title} className="group relative">
                      <button
                        type="button"
                        onClick={() => {
                          setSidebarCollapsed(false);

                          setOpenMenus((current) => ({
                            ...current,
                            [item.title]: true,
                          }));
                        }}
                        className={cn(
                          "flex size-11 w-full items-center justify-center rounded-xl",
                          "transition-all duration-200",
                          childIsActive
                            ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-black/15"
                            : "text-sidebar-foreground/50 hover:bg-white/[0.055] hover:text-white",
                        )}
                      >
                        <item.icon className="size-[18px]" />
                      </button>

                      <div
                        className={cn(
                          "pointer-events-none absolute left-full top-1/2 z-[100]",
                          "ml-3 -translate-y-1/2 whitespace-nowrap",
                          "rounded-lg border border-white/[0.08]",
                          "bg-sidebar px-3 py-2",
                          "text-xs font-medium text-white",
                          "opacity-0 shadow-xl",
                          "transition-opacity duration-150",
                          "group-hover:opacity-100",
                        )}
                      >
                        {item.title}
                      </div>
                    </div>
                  );
                }

                /* -------------------------------------------------------- */
                /* Expanded parent                                           */
                /* -------------------------------------------------------- */

                return (
                  <div key={item.title}>
                    <button
                      type="button"
                      onClick={() => toggleMenu(item.title)}
                      className={cn(
                        "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5",
                        "text-[13px] font-medium",
                        "transition-all duration-200",
                        childIsActive
                          ? "bg-white/[0.045] text-white"
                          : "text-sidebar-foreground/55 hover:bg-white/[0.045] hover:text-white",
                      )}
                    >
                      <item.icon
                        className={cn(
                          "size-[17px] shrink-0",
                          childIsActive
                            ? "text-sidebar-primary"
                            : "text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70",
                        )}
                      />

                      <span className="flex-1 text-left">{item.title}</span>

                      <ChevronDown
                        className={cn(
                          "size-3.5 text-sidebar-foreground/25 transition-transform duration-200",
                          isOpen && "rotate-180 text-sidebar-foreground/60",
                        )}
                      />
                    </button>

                    {isOpen && (
                      <div className="relative ml-[21px] mt-1 space-y-0.5 border-l border-white/[0.07] py-1 pl-3">
                        {item.children!.map((child) => {
                          const href = `/${school.slug}/${child.href}`;

                          const active = isRouteActive(pathname, href);

                          return (
                            <Link
                              key={child.title}
                              href={href}
                              className={cn(
                                "relative flex items-center rounded-lg px-3 py-2",
                                "text-[12px]",
                                "transition-all duration-200",
                                active
                                  ? "bg-sidebar-primary/90 font-semibold text-sidebar-primary-foreground shadow-sm"
                                  : "text-sidebar-foreground/50 hover:bg-white/[0.045] hover:text-white",
                              )}
                            >
                              {active && (
                                <span className="absolute -left-[17px] size-1.5 rounded-full bg-sidebar-primary ring-4 ring-sidebar" />
                              )}

                              {child.title}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              /* ---------------------------------------------------------- */
              /* Single item                                                   */
              /* ---------------------------------------------------------- */

              const href = `/${school.slug}/${item.href}`;

              const active = isRouteActive(pathname, href);

              if (collapsed) {
                return (
                  <div key={item.title} className="group relative">
                    <Link
                      href={href}
                      className={cn(
                        "flex size-11 w-full items-center justify-center rounded-xl",
                        "transition-all duration-200",
                        active
                          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-black/15"
                          : "text-sidebar-foreground/50 hover:bg-white/[0.055] hover:text-white",
                      )}
                    >
                      <item.icon className="size-[18px]" />
                    </Link>

                    <div
                      className={cn(
                        "pointer-events-none absolute left-full top-1/2 z-[100]",
                        "ml-3 -translate-y-1/2 whitespace-nowrap",
                        "rounded-lg border border-white/[0.08]",
                        "bg-sidebar px-3 py-2",
                        "text-xs font-medium text-white",
                        "opacity-0 shadow-xl",
                        "transition-opacity duration-150",
                        "group-hover:opacity-100",
                      )}
                    >
                      {item.title}
                    </div>
                  </div>
                );
              }

              return (
                <Link
                  key={item.title}
                  href={href}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-xl px-3 py-2.5",
                    "text-[13px] font-medium",
                    "transition-all duration-200",
                    active
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-black/10"
                      : "text-sidebar-foreground/60 hover:bg-white/[0.045] hover:text-white",
                  )}
                >
                  <item.icon
                    className={cn(
                      "size-[17px] shrink-0",
                      active
                        ? "text-sidebar-primary-foreground"
                        : "text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70",
                    )}
                  />

                  <span>{item.title}</span>

                  {active && (
                    <span className="ml-auto size-1.5 rounded-full bg-white/70" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* ================================================================ */}
        {/* SYSTEM STATUS                                                     */}
        {/* ================================================================ */}

        {!collapsed && (
          <div className="px-3 pb-2">
            <div className="flex items-center gap-2 rounded-lg px-3 py-2">
              <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]" />

              <span className="text-[10px] font-medium text-sidebar-foreground/40">
                All systems operational
              </span>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* FOOTER                                                            */}
        {/* ================================================================ */}

        <div className="border-t border-white/[0.06] p-3">
          {!collapsed && (
            <div className="mb-2 flex gap-1">
              <Link
                href={`/${school.slug}/settings`}
                className="flex flex-1 items-center gap-2 rounded-lg px-2.5 py-2 text-[11px] text-sidebar-foreground/45 transition hover:bg-white/[0.045] hover:text-white"
              >
                <Settings className="size-3.5" />
                Settings
              </Link>

              <button
                type="button"
                onClick={toggleSidebar}
                className="flex items-center justify-center rounded-lg px-2.5 text-sidebar-foreground/45 transition hover:bg-white/[0.045] hover:text-white"
                title="Collapse sidebar"
              >
                <PanelLeftClose className="size-4" />
              </button>
            </div>
          )}

          {collapsed && (
            <button
              type="button"
              onClick={toggleSidebar}
              className="mb-2 flex size-11 w-full items-center justify-center rounded-xl text-sidebar-foreground/45 transition hover:bg-white/[0.055] hover:text-white"
              title="Expand sidebar"
            >
              <PanelLeftOpen className="size-4" />
            </button>
          )}

          {/* Administrator */}
          <div
            className={cn(
              "flex items-center rounded-xl",
              "border border-white/[0.06]",
              "bg-white/[0.025]",
              collapsed ? "justify-center p-2" : "gap-3 px-2.5 py-2.5",
            )}
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-sidebar-foreground/60">
              <UserCircle2 className="size-4" />
            </div>

            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-[11px] font-semibold text-white">
                  School Administrator
                </p>

                <p className="truncate text-[10px] text-sidebar-foreground/35">
                  Administrator
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
