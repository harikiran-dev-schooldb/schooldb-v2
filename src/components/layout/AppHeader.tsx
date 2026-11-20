"use client";

import {
  BookOpen,
  Building2,
  ChevronDown,
  LogOut,
  Menu,
  Repeat2,
  User,
} from "lucide-react";
import { useParams, usePathname, useRouter } from "next/navigation";

import { useSchool } from "@/contexts/school-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationMenu } from "@/features/notifications/NotificationMenu";
import { GlobalSearch } from "@/features/search/GlobalSearch";
import { navigation } from "@/lib/navigation";
import { isRouteAllowed } from "@/lib/route-access";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

function currentPageTitle(pathname: string, schoolSlug: string) {
  const route = pathname.replace(new RegExp(`^/${schoolSlug}/?`), "").replace(/\/$/, "");
  const matches = navigation.flatMap((item) =>
    item.children?.length
      ? item.children.map((child) => ({ title: child.title, href: child.href }))
      : [{ title: item.title, href: item.href }],
  ).filter((entry): entry is { title: string; href: string } => Boolean(entry.href));
  const match = matches
    .filter(({ href }) => route === href || route.startsWith(`${href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];

  if (match) return match.title;
  if (!route) return "Dashboard";
  return route.split("/").at(-1)?.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) ?? "Workspace";
}

function formatRole(role: string) {
  return role
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

type Props = {
  onMenuClick?: () => void;
};

export function AppHeader({ onMenuClick }: Props) {
  const { role, school, user } = useSchool();
  const router = useRouter();
  const pathname = usePathname();

  const params = useParams<{ schoolSlug: string }>();
  const schoolSlug = params.schoolSlug;
  const pageTitle = currentPageTitle(pathname, schoolSlug);

  const initials =
    `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}` || "U";

  const handleLogout = () => {
    router.push(`/${schoolSlug}/logout`);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-indigo-100/70 bg-background/80 pt-[env(safe-area-inset-top)] shadow-[0_8px_30px_rgba(15,23,42,0.035)] backdrop-blur-2xl dark:border-white/[0.07] dark:shadow-[0_8px_30px_rgba(0,0,0,0.18)]">
      <div className="mx-auto flex h-16 w-full max-w-[1920px] items-center justify-between gap-2 px-3 sm:h-[76px] sm:px-5 md:px-6 xl:px-8 2xl:px-10">
        {/* Workspace context */}
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Open main navigation"
            className="size-10 shrink-0 rounded-xl border border-border/70 bg-card/80 shadow-sm xl:hidden"
            onClick={onMenuClick}
          >
            <Menu className="size-5" />
          </Button>

          <div className="schooldb-header-context flex min-w-0 items-center gap-3">
            <div className="schooldb-header-workspace-mark relative hidden size-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-indigo-200/70 bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 text-white shadow-[0_10px_24px_rgba(79,70,229,0.22)] min-[420px]:flex sm:size-11">
              <span className="absolute inset-x-1 top-0 h-px bg-white/70" />
              <Building2 className="relative z-10 size-5" />
              <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-emerald-300 ring-2 ring-indigo-600" />
            </div>
            <div className="min-w-0">
              <div className="hidden items-center gap-2 sm:flex">
                <p className="section-label">School workspace</p>
                <span className="size-1 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.12)]" />
                <span className="max-w-52 truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{school.name}</span>
              </div>
              <p className="max-w-[46vw] truncate text-sm font-extrabold tracking-[-0.025em] text-foreground sm:mt-1 sm:max-w-[480px] sm:text-base">
                {pageTitle}
              </p>
              <p className="hidden text-[11px] font-medium text-muted-foreground md:block">{formatRole(role)} portal</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 rounded-2xl border border-border/60 bg-card/55 p-1 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:gap-2 sm:p-1.5">
          <GlobalSearch schoolSlug={schoolSlug} />

          <ThemeToggle />

          {isRouteAllowed(school, "notification-inbox") && (
            <NotificationMenu schoolSlug={schoolSlug} />
          )}

          <div className="mx-1 hidden h-7 w-px bg-border/80 sm:block md:mx-2" />

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="h-auto gap-2 rounded-xl px-1.5 py-1.5 hover:bg-background hover:shadow-sm sm:gap-3 sm:px-2"
              >
                <Avatar className="size-9 border border-border bg-muted">
                  <AvatarImage
                    src={user.imageUrl ?? undefined}
                    alt={`${user.firstName ?? "User"} profile`}
                  />
                  <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                <div className="hidden min-w-0 text-left md:block">
                  <p className="max-w-40 truncate text-sm font-semibold text-foreground">
                    {user.firstName} {user.lastName}
                  </p>

                  <p className="max-w-40 truncate text-[11px] text-muted-foreground">
                    {formatRole(role)}
                  </p>
                </div>

                <ChevronDown className="hidden size-4 text-muted-foreground md:block" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              sideOffset={8}
              className="w-56 rounded-2xl border-border/70 bg-background/95 p-2 shadow-xl backdrop-blur-xl"
            >
              {/* User information */}
              <div className="px-3 py-2">
                <p className="truncate text-sm font-semibold text-foreground">
                  {user.firstName} {user.lastName}
                </p>

                <p className="truncate text-xs text-muted-foreground">
                  {formatRole(role)}
                </p>
              </div>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                className="cursor-pointer rounded-xl py-2.5"
                onClick={() => router.push(`/${schoolSlug}/user-guide`)}
              >
                <BookOpen className="mr-2 size-4" />
                User guide
              </DropdownMenuItem>

              {/* Profile */}
              {isRouteAllowed(school, "settings") && (
                <>
                  <DropdownMenuItem
                    className="cursor-pointer rounded-xl py-2.5"
                    onClick={() => router.push(`/${schoolSlug}/settings`)}
                  >
                    <User className="mr-2 size-4" />
                    Profile
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />
                </>
              )}

              <DropdownMenuItem
                className="cursor-pointer rounded-xl py-2.5"
                onClick={() => router.push("/choose-school")}
              >
                <Building2 className="mr-2 size-4" />
                Change school
              </DropdownMenuItem>

              <DropdownMenuItem
                className="cursor-pointer rounded-xl py-2.5"
                onClick={() => router.push(`/${schoolSlug}/switch-account`)}
              >
                <Repeat2 className="mr-2 size-4" />
                Switch account or role
              </DropdownMenuItem>

              {/* Logout */}
              <DropdownMenuItem
                className="cursor-pointer rounded-xl py-2.5 text-red-600 focus:bg-red-50 focus:text-red-600"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 size-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
