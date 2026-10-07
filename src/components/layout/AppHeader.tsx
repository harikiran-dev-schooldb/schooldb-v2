"use client";

import {
  BookOpen,
  Building2,
  ChevronDown,
  LogOut,
  Menu,
  Repeat2,
  Search,
  User,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";

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
import { isRouteAllowed } from "@/lib/route-access";

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

  const params = useParams<{ schoolSlug: string }>();
  const schoolSlug = params.schoolSlug;

  const initials =
    `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}` || "U";

  const handleLogout = () => {
    router.push(`/${schoolSlug}/logout`);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[1920px] items-center justify-between gap-2 px-3 sm:h-[72px] sm:px-5 md:px-6 xl:px-8 2xl:px-10">
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
            <div className="schooldb-header-workspace-mark relative hidden size-10 shrink-0 items-center justify-center rounded-xl border border-indigo-100 text-indigo-600 min-[420px]:flex sm:size-11">
              <Building2 className="relative z-10 size-5" />
              <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-emerald-500 ring-2 ring-white" />
            </div>
            <div className="min-w-0">
              <p className="section-label hidden sm:block">School workspace</p>
              <p className="max-w-[46vw] truncate text-sm font-bold tracking-tight text-foreground sm:mt-1 sm:max-w-none">
                {formatRole(role)} Portal
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Search */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Search"
            className="hidden rounded-xl text-muted-foreground transition-all hover:bg-card hover:text-foreground hover:shadow-sm md:inline-flex"
          >
            <Search className="size-[18px]" />
          </Button>

          {isRouteAllowed(school, "notification-inbox") && (
            <NotificationMenu schoolSlug={schoolSlug} />
          )}

          <div className="mx-1 hidden h-7 w-px bg-border sm:block md:mx-2" />

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="h-auto gap-2 rounded-2xl px-1.5 py-1.5 hover:bg-card hover:shadow-sm sm:gap-3 sm:px-2"
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
