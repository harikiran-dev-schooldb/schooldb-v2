"use client";

import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";

type Props = {
  children: ReactNode;
};

export function AppShell({ children }: Props) {
  return (
    <div className="min-h-screen">
      <div className="flex">
        <AppSidebar />

        <div className="flex flex-1 flex-col">
          <AppHeader />

          <main className="flex-1 px-5 py-6 md:px-8 md:py-8 xl:px-10">{children}</main>
        </div>
      </div>
    </div>
  );
}
