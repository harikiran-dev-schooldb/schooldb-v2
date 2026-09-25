import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Building2, School, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";

import { syncUser } from "@/lib/sync-user";

function formatRole(role: string) {
  return role
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function ChooseSchoolPage() {
  const user = await syncUser();
  if (!user) redirect("/login");

  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || "SchoolDB user";

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-indigo-50/70 to-violet-50 px-4 py-8 sm:py-12">
      <div className="pointer-events-none absolute -left-32 -top-32 size-96 rounded-full bg-indigo-300/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 size-96 rounded-full bg-violet-300/15 blur-3xl" />

      <div className="relative mx-auto w-full max-w-3xl">
        <header className="text-center">
          <Image
            src="/pwa-192.png"
            alt="SchoolDB"
            width={72}
            height={72}
            className="mx-auto rounded-2xl shadow-xl shadow-indigo-950/15"
            priority
          />
          <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
            SchoolDB mobile workspace
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Choose your school
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            Welcome, {name}. Select the school workspace you want to open.
          </p>
        </header>

        {user.memberships.length ? (
          <section className="mt-8 grid gap-4 sm:grid-cols-2">
            {user.memberships.map((membership) => (
              <Link
                key={membership.id}
                href={`/${membership.school.slug}`}
                className="group rounded-3xl border border-white/80 bg-white/90 p-5 shadow-[0_16px_45px_rgba(15,23,42,0.07)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-xl"
              >
                <div className="flex items-start gap-4">
                  <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/10">
                    {membership.school.logo ? (
                      <span
                        role="img"
                        aria-label={`${membership.school.name} logo`}
                        className="size-full bg-cover bg-center"
                        style={{ backgroundImage: `url(${JSON.stringify(membership.school.logo)})` }}
                      />
                    ) : (
                      <School className="size-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-base font-bold text-foreground">
                      {membership.school.name}
                    </h2>
                    <p className="mt-1 text-xs font-semibold text-primary">
                      {formatRole(membership.role)}
                    </p>
                    <div className="mt-4 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <ShieldCheck className="size-3.5 text-emerald-600" />
                        Active workspace
                      </span>
                      <span className="inline-flex items-center gap-1 font-bold text-primary">
                        Open <ArrowRight className="size-3.5 transition group-hover:translate-x-1" />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </section>
        ) : (
          <section className="mt-8 rounded-3xl border border-white/80 bg-white/90 p-8 text-center shadow-xl backdrop-blur-xl">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Building2 className="size-6" />
            </div>
            <h2 className="mt-4 font-bold">No active school found</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Ask your school administrator to add this account to the school workspace.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
