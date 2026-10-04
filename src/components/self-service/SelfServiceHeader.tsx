import Link from "next/link";
import { Building2, CalendarDays, GraduationCap, LogOut, Repeat2, Settings, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NotificationMenu } from "@/features/notifications/NotificationMenu";

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
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 pt-[env(safe-area-inset-top)] shadow-[0_1px_20px_rgba(15,23,42,0.04)] backdrop-blur-xl print:hidden">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-2 px-3 sm:px-6 lg:px-8">
        <Link href={`/${schoolSlug}/my`} className="flex min-w-0 items-center gap-2 sm:gap-3">
          <span className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-blue-600 text-white shadow-[0_10px_24px_rgba(79,70,229,0.28)] sm:size-11">
            <span className="absolute inset-0 bg-white/10" />
            <GraduationCap className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="line-clamp-2 max-w-28 text-xs font-bold leading-4 tracking-[-0.02em] min-[430px]:max-w-40 sm:max-w-none sm:text-[15px] sm:leading-5">{schoolName}</span>
            <span className="mt-0.5 hidden text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground min-[430px]:block">
              Student space
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="hidden sm:inline-flex">
            {role === "PARENT" ? "Parent" : "Student"}
          </Badge>
          {showStudentPicker && (
            <Button asChild variant="ghost" size="icon-sm" className="sm:h-9 sm:w-auto sm:px-3">
              <Link href={`/${schoolSlug}/my`} aria-label="Switch student">
                <Users className="size-4" />
                <span className="hidden sm:inline">Switch student</span>
              </Link>
            </Button>
          )}
          <Button asChild variant="ghost" size="icon-sm" className="hidden sm:inline-flex">
            <Link href="/choose-school" aria-label="Change school">
              <Building2 className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
            <Link href={`/${schoolSlug}/switch-account`}>
              <Repeat2 className="size-4" />
              Switch account
            </Link>
          </Button>
          <Button asChild variant="ghost" size="icon-sm">
            <Link href={`/${schoolSlug}/my/calendar`} aria-label="School calendar">
              <CalendarDays className="size-4" />
            </Link>
          </Button>
          <NotificationMenu
            schoolSlug={schoolSlug}
            notificationsHref={`/${schoolSlug}/my/notifications`}
            initialUnreadCount={unreadCount}
          />
          <Button asChild variant="ghost" size="icon-sm">
            <Link href={`/${schoolSlug}/my/settings`} aria-label="Account settings">
              <Settings className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="icon-sm" className="hidden sm:inline-flex">
            <Link href={`/${schoolSlug}/logout`} aria-label="Sign out">
              <LogOut className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
