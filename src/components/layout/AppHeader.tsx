"use client";

import { useSchool } from "@/contexts/school-context";
import { Bell, ChevronDown, Search } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export function AppHeader() {
  const { school, role, user } = useSchool();

  return (
    <header className="flex h-[78px] items-center justify-between border-b border-border/75 bg-background px-5 md:px-8 xl:px-11">
      <div>
        <p className="text-[10px] font-bold tracking-[0.16em] text-primary uppercase">{role.replaceAll("_", " ")}</p>
        <h2 className="mt-1 text-[15px] font-bold tracking-tight">{school.name}</h2>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="hidden rounded-xl text-muted-foreground hover:bg-card hover:text-foreground sm:inline-flex"><Search /></Button>
        <Button variant="ghost" size="icon" className="relative rounded-xl text-muted-foreground hover:bg-card hover:text-foreground"><Bell /><span className="absolute right-2.5 top-2.5 size-1.5 rounded-full bg-primary ring-2 ring-background" /></Button>
        <div className="ml-2 flex items-center gap-2.5 border-l border-border pl-4">
          <Avatar className="size-9 border border-border bg-primary/10">
            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{user.firstName?.[0] ?? "U"}{user.lastName?.[0] ?? ""}</AvatarFallback>
          </Avatar>
          <div className="hidden text-left sm:block">
            <p className="max-w-36 truncate text-sm font-semibold">{user.firstName} {user.lastName}</p>
            <p className="max-w-36 truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
          <ChevronDown className="hidden size-4 text-muted-foreground sm:block" />
        </div>
      </div>
    </header>
  );
}
