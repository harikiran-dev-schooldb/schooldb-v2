"use client";

import { useActionState, useEffect } from "react";
import { ScanSearch } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { generateEarlyWarnings } from "./actions";

export function EarlyWarningScanButton({ schoolSlug }: { schoolSlug: string }) {
  const [state, action, pending] = useActionState(generateEarlyWarnings.bind(null, schoolSlug), { error: "", success: false });
  useEffect(() => {
    if (state.success) toast.success(state.message || "Risk scan completed.");
    if (state.error) toast.error(state.error);
  }, [state]);
  return <form action={action}><Button variant="outline" disabled={pending}><ScanSearch className="size-4" />{pending ? "Scanning…" : "Scan academic risk"}</Button></form>;
}
