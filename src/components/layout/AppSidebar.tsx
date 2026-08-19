"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { navigation } from "@/lib/navigation";
import { useSchool } from "@/contexts/school-context";
import { cn } from "@/lib/utils";
import { Building2, ChevronDown, Sparkles } from "lucide-react";

export function AppSidebar() {
  const pathname = usePathname();
  const { school } = useSchool();

  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  const toggleMenu = (title: string) => {
    setOpenMenus((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  return (
    <aside className="sticky top-0 flex h-screen w-72 shrink-0 flex-col border-r border-sidebar-border/50 bg-sidebar shadow-[20px_0_60px_rgba(15,23,42,0.15)] z-50">
      {/* Header */}
      <div className="px-5 pt-7">
        <div className="flex items-center gap-3 px-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sidebar-primary to-sidebar-primary/70 shadow-lg shadow-sidebar-primary/20 ring-1 ring-white/10">
            <Building2
              className="h-5 w-5 text-sidebar-primary-foreground"
              strokeWidth={2.4}
            />
          </div>

          <div>
            <p className="text-[15px] font-bold tracking-tight text-white">
              SchoolDB
            </p>
            <p className="text-[10px] font-bold tracking-[0.15em] text-sidebar-foreground/50 uppercase">
              Operations
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 shadow-inner shadow-black/20 backdrop-blur-md transition-colors hover:bg-white/10 cursor-default">
          <p className="truncate text-sm font-semibold text-white">
            {school.name}
          </p>
          <p className="mt-0.5 text-xs font-medium text-sidebar-foreground/50">
            Academic Workspace
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1.5 overflow-y-auto px-4 py-8 custom-scrollbar">
        <p className="px-3 pb-3 text-[10px] font-bold tracking-[0.2em] text-sidebar-foreground/40 uppercase">
          Workspace
        </p>

        {navigation.map((item) => {
          if (item.children) {
            const childIsActive = item.children.some(
              (child) => pathname === `/${school.slug}/${child.href}`,
            );
            const isOpen = openMenus[item.title] ?? childIsActive;

            return (
              <div key={item.title}>
                <button
                  type="button"
                  onClick={() => toggleMenu(item.title)}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    childIsActive
                      ? "text-white"
                      : "text-sidebar-foreground/70 hover:bg-white/5 hover:text-white",
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-5 w-5 shrink-0 transition-colors",
                      childIsActive
                        ? "text-sidebar-primary"
                        : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/80",
                    )}
                  />
                  <span className="flex-1 text-left">{item.title}</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-sidebar-foreground/40 transition-transform duration-300",
                      isOpen && "rotate-180 text-white",
                    )}
                  />
                </button>

                {isOpen && (
                  <div className="ml-5 mt-1.5 space-y-1 border-l border-white/10 pl-3">
                    {item.children.map((child) => {
                      const childHref = `/${school.slug}/${child.href}`;
                      const active = pathname === childHref;

                      return (
                        <Link
                          key={child.title}
                          href={childHref}
                          className={cn(
                            "block rounded-lg px-3 py-2 text-sm transition-all duration-200",
                            active
                              ? "bg-gradient-to-r from-sidebar-primary to-sidebar-primary/90 text-white shadow-md shadow-sidebar-primary/20 font-semibold"
                              : "text-sidebar-foreground/60 hover:bg-white/5 hover:text-white",
                          )}
                        >
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
          const active = pathname === href;

          return (
            <Link
              key={item.title}
              href={href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200",
                active
                  ? "bg-gradient-to-r from-sidebar-primary to-sidebar-primary/90 text-white shadow-md shadow-sidebar-primary/20 font-semibold"
                  : "font-medium text-sidebar-foreground/70 hover:bg-white/5 hover:text-white",
              )}
            >
              <item.icon
                className={cn(
                  "h-5 w-5 transition-colors",
                  active
                    ? "text-white"
                    : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/80",
                )}
              />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="m-5 mt-0 rounded-2xl border border-teal-500/20 bg-gradient-to-br from-teal-500/10 to-blue-500/5 p-4 shadow-lg backdrop-blur-md transition-all hover:border-teal-500/30">
        <div className="flex items-center gap-2 text-xs font-bold tracking-wide text-white">
          <div className="rounded-full bg-teal-500/20 p-1">
            <Sparkles className="size-3.5 text-teal-300" />
          </div>
          SchoolDB Pro
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-sidebar-foreground/60">
          Everything your team needs, beautifully designed in one place.
        </p>
      </div>
    </aside>
  );
}
