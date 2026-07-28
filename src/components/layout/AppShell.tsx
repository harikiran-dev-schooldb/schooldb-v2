"use client";

import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";

type Props = {
  children: ReactNode;
};

export function AppShell({ children }: Props) {
  return (
    <div className="min-h-screen bg-muted/30">
      <div className="flex">
        <AppSidebar />

        <div className="flex flex-1 flex-col">
          <AppHeader />

          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
