import Link from "next/link";
import { Bell, CalendarDays, GraduationCap, LogOut, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function SelfServiceHeader({
  schoolName,
  schoolSlug,
  role,
  showStudentPicker,
  unreadCount,
}: {
  schoolName: string;
  schoolSlug: string;
  role: string;
  showStudentPicker: boolean;
  unreadCount: number;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/70 bg-background/85 shadow-[0_1px_20px_rgba(15,23,42,0.04)] backdrop-blur-xl print:hidden">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href={`/${schoolSlug}/my`} className="flex items-center gap-3">
          <span className="relative flex size-11 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-blue-600 text-white shadow-[0_10px_24px_rgba(79,70,229,0.28)]">
            <span className="absolute inset-0 bg-white/10" />
            <GraduationCap className="size-5" />
          </span>
          <span>
            <span className="block text-[15px] font-bold tracking-[-0.02em]">{schoolName}</span>
            <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Student space
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="hidden sm:inline-flex">
            {role === "PARENT" ? "Parent" : "Student"}
          </Badge>
          {showStudentPicker && (
            <Button asChild variant="ghost" size="sm">
              <Link href={`/${schoolSlug}/my`}>
                <Users className="size-4" />
                Students
              </Link>
            </Button>
          )}
          <Button asChild variant="ghost" size="icon-sm">
            <Link href={`/${schoolSlug}/my/calendar`} aria-label="School calendar">
              <CalendarDays className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="icon-sm" className="relative">
            <Link href={`/${schoolSlug}/my/notifications`} aria-label={`Notifications, ${unreadCount} unread`}>
              <Bell className="size-4" />
              {unreadCount > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-indigo-600 px-1 text-center text-[10px] font-bold text-white">{unreadCount > 99 ? "99+" : unreadCount}</span>}
            </Link>
          </Button>
          <Button asChild variant="ghost" size="icon-sm">
            <Link href={`/${schoolSlug}/logout`} aria-label="Sign out">
              <LogOut className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
