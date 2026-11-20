import Link from "next/link";

import { cn } from "@/lib/utils";

const views = [
  { key: "subject-performance", label: "Subject performance", href: "exams/subject-performance" },
  { key: "toppers", label: "Toppers", href: "toppers" },
  { key: "failures", label: "Failures", href: "failures" },
] as const;

export function ResultsAnalyticsNav({ schoolSlug, current }: { schoolSlug: string; current: (typeof views)[number]["key"] }) {
  return <nav aria-label="Results analytics" className="flex flex-wrap gap-2 rounded-2xl border bg-card p-2 shadow-sm">{views.map((view) => <Link key={view.key} href={`/${schoolSlug}/${view.href}`} aria-current={current === view.key ? "page" : undefined} className={cn("rounded-xl px-4 py-2 text-sm font-semibold transition", current === view.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>{view.label}</Link>)}</nav>;
}
