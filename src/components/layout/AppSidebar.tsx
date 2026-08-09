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
    <aside className="flex h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar">
      {/* Header */}
      <div className="px-3 pt-5">
        <div className="flex items-center gap-2 px-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
            <Building2 className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>

          <div>
            <p className="text-sm font-semibold text-white">SchoolDB</p>
            <p className="text-xs text-sidebar-foreground/55">
              School operations
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-sidebar-border bg-white/5 px-3 py-3">
          <p className="truncate text-sm font-medium text-white">
            {school.name}
          </p>

          <p className="mt-1 text-xs text-sidebar-foreground/55">
            Academic workspace
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
        <p className="px-3 pb-2 text-[10px] font-semibold tracking-[0.16em] text-sidebar-foreground/45 uppercase">
          Workspace
        </p>

        {navigation.map((item) => {
          /*
           * Parent menu
           */
          if (item.children) {
            const childIsActive = item.children.some((child) => {
              const childHref = `/${school.slug}/${child.href}`;

              return pathname === childHref;
            });

            const isOpen = openMenus[item.title] ?? childIsActive;

            return (
              <div key={item.title}>
                <button
                  type="button"
                  onClick={() => toggleMenu(item.title)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                    childIsActive
                      ? "text-sidebar-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />

                  <span className="flex-1 text-left">{item.title}</span>

                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      isOpen && "rotate-180",
                    )}
                  />
                </button>

                {isOpen && (
                  <div className="ml-5 mt-1 space-y-1 border-l border-sidebar-border pl-3">
                    {item.children.map((child) => {
                      const childHref = `/${school.slug}/${child.href}`;

                      const active = pathname === childHref;

                      return (
                        <Link
                          key={child.title}
                          href={childHref}
                          className={cn(
                            "block rounded-lg px-3 py-2 text-sm transition-all",
                            active
                              ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                              : "text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
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

          /*
           * Normal menu item
           */
          const href = `/${school.slug}/${item.href}`;
          const active = pathname === href;

          return (
            <Link
              key={item.title}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <item.icon className="h-5 w-5" />

              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="m-3 mt-0 rounded-xl border border-sidebar-border bg-white/5 p-3">
        <div className="flex items-center gap-2 text-xs font-medium text-white">
          <Sparkles className="size-3.5 text-sidebar-primary" />
          SchoolDB Pro
        </div>

        <p className="mt-1 text-[11px] leading-relaxed text-sidebar-foreground/55">
          Everything your team needs, in one place.
        </p>
      </div>
    </aside>
  );
}
