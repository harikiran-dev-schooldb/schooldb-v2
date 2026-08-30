"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState, useSyncExternalStore } from "react";
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

/* ==========================================================================
   SIDEBAR PERSISTENCE
   ========================================================================== */

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
  window.dispatchEvent(new Event("schooldb-sidebar-change"));
}

/* ==========================================================================
   ROUTE HELPERS
   ========================================================================== */

function isRouteActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/* ==========================================================================
   COMPONENT
   ========================================================================== */

export function AppSidebar() {
  const pathname = usePathname();
  const { school } = useSchool();

  const collapsed = useSidebarCollapsed();

  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  function toggleSidebar() {
    setSidebarCollapsed(!collapsed);
  }

  function toggleMenu(title: string) {
    setOpenMenus((current) => ({
      ...current,
      [title]: !current[title],
    }));
  }

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

  return (
    <aside
      className={cn(
        "sticky top-0 z-50 h-screen shrink-0 p-3",
        "transition-[width] duration-300 ease-out",
        collapsed ? "w-[82px]" : "w-[286px]",
      )}
    >
      <div
        className={cn(
          "flex h-full flex-col overflow-hidden",
          "rounded-[20px]",
          "border border-sidebar-border",
          "bg-sidebar",
          "shadow-[0_12px_40px_rgba(15,23,42,0.07)]",
        )}
      >
        {/* ==================================================================
            BRAND
            ================================================================== */}

        <div
          className={cn(
            "relative flex h-[72px] shrink-0 items-center",
            "border-b border-sidebar-border",
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
                "relative flex size-10 shrink-0 items-center justify-center",
                "overflow-hidden rounded-xl",
                "bg-gradient-to-br from-indigo-600 via-violet-600 to-blue-600",
                "text-white",
                "shadow-[0_8px_22px_rgba(79,70,229,0.22)]",
                "ring-1 ring-indigo-500/10",
                "transition-all duration-200",
                "group-hover:scale-[1.03]",
              )}
            >
              <div className="absolute inset-0 bg-white/10" />

              <Building2 className="relative size-[19px]" strokeWidth={2.25} />
            </div>

            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-[15px] font-bold tracking-[-0.02em] text-slate-900">
                  SchoolDB
                </p>

                <p className="mt-0.5 truncate text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  School Management
                </p>
              </div>
            )}
          </Link>
        </div>

        {/* ==================================================================
            SCHOOL
            ================================================================== */}

        <div className={cn("px-3 pt-3", collapsed && "px-2")}>
          <div
            className={cn(
              "relative overflow-hidden rounded-xl",
              "border border-slate-200/80",
              "bg-slate-50/70",
              "transition-all duration-200",
              "hover:border-indigo-200",
              "hover:bg-indigo-50/40",
              collapsed ? "flex justify-center p-2" : "px-3 py-3",
            )}
          >
            <div
              className={cn(
                "relative flex items-center",
                collapsed ? "justify-center" : "gap-3",
              )}
            >
              <div
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center",
                  "rounded-lg",
                  "bg-indigo-50",
                  "text-indigo-600",
                  "ring-1 ring-indigo-100",
                )}
              >
                <Building2 className="size-4" strokeWidth={2} />
              </div>

              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-semibold text-slate-800">
                    {school.name}
                  </p>

                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-emerald-500" />

                    <span className="text-[9px] font-medium text-slate-400">
                      Active school
                    </span>
                  </div>
                </div>
              )}

              {!collapsed && <ChevronDown className="size-4 text-slate-300" />}
            </div>
          </div>
        </div>

        {/* ==================================================================
            SEARCH
            ================================================================== */}

        {!collapsed && (
          <div className="px-3 pt-3">
            <button
              type="button"
              className={cn(
                "group flex h-9 w-full items-center gap-2",
                "rounded-lg",
                "border border-slate-200",
                "bg-slate-50/60",
                "px-3",
                "text-left text-[11px]",
                "text-slate-400",
                "transition-all duration-200",
                "hover:border-indigo-200",
                "hover:bg-white",
                "hover:text-slate-600",
              )}
            >
              <Search className="size-3.5 text-slate-400 transition-colors group-hover:text-indigo-500" />

              <span className="flex-1">Search...</span>

              <kbd
                className={cn(
                  "rounded-md",
                  "border border-slate-200",
                  "bg-white",
                  "px-1.5 py-0.5",
                  "text-[9px]",
                  "text-slate-400",
                )}
              >
                ⌘K
              </kbd>
            </button>
          </div>
        )}

        {/* ==================================================================
            NAVIGATION
            ================================================================== */}

        <nav
          className={cn(
            "flex-1 overflow-y-auto py-5",
            "[scrollbar-width:thin]",
            "[scrollbar-color:rgba(100,116,139,0.15)_transparent]",
            collapsed ? "px-2" : "px-3",
          )}
        >
          {!collapsed && (
            <p className="mb-2 px-3 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">
              Workspace
            </p>
          )}

          <div className="space-y-1">
            {navigation.map((item) => {
              const hasChildren = Boolean(item.children?.length);

              /* ============================================================
                 PARENT WITH CHILDREN
                 ============================================================ */

              if (hasChildren) {
                const childIsActive = item.children!.some((child) => {
                  const href = `/${school.slug}/${child.href}`;

                  return isRouteActive(pathname, href);
                });

                const isOpen =
                  activeParents.has(item.title) ||
                  openMenus[item.title] === true;

                /* ----------------------------------------------------------
                   COLLAPSED
                   ---------------------------------------------------------- */

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
                          "flex size-11 w-full items-center justify-center",
                          "rounded-xl",
                          "transition-all duration-200",
                          childIsActive
                            ? [
                                "bg-indigo-50",
                                "text-indigo-600",
                                "ring-1 ring-indigo-100",
                                "shadow-[0_5px_16px_rgba(79,70,229,0.10)]",
                              ]
                            : [
                                "text-slate-400",
                                "hover:bg-slate-50",
                                "hover:text-indigo-600",
                              ],
                        )}
                      >
                        <item.icon className="size-[18px]" strokeWidth={2} />
                      </button>

                      <div
                        className={cn(
                          "pointer-events-none absolute left-full top-1/2 z-[100]",
                          "ml-3 -translate-y-1/2 whitespace-nowrap",
                          "rounded-lg",
                          "border border-slate-200",
                          "bg-white",
                          "px-3 py-2",
                          "text-xs font-medium text-slate-800",
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

                /* ----------------------------------------------------------
                   EXPANDED
                   ---------------------------------------------------------- */

                return (
                  <div key={item.title}>
                    <button
                      type="button"
                      onClick={() => toggleMenu(item.title)}
                      className={cn(
                        "group flex w-full items-center gap-3",
                        "rounded-xl px-3 py-2.5",
                        "text-[13px] font-medium",
                        "transition-all duration-200",
                        childIsActive
                          ? ["bg-indigo-50", "text-indigo-700"]
                          : [
                              "text-slate-600",
                              "hover:bg-slate-50",
                              "hover:text-slate-900",
                            ],
                      )}
                    >
                      <item.icon
                        className={cn(
                          "size-[17px] shrink-0",
                          childIsActive
                            ? "text-indigo-600"
                            : "text-slate-400 group-hover:text-slate-600",
                        )}
                        strokeWidth={2}
                      />

                      <span className="flex-1 text-left">{item.title}</span>

                      <ChevronDown
                        className={cn(
                          "size-3.5 text-slate-300",
                          "transition-transform duration-200",
                          isOpen && "rotate-180 text-indigo-400",
                        )}
                      />
                    </button>

                    {/* Children */}
                    <div
                      className={cn(
                        "grid transition-[grid-template-rows,opacity] duration-200",
                        isOpen
                          ? "grid-rows-[1fr] opacity-100"
                          : "grid-rows-[0fr] opacity-0",
                      )}
                    >
                      <div className="min-h-0 overflow-hidden">
                        <div className="ml-[21px] border-l border-slate-200 pl-3 pt-1">
                          <div className="space-y-0.5">
                            {item.children!.map((child) => {
                              const href = `/${school.slug}/${child.href}`;

                              const active = isRouteActive(pathname, href);

                              return (
                                <Link
                                  key={child.title}
                                  href={href}
                                  className={cn(
                                    "group relative flex items-center gap-2.5",
                                    "rounded-lg px-3 py-2",
                                    "text-[12px] font-medium",
                                    "transition-all duration-200",
                                    active
                                      ? ["bg-indigo-50", "text-indigo-700"]
                                      : [
                                          "text-slate-500",
                                          "hover:bg-slate-50",
                                          "hover:text-slate-800",
                                        ],
                                  )}
                                >
                                  {active && (
                                    <span className="absolute -left-[16px] top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-gradient-to-b from-indigo-500 to-violet-500" />
                                  )}

                                  <span
                                    className={cn(
                                      "size-1.5 shrink-0 rounded-full transition-all duration-200",
                                      active
                                        ? "bg-indigo-500 shadow-[0_0_7px_rgba(99,102,241,0.45)]"
                                        : "bg-slate-300 group-hover:bg-slate-400",
                                    )}
                                  />

                                  <span className="truncate">
                                    {child.title}
                                  </span>
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              /* ============================================================
                 SINGLE NAVIGATION ITEM
                 ============================================================ */

              const href = `/${school.slug}/${item.href}`;

              const active = isRouteActive(pathname, href);

              /* ----------------------------------------------------------
                 COLLAPSED
                 ---------------------------------------------------------- */

              if (collapsed) {
                return (
                  <div key={item.title} className="group relative">
                    <Link
                      href={href}
                      className={cn(
                        "flex size-11 w-full items-center justify-center",
                        "rounded-xl",
                        "transition-all duration-200",
                        active
                          ? [
                              "bg-indigo-50",
                              "text-indigo-600",
                              "ring-1 ring-indigo-100",
                              "shadow-[0_5px_16px_rgba(79,70,229,0.10)]",
                            ]
                          : [
                              "text-slate-400",
                              "hover:bg-slate-50",
                              "hover:text-indigo-600",
                            ],
                      )}
                    >
                      <item.icon className="size-[18px]" strokeWidth={2} />
                    </Link>

                    <div
                      className={cn(
                        "pointer-events-none absolute left-full top-1/2 z-[100]",
                        "ml-3 -translate-y-1/2 whitespace-nowrap",
                        "rounded-lg",
                        "border border-slate-200",
                        "bg-white",
                        "px-3 py-2",
                        "text-xs font-medium text-slate-800",
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

              /* ----------------------------------------------------------
                 EXPANDED
                 ---------------------------------------------------------- */

              return (
                <Link
                  key={item.title}
                  href={href}
                  className={cn(
                    "group relative flex items-center gap-3",
                    "rounded-xl px-3 py-2.5",
                    "text-[13px] font-medium",
                    "transition-all duration-200",
                    active
                      ? [
                          "bg-indigo-600",
                          "text-white",
                          "shadow-[0_7px_20px_rgba(79,70,229,0.18)]",
                        ]
                      : [
                          "text-slate-600",
                          "hover:bg-slate-50",
                          "hover:text-slate-900",
                        ],
                  )}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-white" />
                  )}

                  <item.icon
                    className={cn(
                      "size-[17px] shrink-0",
                      active
                        ? "text-white"
                        : "text-slate-400 group-hover:text-slate-600",
                    )}
                    strokeWidth={2}
                  />

                  <span>{item.title}</span>

                  {active && (
                    <span className="ml-auto size-1.5 rounded-full bg-white/80" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* ==================================================================
            SYSTEM STATUS
            ================================================================== */}

        {!collapsed && (
          <div className="px-3 pb-2">
            <div
              className={cn(
                "flex items-center gap-2",
                "rounded-lg px-3 py-2",
                "border border-emerald-100",
                "bg-emerald-50/70",
              )}
            >
              <span className="size-1.5 rounded-full bg-emerald-500" />

              <span className="text-[10px] font-medium text-emerald-700/70">
                All systems operational
              </span>
            </div>
          </div>
        )}

        {/* ==================================================================
            FOOTER
            ================================================================== */}

        <div className="border-t border-sidebar-border p-3">
          {!collapsed && (
            <div className="mb-2 flex gap-1">
              <Link
                href={`/${school.slug}/settings`}
                className={cn(
                  "flex flex-1 items-center gap-2",
                  "rounded-lg px-2.5 py-2",
                  "text-[11px]",
                  "text-slate-500",
                  "transition-all duration-200",
                  "hover:bg-slate-50",
                  "hover:text-slate-800",
                )}
              >
                <Settings className="size-3.5" />
                Settings
              </Link>

              <button
                type="button"
                onClick={toggleSidebar}
                className={cn(
                  "flex items-center justify-center",
                  "rounded-lg px-2.5",
                  "text-slate-400",
                  "transition-all duration-200",
                  "hover:bg-slate-50",
                  "hover:text-indigo-600",
                )}
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
              className={cn(
                "mb-2 flex size-11 w-full items-center justify-center",
                "rounded-xl",
                "text-slate-400",
                "transition-all duration-200",
                "hover:bg-slate-50",
                "hover:text-indigo-600",
              )}
              title="Expand sidebar"
            >
              <PanelLeftOpen className="size-4" />
            </button>
          )}

          {/* Administrator */}
          <div
            className={cn(
              "flex items-center rounded-xl",
              "border border-slate-200",
              "bg-slate-50/60",
              "transition-colors duration-200",
              "hover:bg-slate-50",
              collapsed ? "justify-center p-2" : "gap-3 px-2.5 py-2.5",
            )}
          >
            <div
              className={cn(
                "flex size-8 shrink-0 items-center justify-center",
                "rounded-full",
                "bg-indigo-50",
                "text-indigo-600",
                "ring-1 ring-indigo-100",
              )}
            >
              <UserCircle2 className="size-4" />
            </div>

            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-[11px] font-semibold text-slate-800">
                  School Administrator
                </p>

                <p className="truncate text-[10px] text-slate-400">
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
