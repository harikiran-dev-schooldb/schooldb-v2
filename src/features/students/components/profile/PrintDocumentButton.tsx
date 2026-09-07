"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintDocumentButton() {
  return <Button className="print:hidden" onClick={() => window.print()}><Printer className="size-4" /> Print / save PDF</Button>;
}
