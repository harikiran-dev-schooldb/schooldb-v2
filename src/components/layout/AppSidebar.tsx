"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Building2, ChevronDown, Sparkles } from "lucide-react";

import { useSchool } from "@/contexts/school-context";
import { navigation } from "@/lib/navigation";
import { cn } from "@/lib/utils";

function isRouteActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebar() {
  const pathname = usePathname();
  const { school } = useSchool();

  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  function toggleMenu(title: string) {
    setOpenMenus((current) => ({
      ...current,
      [title]: !current[title],
    }));
  }

  return (
    <aside className="sticky top-0 z-50 flex h-screen w-72 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      {/* Brand */}
      <div className="px-5 pb-4 pt-6">
        <Link
          href={`/${school.slug}/dashboard`}
          className="flex items-center gap-3 px-1"
        >
          <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sidebar-primary to-emerald-400 shadow-lg shadow-black/20 ring-1 ring-white/10">
            <Building2
              className="size-5 text-sidebar-primary-foreground"
              strokeWidth={2.4}
            />
          </div>

          <div className="min-w-0">
            <p className="text-[15px] font-bold tracking-tight text-white">
              SchoolDB
            </p>

            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/45">
              School Operations
            </p>
          </div>
        </Link>

        {/* School Context */}
        <div className="mt-6 rounded-2xl border border-white/[0.08] bg-white/[0.045] p-3.5">
          <p className="truncate text-sm font-semibold text-white">
            {school.name}
          </p>

          <div className="mt-1 flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-sidebar-primary shadow-[0_0_10px_rgba(52,211,153,0.75)]" />

            <p className="truncate text-[11px] font-medium text-sidebar-foreground/50">
              Academic workspace
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-sidebar-foreground/35">
          Workspace
        </p>

        <div className="space-y-1">
          {navigation.map((item) => {
            if (item.children?.length) {
              const childIsActive = item.children.some((child) => {
                const childHref = `/${school.slug}/${child.href}`;

                return isRouteActive(pathname, childHref);
              });

              const isOpen = childIsActive || openMenus[item.title] === true;

              return (
                <div key={item.title}>
                  <button
                    type="button"
                    onClick={() => toggleMenu(item.title)}
                    className={cn(
                      "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                      childIsActive
                        ? "bg-white/[0.055] text-white"
                        : "text-sidebar-foreground/65 hover:bg-white/[0.055] hover:text-white",
                    )}
                  >
                    <item.icon
                      className={cn(
                        "size-[18px] shrink-0 transition-colors duration-200",
                        childIsActive
                          ? "text-sidebar-primary"
                          : "text-sidebar-foreground/45 group-hover:text-sidebar-foreground/75",
                      )}
                    />

                    <span className="flex-1 text-left">{item.title}</span>

                    <ChevronDown
                      className={cn(
                        "size-4 text-sidebar-foreground/35 transition-transform duration-200",
                        isOpen && "rotate-180 text-sidebar-foreground/75",
                      )}
                    />
                  </button>

                  {isOpen && (
                    <div className="relative ml-[22px] mt-1 space-y-1 border-l border-white/[0.08] py-1 pl-4">
                      {item.children.map((child) => {
                        const childHref = `/${school.slug}/${child.href}`;

                        const active = isRouteActive(pathname, childHref);

                        return (
                          <Link
                            key={child.title}
                            href={childHref}
                            className={cn(
                              "relative block rounded-xl px-3 py-2 text-[13px] transition-all duration-200",
                              active
                                ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-lg shadow-black/15"
                                : "text-sidebar-foreground/55 hover:bg-white/[0.05] hover:text-white",
                            )}
                          >
                            {active && (
                              <span className="absolute -left-[21px] top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-sidebar-primary ring-4 ring-sidebar" />
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

            const href = `/${school.slug}/${item.href}`;
            const active = isRouteActive(pathname, href);

            return (
              <Link
                key={item.title}
                href={href}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-black/15"
                    : "text-sidebar-foreground/65 hover:bg-white/[0.055] hover:text-white",
                )}
              >
                <item.icon
                  className={cn(
                    "size-[18px] shrink-0 transition-colors duration-200",
                    active
                      ? "text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/45 group-hover:text-sidebar-foreground/75",
                  )}
                />

                <span>{item.title}</span>

                {active && (
                  <span className="absolute right-3 size-1.5 rounded-full bg-white/70" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 pt-2">
        <div className="rounded-2xl border border-sidebar-primary/15 bg-sidebar-primary/[0.06] p-3.5">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-sidebar-primary/10 p-1.5">
              <Sparkles className="size-3.5 text-sidebar-primary" />
            </div>

            <span className="text-xs font-semibold text-white">
              SchoolDB Pro
            </span>
          </div>

          <p className="mt-2 text-[11px] leading-relaxed text-sidebar-foreground/45">
            Manage your school from one connected workspace.
          </p>
        </div>
      </div>
    </aside>
  );
}
