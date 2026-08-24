"use client";

import { Bell, ChevronDown, LogOut, Search, User } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

import { useSchool } from "@/contexts/school-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function formatRole(role: string) {
  return role
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function AppHeader() {
  const { role, user } = useSchool();
  const router = useRouter();

  const params = useParams<{ schoolSlug: string }>();
  const schoolSlug = params.schoolSlug;

  const initials =
    `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}` || "U";

  const handleLogout = () => {
    router.push(`/${schoolSlug}/logout`);
  };

  return (
    <header className="sticky top-0 z-40 h-[72px] border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="flex h-full items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Workspace context */}
        <div className="min-w-0">
          <p className="section-label">School workspace</p>

          <p className="mt-1 text-sm font-semibold tracking-tight text-foreground">
            {formatRole(role)} Portal
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Search */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Search"
            className="hidden rounded-xl text-muted-foreground transition-all hover:bg-card hover:text-foreground hover:shadow-sm sm:inline-flex"
          >
            <Search className="size-[18px]" />
          </Button>

          {/* Notifications */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Notifications"
            className="relative rounded-xl text-muted-foreground transition-all hover:bg-card hover:text-foreground hover:shadow-sm"
          >
            <Bell className="size-[18px]" />

            <span className="absolute right-2.5 top-2.5 size-2 rounded-full border-2 border-background bg-primary" />
          </Button>

          <div className="mx-2 hidden h-7 w-px bg-border sm:block" />

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="h-auto gap-3 rounded-2xl px-2 py-1.5 hover:bg-card hover:shadow-sm"
              >
                <Avatar className="size-9 border border-border bg-muted">
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

              {/* Profile */}
              <DropdownMenuItem
                className="cursor-pointer rounded-xl py-2.5"
                onClick={() => {
                  // Add profile route later
                }}
              >
                <User className="mr-2 size-4" />
                Profile
              </DropdownMenuItem>

              <DropdownMenuSeparator />

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
