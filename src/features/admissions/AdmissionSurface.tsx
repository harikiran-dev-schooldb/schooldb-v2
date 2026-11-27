import type { ReactNode } from "react";
import { ArrowUpRight, Sparkles, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function AdmissionHero({ eyebrow = "Admissions workspace", title, description, aside, children }: { eyebrow?: string; title: string; description: string; aside?: ReactNode; children?: ReactNode }) {
  return <section className="premium-hero relative overflow-hidden rounded-3xl border border-primary/15 p-5 sm:p-7">
    <div className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-primary/10 blur-3xl" />
    <div className="pointer-events-none absolute -bottom-28 left-1/3 size-52 rounded-full bg-violet-500/5 blur-3xl" />
    <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
      <div className="max-w-3xl"><div className="mb-4 grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20"><Sparkles className="size-6" /></div><p className="section-label">{eyebrow}</p><h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">{title}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>{children ? <div className="mt-5 flex flex-wrap gap-2">{children}</div> : null}</div>
      {aside ? <div className="w-full xl:w-auto">{aside}</div> : null}
    </div>
  </section>;
}

export function AdmissionMetric({ icon: Icon, label, value, helper, tone = "primary" }: { icon: LucideIcon; label: string; value: ReactNode; helper: string; tone?: "primary" | "success" | "warning" | "danger" }) {
  const toneClass = tone === "success" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : tone === "warning" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : tone === "danger" ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" : "bg-primary/10 text-primary";
  return <article className="premium-card rounded-2xl p-4 sm:p-5"><div className={cn("grid size-10 place-items-center rounded-xl", toneClass)}><Icon className="size-5" /></div><p className="mt-4 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">{label}</p><p className="mt-1 text-3xl font-black tracking-tight tabular-nums">{value}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{helper}</p></article>;
}

export function AdmissionAction({ href, icon: Icon, title, description }: { href: string; icon: LucideIcon; title: string; description: string }) {
  return <Link href={href} className="group premium-card relative min-h-36 overflow-hidden rounded-2xl p-5 transition duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
    <div className="flex items-start justify-between gap-3"><div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground"><Icon className="size-5" /></div><ArrowUpRight className="size-4 text-muted-foreground transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" /></div><h3 className="mt-4 font-bold tracking-tight">{title}</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
  </Link>;
}
