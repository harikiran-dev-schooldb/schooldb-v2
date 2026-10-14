"use client";

import { useClerk, useSignIn } from "@clerk/nextjs";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  LoaderCircle,
  LogOut,
  UserRoundCog,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { SchoolLogo } from "@/components/branding/SchoolLogo";

type AccountChoice = {
  id: string;
  clerkUserId: string;
  role: string;
  name: string;
  detail: string;
  current: boolean;
};

type ApiEnvelope<T> = { success: boolean; data: T; message?: string };

function formatRole(role: string) {
  return role
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function AccountSwitcher({
  schoolSlug,
  schoolName,
  schoolLogo,
}: {
  schoolSlug: string;
  schoolName: string;
  schoolLogo: string | null;
}) {
  const router = useRouter();
  const { client, session, setActive } = useClerk();
  const { fetchStatus, signIn } = useSignIn();
  const [accounts, setAccounts] = useState<AccountChoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/v1/account-switch", {
          cache: "no-store",
          signal: controller.signal,
        });
        const result = (await response.json()) as ApiEnvelope<{
          accounts: AccountChoice[];
        }>;
        if (!response.ok || !result.success) {
          throw new Error(result.message || "Unable to load your accounts.");
        }
        setAccounts(result.data.accounts);
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load your accounts.",
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, []);

  async function navigateToPortal() {
    window.sessionStorage.setItem("schooldb-workspace-transition", schoolSlug);
    router.replace(`/${schoolSlug}`);
    router.refresh();
  }

  async function switchAccount(account: AccountChoice) {
    if (account.current || switchingId || fetchStatus === "fetching") return;
    setSwitchingId(account.id);
    window.sessionStorage.setItem("schooldb-workspace-transition", schoolSlug);
    setError(null);
    try {
      const existingSession = client.sessions.find(
        (session) => session.user?.id === account.clerkUserId,
      );
      if (existingSession) {
        await setActive({
          session: existingSession.id,
          navigate: async ({ decorateUrl }) => {
            window.location.assign(decorateUrl(`/${schoolSlug}`));
          },
        });
        return;
      }

      const response = await fetch("/api/v1/account-switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: account.id }),
      });
      const result = (await response.json()) as ApiEnvelope<{
        current: boolean;
        token: string | null;
      }>;
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Account switch failed.");
      }
      if (result.data.current) return void (await navigateToPortal());
      if (!result.data.token) throw new Error("Account switch could not be completed.");

      // Clerk multi-session is not required for SchoolDB account switching.
      // End the current session first, then consume the short-lived ticket for
      // the selected account. The school root resolves the new role and sends
      // the user to the correct portal.
      // End only the active session. Clerk's top-level signOut() performs its
      // configured post-sign-out navigation, which briefly exposes the public
      // schooldb.co.in page before the replacement ticket is redeemed.
      await session?.end();

      const ticketResult = await signIn.ticket({ ticket: result.data.token });
      if (ticketResult.error) throw ticketResult.error;
      if (signIn.status !== "complete") {
        throw new Error("Account switch could not be completed.");
      }
      const finalizeResult = await signIn.finalize({
        navigate: async ({ decorateUrl }) => {
          window.location.assign(decorateUrl(`/${schoolSlug}`));
        },
      });
      if (finalizeResult.error) throw finalizeResult.error;
    } catch (switchError) {
      setError(
        switchError instanceof Error
          ? switchError.message
          : "Account switch failed.",
      );
      window.sessionStorage.removeItem("schooldb-workspace-transition");
      setSwitchingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      {switchingId && (
        <div
          className="schooldb-workspace-launch fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
          role="status"
          aria-live="polite"
          aria-label={`Switching account for ${schoolName}`}
        >
          <div className="schooldb-workspace-grid absolute inset-0" aria-hidden="true" />
          <div className="schooldb-workspace-launch-flare absolute size-44 rounded-full" aria-hidden="true" />
          <div className="schooldb-workspace-launch-content relative flex w-[min(88vw,420px)] flex-col items-center text-center">
            <div className="relative flex size-36 items-center justify-center sm:size-40">
              <div className="schooldb-workspace-ring schooldb-workspace-ring-one absolute inset-0 rounded-full border border-indigo-200/70" />
              <div className="schooldb-workspace-ring schooldb-workspace-ring-two absolute inset-4 rounded-full border border-indigo-100" />
              <div className="schooldb-workspace-logo-halo absolute inset-7 rounded-[32px]" />
              <SchoolLogo
                src={schoolLogo}
                schoolName={schoolName}
                sizes="88px"
                className="schooldb-shared-logo relative size-[88px] rounded-[25px] border-white shadow-[0_20px_55px_rgba(15,23,42,.16)] ring-8 ring-white/70"
                priority
              />
              <span className="absolute -bottom-1 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-indigo-100 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-indigo-600 shadow-lg">
                <LoaderCircle className="size-3.5 animate-spin" />
                Switching
              </span>
            </div>
            <p className="mt-8 text-[10px] font-black uppercase tracking-[0.22em] text-indigo-600">
              Secure account change
            </p>
            <h2 className="mt-3 text-2xl font-black tracking-[-0.035em] text-slate-950 sm:text-3xl">
              Switching account or role
            </h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              Preparing your {schoolName} workspace
            </p>
            <div className="mt-7 h-1.5 w-full overflow-hidden rounded-full border border-slate-200/80 bg-slate-100/90 shadow-inner" aria-hidden="true">
              <div className="schooldb-workspace-progress h-full rounded-full" />
            </div>
          </div>
        </div>
      )}
      <div className="mx-auto max-w-lg">
        <Button asChild variant="ghost" className="mb-4">
          <Link href={`/${schoolSlug}`}>
            <ArrowLeft className="size-4" />
            Back to portal
          </Link>
        </Button>
        <section className="rounded-3xl border bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">
            {schoolName}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Switch account or role</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Choose another profile linked to your verified mobile number. You will not need another OTP.
          </p>

          {loading ? (
            <div className="flex min-h-44 items-center justify-center"><LoaderCircle className="size-7 animate-spin text-indigo-600" /></div>
          ) : error && accounts.length === 0 ? (
            <p className="mt-6 rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</p>
          ) : (
            <div className="mt-6 space-y-3">
              {accounts.map((account) => (
                <button
                  key={account.id}
                  type="button"
                  disabled={account.current || switchingId !== null}
                  onClick={() => void switchAccount(account)}
                  className="flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition hover:border-indigo-300 hover:bg-indigo-50/40 disabled:cursor-default disabled:bg-slate-50"
                >
                  <span className="flex size-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><UserRoundCog className="size-5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{account.name}</span>
                    <span className="text-xs text-slate-500">{formatRole(account.role)}{account.detail ? ` · ${account.detail}` : ""}</span>
                  </span>
                  {switchingId === account.id ? <LoaderCircle className="size-5 animate-spin" /> : account.current ? <CheckCircle2 className="size-5 text-emerald-600" /> : <ChevronRight className="size-5 text-slate-300" />}
                </button>
              ))}
              {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            </div>
          )}

          <div className="mt-7 border-t pt-5">
            <Button asChild variant="ghost" className="text-red-600 hover:text-red-700">
              <Link href={`/${schoolSlug}/logout`}><LogOut className="size-4" />Sign out completely</Link>
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
