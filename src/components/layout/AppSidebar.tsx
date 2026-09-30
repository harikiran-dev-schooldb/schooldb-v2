"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  UserCircle2,
  X,
} from "lucide-react";

import { useSchool } from "@/contexts/school-context";
import { SchoolLogo } from "@/components/branding/SchoolLogo";
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

function isRouteActive(pathname: string, href: string, exact = false) {
  return pathname === href || (!exact && pathname.startsWith(`${href}/`));
}

/* ==========================================================================
   COMPONENT
   ========================================================================== */

type Props = {
  mobile?: boolean;
  onNavigate?: () => void;
};

export function AppSidebar({ mobile = false, onNavigate }: Props) {
  const pathname = usePathname();
  const { school, role } = useSchool();

  const storedCollapsed = useSidebarCollapsed();
  const collapsed = mobile ? false : storedCollapsed;

  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
  const [unreadQueries, setUnreadQueries] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const schoolLogo = school.logo
    ? `/api/v1/public/schools/${encodeURIComponent(school.slug)}/logo?v=${new Date(school.updatedAt).getTime()}`
    : null;

  useEffect(() => {
    if (!["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER", "ACCOUNTANT", "RECEPTIONIST"].includes(role)) return;

    const controller = new AbortController();

    fetch(`/api/v1/support/tickets/unread?schoolSlug=${encodeURIComponent(school.slug)}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { count?: number } | null) => {
        if (typeof data?.count === "number") setUnreadQueries(data.count);
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error("Unable to load unread query count", error);
        }
      });

    return () => controller.abort();
  }, [pathname, role, school.slug]);

  const visibleNavigation = useMemo(
    () =>
      navigation.flatMap((item) => {
        if (item.roles && !item.roles.includes(role)) return [];
        if (!item.children) return [item];

        const children = item.children.filter(
          (child) => !child.roles || child.roles.includes(role),
        );
        return children.length ? [{ ...item, children }] : [];
      }),
    [role],
  );

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredNavigation = useMemo(() => {
    if (!normalizedSearch) return visibleNavigation;

    return visibleNavigation.flatMap((item) => {
      if (item.title.toLowerCase().includes(normalizedSearch)) return [item];
      if (!item.children?.length) return [];

      const children = item.children.filter((child) =>
        child.title.toLowerCase().includes(normalizedSearch),
      );
      return children.length ? [{ ...item, children }] : [];
    });
  }, [normalizedSearch, visibleNavigation]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "k" || (!event.metaKey && !event.ctrlKey)) {
        return;
      }
      event.preventDefault();
      if (collapsed) setSidebarCollapsed(false);
      window.setTimeout(() => searchInputRef.current?.focus(), 0);
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [collapsed]);

  function toggleSidebar() {
    setSidebarCollapsed(!collapsed);
  }

  function toggleMenu(title: string) {
    setOpenMenus((current) => ({
      ...current,
      [title]: !current[title],
    }));
  }

  function handleNavigation() {
    setSearchQuery("");
    onNavigate?.();
  }

  const activeParents = useMemo(() => {
    const active = new Set<string>();

    for (const item of visibleNavigation) {
      if (!item.children?.length) {
        continue;
      }

      const hasActiveChild = item.children.some((child) => {
        const href = `/${school.slug}/${child.href}`;

        return isRouteActive(pathname, href, child.exact);
      });

      if (hasActiveChild) {
        active.add(item.title);
      }
    }

    return active;
  }, [pathname, school.slug, visibleNavigation]);

  return (
    <aside
      className={cn(
        "z-50 h-dvh shrink-0",
        "transition-[width] duration-300 ease-out",
        mobile
          ? "w-full p-0 [padding-bottom:env(safe-area-inset-bottom)]"
          : ["sticky top-0 p-3", collapsed ? "w-[82px]" : "w-[286px]"],
      )}
    >
      <div
        className={cn(
          "flex h-full flex-col overflow-hidden",
          mobile ? "rounded-none" : "rounded-[20px]",
          "border border-sidebar-border",
          "bg-sidebar",
          "shadow-[0_12px_40px_rgba(15,23,42,0.07)]",
        )}
      >
        {/* ==================================================================
            SCHOOL BRAND
            ================================================================== */}

        <div
          className={cn(
            "shrink-0 border-b border-sidebar-border p-3",
            collapsed && "px-2",
            mobile && "pr-12",
          )}
        >
          <Link
            href={`/${school.slug}/${role === "TEACHER" ? "teacher/dashboard" : "dashboard"}`}
            onClick={handleNavigation}
            className={cn(
              "group flex min-w-0 items-center rounded-2xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/60 to-violet-50/65 shadow-[0_9px_24px_rgba(79,70,229,.09)] transition hover:border-indigo-200 hover:shadow-[0_12px_30px_rgba(79,70,229,.13)]",
              collapsed ? "justify-center p-2" : "gap-3 p-3",
            )}
          >
            <SchoolLogo
              src={schoolLogo}
              schoolName={school.name}
              priority
              sizes="44px"
              className="size-11 rounded-xl shadow-[0_7px_18px_rgba(79,70,229,.14)] transition group-hover:scale-[1.03]"
            />
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p
                  title={school.name}
                  className="line-clamp-2 break-words text-[14px] font-extrabold leading-[1.15] tracking-[-0.02em] text-slate-900"
                >
                  {school.name}
                </p>
                <div className="mt-2 flex min-w-0 items-center gap-1.5">
                  <Image
                    src="/schooldb-app-logo.png"
                    alt=""
                    width={14}
                    height={14}
                    className="size-3.5 shrink-0 rounded-[4px] object-cover opacity-75"
                  />
                  <span className="truncate text-[8px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                    Powered by <span className="font-extrabold text-slate-600">SchoolDB</span>
                  </span>
                </div>
              </div>
            )}
          </Link>
        </div>

        {/* ==================================================================
            SEARCH
            ================================================================== */}

        {!collapsed && (
          <div className="px-3 pt-3">
            <div
              className={cn(
                "group flex h-9 w-full items-center gap-2",
                "rounded-lg",
                "border border-slate-200",
                "bg-slate-50/60",
                "px-3",
                "text-[11px]",
                "text-slate-400",
                "transition-all duration-200",
                "hover:border-indigo-200",
                "hover:bg-white",
                "hover:text-slate-600",
              )}
            >
              <Search className="size-3.5 text-slate-400 transition-colors group-hover:text-indigo-500" />
              <input
                ref={searchInputRef}
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search navigation..."
                aria-label="Search navigation"
                className="h-full min-w-0 flex-1 bg-transparent text-slate-700 outline-none placeholder:text-slate-400 [&::-webkit-search-cancel-button]:hidden"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    searchInputRef.current?.focus();
                  }}
                  className="rounded-md p-1 text-slate-400 transition hover:bg-white hover:text-slate-700"
                  aria-label="Clear navigation search"
                >
                  <X className="size-3.5" />
                </button>
              ) : (
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
              )}
            </div>
          </div>
        )}

        {/* ==================================================================
            NAVIGATION
            ================================================================== */}

        <nav
          className={cn(
            "flex-1 overscroll-contain overflow-y-auto py-4 sm:py-5",
            "[scrollbar-width:thin]",
            "[scrollbar-color:rgba(100,116,139,0.15)_transparent]",
            collapsed ? "px-2" : "px-3",
          )}
        >
          {!collapsed && (
            <p className="mb-2 px-3 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">
              {normalizedSearch ? "Search results" : "Workspace"}
            </p>
          )}

          <div className="space-y-1">
            {filteredNavigation.map((item) => {
              const hasChildren = Boolean(item.children?.length);

              /* ============================================================
                 PARENT WITH CHILDREN
                 ============================================================ */

              if (hasChildren) {
                const childIsActive = item.children!.some((child) => {
                  const href = `/${school.slug}/${child.href}`;

                  return isRouteActive(pathname, href, child.exact);
                });

                const isOpen =
                  Boolean(normalizedSearch) ||
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
                        aria-label={`Open ${item.title}`}
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
                      aria-expanded={isOpen}
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

                              const active = isRouteActive(
                                pathname,
                                href,
                                child.exact,
                              );

                              return (
                                <Link
                                  key={child.title}
                                  href={href}
                                  onClick={handleNavigation}
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

                                  {child.href === "queries" && unreadQueries > 0 && (
                                    <span className="ml-auto min-w-5 rounded-full bg-rose-100 px-1.5 py-0.5 text-center text-[10px] font-bold text-rose-700">
                                      {unreadQueries > 99 ? "99+" : unreadQueries}
                                    </span>
                                  )}
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
                      onClick={handleNavigation}
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
                  onClick={handleNavigation}
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
            {!filteredNavigation.length && !collapsed && (
              <div className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center">
                <Search className="mx-auto size-5 text-slate-300" />
                <p className="mt-2 text-xs font-semibold text-slate-600">
                  No navigation found
                </p>
                <p className="mt-1 text-[10px] text-slate-400">
                  Try another page or feature name.
                </p>
              </div>
            )}
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
              role="status"
            >
              <span className="size-1.5 rounded-full bg-emerald-500" />

              <span className="text-[10px] font-medium text-emerald-700/70">
                Local workspace online
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
                onClick={handleNavigation}
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

              {!mobile && (
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
              )}
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
