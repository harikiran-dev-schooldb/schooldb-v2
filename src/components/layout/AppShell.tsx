"use client";

import type { ReactNode } from "react";
import { useState } from "react";

import { AppHeader } from "./AppHeader";
import { AppSidebar } from "./AppSidebar";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";

type Props = {
  children: ReactNode;
};

export function AppShell({ children }: Props) {
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);

  return (
    <div className="min-h-screen overflow-x-clip bg-background">
      <div className="flex min-h-screen">
        {/* ================================================================
            SIDEBAR
            ================================================================ */}

        <div className="hidden print:hidden lg:block">
          <AppSidebar />
        </div>

        <Sheet
          open={mobileNavigationOpen}
          onOpenChange={setMobileNavigationOpen}
        >
          <SheetContent
            side="left"
            className="w-[min(88vw,320px)] gap-0 border-0 bg-transparent p-0 lg:hidden"
          >
            <SheetTitle className="sr-only">Main navigation</SheetTitle>
            <SheetDescription className="sr-only">
              Navigate to another area of the SchoolDB workspace.
            </SheetDescription>
            <AppSidebar
              mobile
              onNavigate={() => setMobileNavigationOpen(false)}
            />
          </SheetContent>
        </Sheet>

        {/* ================================================================
            MAIN APPLICATION AREA
            ================================================================ */}

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="print:hidden">
            <AppHeader
              onMenuClick={() => setMobileNavigationOpen(true)}
            />
          </div>

          <main className="min-w-0 flex-1">
            <div className="mx-auto w-full max-w-[1920px] px-3 py-4 print:max-w-none print:p-0 sm:px-5 sm:py-6 lg:px-6 xl:px-8 2xl:px-10">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
