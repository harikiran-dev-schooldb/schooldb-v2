"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, LoaderCircle, LockKeyhole, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Choice = { id: string; name: string };
const controlClass = "mt-2 block h-11 w-full rounded-xl border border-border/70 bg-background px-3 text-sm shadow-sm outline-none transition hover:border-primary/35 focus:border-primary focus:ring-2 focus:ring-primary/20";

export function PublicEnquiryForm({ slug, years, classes }: { slug: string; years: Choice[]; classes: Choice[] }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/v1/public/admissions/${slug}/enquire`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...Object.fromEntries(form), consent: form.get("consent") === "on" }) });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw Error(payload.message || "Unable to submit.");
      setDone(true);
      setMessage(payload.message || "Enquiry received.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to submit."); }
    finally { setBusy(false); }
  }

  if (done) return <div role="status" className="rounded-3xl border border-emerald-500/25 bg-emerald-500/[0.07] p-8 text-center shadow-sm"><div className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"><CheckCircle2 className="size-7" /></div><h2 className="mt-4 text-xl font-black">Enquiry submitted</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{message}</p><p className="mt-4 text-xs font-medium text-muted-foreground">The admissions team will contact you using the mobile number provided.</p></div>;

  return <form onSubmit={submit} className="premium-card overflow-hidden rounded-3xl">
    <div className="border-b border-border/60 bg-gradient-to-r from-primary/[0.08] via-muted/20 to-transparent p-5 sm:p-7"><div className="flex items-start gap-4"><div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20"><Sparkles className="size-6" /></div><div><p className="section-label">Start your journey</p><h2 className="mt-1 text-xl font-black tracking-tight sm:text-2xl">Tell us about your child</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Share the essentials and our admissions team will guide you through the next step.</p></div></div></div>
    <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-7">
      <label className="text-sm font-semibold">Academic year<select name="yearId" required className={controlClass}>{years.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}</select></label>
      <label className="text-sm font-semibold">Applying class<select name="classId" required className={controlClass}>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="text-sm font-semibold">Student name<Input className="mt-2 h-11 rounded-xl" required name="studentName" minLength={2} maxLength={255} autoComplete="name" placeholder="Child's full name" /></label>
      <label className="text-sm font-semibold">Parent or guardian<Input className="mt-2 h-11 rounded-xl" required name="parentName" minLength={2} maxLength={255} autoComplete="name" placeholder="Your full name" /></label>
      <label className="text-sm font-semibold">Date of birth<Input className="mt-2 h-11 rounded-xl" required type="date" name="dob" /></label>
      <label className="text-sm font-semibold">Mobile number<Input className="mt-2 h-11 rounded-xl" required name="mobile" pattern="[0-9]{10}" inputMode="tel" autoComplete="tel" placeholder="10-digit mobile number" /></label>
      <div hidden aria-hidden="true"><input name="website" tabIndex={-1} autoComplete="off" /></div>
      <label className="flex items-start gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4 text-sm leading-6 sm:col-span-2"><input className="mt-1 size-4 accent-primary" type="checkbox" required name="consent" /><span>I consent to the school storing these details to review and contact me about admission. This is an enquiry, not an application or admission confirmation.</span></label>
      <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between"><p className="flex items-center gap-2 text-xs text-muted-foreground"><LockKeyhole className="size-3.5" />Your information is shared only with the school admissions team.</p><Button className="h-11 rounded-xl px-6" disabled={busy || !years.length || !classes.length} type="submit">{busy ? <><LoaderCircle className="animate-spin" />Submitting…</> : <>Submit enquiry<Send /></>}</Button></div>
      {message ? <p role="alert" className="rounded-xl border border-rose-500/25 bg-rose-500/10 p-3 text-sm text-rose-700 dark:text-rose-300 sm:col-span-2">{message}</p> : null}
    </div>
  </form>;
}
