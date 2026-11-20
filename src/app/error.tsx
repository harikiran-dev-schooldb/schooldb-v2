"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function ApplicationError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(JSON.stringify({ event: "client_render_error", digest: error.digest ?? null, message: error.message }));
  }, [error]);

  return <main className="flex min-h-[60vh] items-center justify-center p-6"><section className="max-w-lg rounded-3xl border bg-card p-8 text-center shadow-sm"><AlertTriangle className="mx-auto size-10 text-amber-600" /><h1 className="mt-4 text-xl font-bold">This workspace could not be displayed</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Your data was not changed. Try loading the page again. If the problem continues, share the reference below with SchoolDB support.</p>{error.digest && <p className="mt-3 font-mono text-xs text-muted-foreground">Reference: {error.digest}</p>}<Button className="mt-6" onClick={reset}><RefreshCw className="size-4" />Try again</Button></section></main>;
}
