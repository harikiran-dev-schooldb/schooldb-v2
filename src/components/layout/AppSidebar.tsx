"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { navigation } from "@/lib/navigation";
import { useSchool } from "@/contexts/school-context";
import { cn } from "@/lib/utils";
import { Building2, Sparkles } from "lucide-react";

export function AppSidebar() {
  const pathname = usePathname();

  const { school } = useSchool();

  return (
    <aside className="sticky top-0 flex h-screen w-[17.5rem] shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="border-b border-sidebar-border px-5 pb-5 pt-6">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-black/10">
            <Building2 className="size-5" />
          </div>
          <div>
            <h1 className="font-heading text-lg font-semibold tracking-tight text-white">SchoolDB</h1>
            <p className="text-xs text-sidebar-foreground/60">School operations</p>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-sidebar-border bg-white/5 px-3 py-3">
          <p className="truncate text-sm font-medium text-white">{school.name}</p>
          <p className="mt-1 text-xs text-sidebar-foreground/55">Academic workspace</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-5">
        <p className="px-3 pb-2 text-[10px] font-semibold tracking-[0.16em] text-sidebar-foreground/45 uppercase">Workspace</p>
        {navigation.map((item) => {
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

      <div className="m-3 mt-0 rounded-xl border border-sidebar-border bg-white/5 p-3">
        <div className="flex items-center gap-2 text-xs font-medium text-white">
          <Sparkles className="size-3.5 text-sidebar-primary" />
          SchoolDB Pro
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-sidebar-foreground/55">Everything your team needs, in one place.</p>
      </div>
    </aside>
  );
}
