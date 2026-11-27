"use client";

import {
  BookOpenCheck,
  CalendarCheck,
  ClipboardList,
  Grid3X3,
  Home,
  IndianRupee,
  Megaphone,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useSchool } from "@/contexts/school-context";
import { isRouteAllowed } from "@/lib/route-access";
import { cn } from "@/lib/utils";

type DockItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

const roleItems: Record<string, DockItem[]> = {
  TEACHER: [
    { label: "Home", href: "teacher/dashboard", icon: Home },
    { label: "Attendance", href: "attendance", icon: CalendarCheck },
    { label: "Homework", href: "homework", icon: BookOpenCheck },
    { label: "Notices", href: "notification-inbox", icon: Megaphone },
  ],
  ACCOUNTANT: [
    { label: "Home", href: "dashboard", icon: Home },
    { label: "Fees", href: "fees/dashboard", icon: IndianRupee },
    { label: "Outstanding", href: "fees/outstanding", icon: ClipboardList },
    { label: "Students", href: "students", icon: UsersRound },
  ],
  RECEPTIONIST: [
    { label: "Home", href: "dashboard", icon: Home },
    { label: "Admissions", href: "admissions/dashboard", icon: ClipboardList },
    { label: "Students", href: "students", icon: UsersRound },
    { label: "Notices", href: "notification-inbox", icon: Megaphone },
  ],
};

const adminItems: DockItem[] = [
  { label: "Home", href: "dashboard", icon: Home },
  { label: "Students", href: "students", icon: UsersRound },
  { label: "Attendance", href: "attendance", icon: CalendarCheck },
  { label: "Exams", href: "exams", icon: BookOpenCheck },
];

function isActive(pathname: string, schoolSlug: string, href: string) {
  const target = `/${schoolSlug}/${href}`;
  if (href === "dashboard" || href === "teacher/dashboard") return pathname === target;
  return pathname === target || pathname.startsWith(`${target}/`);
}

export function MobileNavigationDock({ onMore }: { onMore: () => void }) {
  const pathname = usePathname();
  const { role, school } = useSchool();
  const candidates = roleItems[role] ?? adminItems;
  const items = candidates.filter((item) => isRouteAllowed(school, item.href)).slice(0, 4);

  return (
    <nav
      aria-label="Mobile workspace navigation"
      className="fixed inset-x-2 bottom-[max(0.5rem,env(safe-area-inset-bottom))] z-40 mx-auto max-w-xl print:hidden xl:hidden"
    >
      <div className="grid min-h-16 grid-flow-col auto-cols-fr items-stretch rounded-[1.6rem] border border-white/80 bg-card/92 p-1.5 shadow-[0_18px_50px_rgba(15,23,42,0.2)] ring-1 ring-border/50 backdrop-blur-2xl dark:border-white/10 dark:shadow-[0_20px_55px_rgba(0,0,0,0.45)]">
        {items.map((item) => {
          const active = isActive(pathname, school.slug, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={`/${school.slug}/${item.href}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-w-0 flex-col items-center justify-center gap-1 rounded-[1.15rem] px-1 py-2 text-[10px] font-semibold text-muted-foreground transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                active && "bg-primary/10 text-primary ring-1 ring-primary/15",
              )}
            >
              <Icon className="size-[19px]" aria-hidden="true" />
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={onMore}
          className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-[1.15rem] px-1 py-2 text-[10px] font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="Open all workspace navigation"
        >
          <Grid3X3 className="size-[19px]" aria-hidden="true" />
          <span>More</span>
        </button>
      </div>
    </nav>
  );
}
