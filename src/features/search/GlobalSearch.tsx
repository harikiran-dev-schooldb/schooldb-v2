"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, LoaderCircle, Search } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type SearchResult = {
  id: string;
  type: "Student" | "Teacher" | "Admission" | "Receipt" | "Query";
  title: string;
  description: string;
  href: string;
};

type ApiEnvelope = {
  success: boolean;
  data?: SearchResult[];
  message?: string;
};

export function GlobalSearch({ schoolSlug }: { schoolSlug: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(focusTimer);
  }, [open]);

  useEffect(() => {
    const normalized = query.trim();
    if (!open || normalized.length < 2) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/v1/search?q=${encodeURIComponent(normalized)}`, {
          signal: controller.signal,
          headers: {
            "x-school-slug": schoolSlug,
            "x-school-pathname": "/api/v1/search",
            "x-school-method": "GET",
          },
        });
        const payload = (await response.json()) as ApiEnvelope;
        if (!response.ok || !payload.success) {
          throw new Error(payload.message || "Search is unavailable.");
        }
        setResults(payload.data || []);
      } catch (searchError) {
        if (searchError instanceof DOMException && searchError.name === "AbortError") return;
        setResults([]);
        setError(searchError instanceof Error ? searchError.message : "Search is unavailable.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, query, schoolSlug]);

  function openResult(result: SearchResult) {
    setOpen(false);
    setQuery("");
    setResults([]);
    router.push(result.href);
  }

  function updateQuery(value: string) {
    setQuery(value);
    if (value.trim().length < 2) {
      setResults([]);
      setLoading(false);
      setError("");
    }
  }

  function updateOpen(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setQuery("");
      setResults([]);
      setLoading(false);
      setError("");
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Search SchoolDB"
        title="Search SchoolDB (⌘K)"
        className="rounded-xl text-muted-foreground transition-all hover:bg-card hover:text-foreground hover:shadow-sm"
        onClick={() => setOpen(true)}
      >
        <Search className="size-[18px]" />
      </Button>

      <Dialog open={open} onOpenChange={updateOpen}>
        <DialogContent className="max-w-2xl gap-3 p-4 sm:p-5">
          <DialogHeader>
            <DialogTitle>Search SchoolDB</DialogTitle>
            <DialogDescription>
              Find students, teachers, admissions, receipts, and support queries you can access.
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(event) => updateQuery(event.target.value)}
              placeholder="Search by name, admission number, receipt, or ticket..."
              aria-label="Search SchoolDB records"
              className="pl-10 pr-10"
            />
            {loading && (
              <LoaderCircle className="absolute right-3.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-primary" />
            )}
          </div>

          <div className="max-h-[55dvh] overflow-y-auto rounded-xl border bg-card">
            {error ? (
              <p className="p-5 text-sm text-red-600">{error}</p>
            ) : query.trim().length < 2 ? (
              <p className="p-5 text-sm text-muted-foreground">Enter at least two characters.</p>
            ) : !loading && results.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground">No accessible records match this search.</p>
            ) : (
              <div className="divide-y">
                {results.map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-muted/50 focus:bg-muted/50 focus:outline-none"
                    onClick={() => openResult(result)}
                  >
                    <span className="w-20 shrink-0 rounded-full bg-primary/10 px-2 py-1 text-center text-[10px] font-bold uppercase tracking-wide text-primary">
                      {result.type}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{result.title}</span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">{result.description}</span>
                    </span>
                    <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground">
            Tip: press <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono">⌘K</kbd> or <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono">Ctrl K</kbd> anywhere.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
