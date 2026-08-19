"use client";

import { useSchool } from "@/contexts/school-context";
import { Bell, ChevronDown, Search } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export function AppHeader() {
  const { school, role, user } = useSchool();

  return (
    <header className="sticky top-0 z-40 flex h-[78px] items-center justify-between border-b border-slate-200/60 bg-white/70 px-5 backdrop-blur-xl md:px-8 xl:px-11">
      <div>
        <p className="text-[10px] font-bold tracking-[0.2em] text-teal-600 uppercase">
          {role.replaceAll("_", " ")}
        </p>
        <h2 className="mt-1 text-[15px] font-bold tracking-tight text-slate-800">
          {school.name}
        </h2>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="hidden text-slate-500 hover:bg-white hover:text-slate-900 hover:shadow-sm sm:inline-flex"
        >
          <Search className="size-4.5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="relative text-slate-500 hover:bg-white hover:text-slate-900 hover:shadow-sm"
        >
          <Bell className="size-4.5" />
          {/* Premium glowing notification dot */}
          <span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.8)] ring-2 ring-white" />
        </Button>

        <div className="ml-2 flex items-center gap-3 border-l border-slate-200/60 pl-5">
          <Avatar className="size-9 border border-teal-100 bg-teal-50 shadow-sm transition-transform hover:scale-105 cursor-pointer">
            <AvatarFallback className="bg-transparent text-xs font-bold text-teal-700">
              {user.firstName?.[0] ?? "U"}
              {user.lastName?.[0] ?? ""}
            </AvatarFallback>
          </Avatar>
          <div className="hidden text-left sm:block">
            <p className="max-w-36 truncate text-sm font-bold text-slate-800">
              {user.firstName} {user.lastName}
            </p>
            <p className="max-w-36 truncate text-[11px] font-medium text-slate-500">
              {user.email}
            </p>
          </div>
          <ChevronDown className="hidden size-4 text-slate-400 transition-colors hover:text-slate-700 cursor-pointer sm:block" />
        </div>
      </div>
    </header>
  );
}
