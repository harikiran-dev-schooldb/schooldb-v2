"use client";

import { FileDown, Printer } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export function ReportPageActions({ schoolSlug }: { schoolSlug: string }) {
  return (
    <div className="flex gap-2 print:hidden">
      <Button asChild variant="outline" size="sm">
        <Link href={`/${schoolSlug}/reports`}><FileDown className="size-4" />Exports</Link>
      </Button>
      <Button variant="outline" size="sm" onClick={() => window.print()}>
        <Printer className="size-4" />Print / Save PDF
      </Button>
    </div>
  );
}
