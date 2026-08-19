"use client";

import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";

type Props = {
  children: ReactNode;
};

export function AppShell({ children }: Props) {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <AppSidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader />

          <main className="flex-1 px-5 py-7 md:px-8 md:py-9 xl:px-11">{children}</main>
        </div>
      </div>
    </div>
  );
}
