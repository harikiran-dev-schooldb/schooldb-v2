"use client";

import { SignIn, useSignIn, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Banknote,
  CalendarCheck,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  LoaderCircle,
  LockKeyhole,
  School,
  ShieldCheck,
  Users,
  UserRoundCog,
} from "lucide-react";
import { toast } from "sonner";

import OTPLogin from "./OTPLogin";

const FEATURES = [
  {
    title: "Student enrollment",
    description:
      "Student profiles, contacts, and academic history—all in one secure place.",
    icon: Users,
    color: "from-orange-500 to-amber-400",
  },
  {
    title: "Fee management",
    description:
      "Clear installments, payment history, receipts, and outstanding balances.",
    icon: Banknote,
    color: "from-emerald-500 to-teal-400",
  },
  {
    title: "Smart attendance",
    description:
      "Daily attendance records and progress available whenever families need them.",
    icon: CalendarCheck,
    color: "from-blue-500 to-cyan-400",
  },
  {
    title: "Exams & results",
    description:
      "Schedules, marks, report cards, and academic progress in a single student space.",
    icon: GraduationCap,
    color: "from-violet-500 to-fuchsia-500",
  },
];

type Props = { schoolSlug: string; schoolName: string };
type LoginMode = "OTP" | "PASSWORD";
type AccountChoice = { id: string; role: string; name: string };

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

export function TenantOtpSignIn({ schoolSlug, schoolName }: Props) {
  const router = useRouter();
  const { isLoaded: userLoaded, isSignedIn } = useUser();
  const { fetchStatus: signInStatus, signIn } = useSignIn();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [currentFeature, setCurrentFeature] = useState(0);
  const [loginMode, setLoginMode] = useState<LoginMode>("OTP");
  const [accountChoices, setAccountChoices] = useState<AccountChoice[]>([]);
  const [challengeId, setChallengeId] = useState("");
  const otpInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setInterval(
      () => setCurrentFeature((current) => (current + 1) % FEATURES.length),
      5_000,
    );
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (pendingVerification) otpInputRef.current?.focus();
  }, [pendingVerification]);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const timer = window.setInterval(
      () => setResendTimer((current) => Math.max(0, current - 1)),
      1_000,
    );
    return () => window.clearInterval(timer);
  }, [resendTimer]);

  useEffect(() => {
    if (userLoaded && isSignedIn) router.replace(`/${schoolSlug}`);
  }, [isSignedIn, router, schoolSlug, userLoaded]);

  const handleSendOTP = async () => {
    if (isSending) return;
    if (!/^[6-9]\d{9}$/.test(phoneNumber)) {
      toast.error("Enter a valid 10-digit mobile number.");
      return;
    }
    setIsSending(true);
    try {
      const response = await fetch("/api/v1/public/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneNumber, schoolSlug }),
      });
      const data = (await response.json()) as {
        error?: string;
        message?: string;
      };
      if (!response.ok) throw new Error(data.error || "Failed to send OTP.");
      setPendingVerification(true);
      setOtpCode("");
      setResendTimer(30);
      toast.success("Verification code sent through WhatsApp.");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setIsSending(false);
    }
  };

  const completeSignIn = async (token: string) => {
    const ticketResult = await signIn.ticket({ ticket: token });
    if (ticketResult.error) throw ticketResult.error;
    if (signIn.status !== "complete")
      throw new Error("Authentication could not be completed.");
    const finalizeResult = await signIn.finalize({
      navigate: ({ decorateUrl }) =>
        router.replace(decorateUrl(`/${schoolSlug}`)),
    });
    if (finalizeResult.error) throw finalizeResult.error;
  };

  const handleSignIn = async () => {
    if (isSending || signInStatus === "fetching") return;
    if (!/^\d{6}$/.test(otpCode)) {
      toast.error("Enter the complete 6-digit code.");
      return;
    }
    setIsSending(true);
    try {
      const response = await fetch("/api/v1/public/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "VERIFY",
          phone: phoneNumber,
          otp: otpCode,
          schoolSlug,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        token?: string;
        requiresAccountSelection?: boolean;
        challengeId?: string;
        accounts?: AccountChoice[];
      };
      if (!response.ok)
        throw new Error(data.error || "OTP verification failed.");
      if (
        data.requiresAccountSelection &&
        data.challengeId &&
        data.accounts?.length
      ) {
        setChallengeId(data.challengeId);
        setAccountChoices(data.accounts);
        toast.success("Mobile number verified. Choose the account to open.");
        return;
      }
      if (!data.token)
        throw new Error("Authentication could not be completed.");
      await completeSignIn(data.token);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setIsSending(false);
    }
  };

  const handleAccountSelect = async (accountId: string) => {
    if (isSending || signInStatus === "fetching" || !challengeId) return;
    setIsSending(true);
    try {
      const response = await fetch("/api/v1/public/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SELECT",
          challengeId,
          accountId,
          schoolSlug,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        token?: string;
      };
      if (!response.ok || !data.token)
        throw new Error(data.error || "Account selection failed.");
      await completeSignIn(data.token);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setIsSending(false);
    }
  };

  const feature = FEATURES[currentFeature];
  const FeatureIcon = feature.icon;
  const passwordMode = loginMode === "PASSWORD";

  const switchLoginMode = (mode: LoginMode) => {
    setLoginMode(mode);
    setPendingVerification(false);
    setOtpCode("");
    setResendTimer(0);
    setAccountChoices([]);
    setChallengeId("");
  };

  const resetPhone = () => {
    setPendingVerification(false);
    setOtpCode("");
    setResendTimer(0);
    setAccountChoices([]);
    setChallengeId("");
  };

  const formatRole = (role: string) =>
    role
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());

  return (
    <main className="flex min-h-screen w-full bg-white font-sans">
      <section className="relative z-10 flex w-full flex-col justify-center px-5 py-10 sm:px-10 lg:w-[45%] lg:px-14 xl:px-24">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-9 flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-[0_12px_30px_rgba(15,23,42,0.18)]">
              <School className="size-6" />
            </div>
            <div>
              <p className="font-bold tracking-[-0.02em] text-slate-950">
                {schoolName}
              </p>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                SchoolDB · Student space
              </p>
            </div>
          </div>

          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">
              {passwordMode ? "School workspace" : "Welcome back"}
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-slate-950 sm:text-4xl">
              {passwordMode ? "Staff sign in" : "Login with WhatsApp"}
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              {passwordMode
                ? "Use your existing administrator or teacher credentials."
                : "Use your registered mobile number. If it belongs to more than one account, you can choose the account after verification."}
            </p>
          </div>

          {passwordMode ? (
            <SignIn
              forceRedirectUrl={`/${schoolSlug}`}
              fallbackRedirectUrl={`/${schoolSlug}`}
              appearance={{
                variables: {
                  colorPrimary: "#4f46e5",
                  colorBackground: "#ffffff",
                  colorForeground: "#0f172a",
                  borderRadius: "1rem",
                },
                elements: {
                  rootBox: "w-full",
                  card: "w-full bg-transparent shadow-none border-0 p-0",
                  headerTitle: "hidden",
                  headerSubtitle: "hidden",
                  formButtonPrimary: "bg-indigo-600 hover:bg-indigo-700",
                  footerActionLink: "text-indigo-600",
                },
              }}
            />
          ) : accountChoices.length > 0 ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <p className="text-sm font-bold text-emerald-900">
                  Mobile number verified
                </p>
                <p className="mt-1 text-xs leading-5 text-emerald-700">
                  Choose which SchoolDB account you want to open.
                </p>
              </div>
              <div className="grid gap-3" aria-label="Choose an account">
                {accountChoices.map((account) => (
                  <button
                    key={account.id}
                    type="button"
                    disabled={isSending}
                    onClick={() => void handleAccountSelect(account.id)}
                    className="group flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-lg disabled:cursor-wait disabled:opacity-60"
                  >
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                      <UserRoundCog className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-slate-950">
                        {account.name}
                      </span>
                      <span className="mt-1 block text-xs font-semibold text-slate-500">
                        {formatRole(account.role)}
                      </span>
                    </span>
                    {isSending ? (
                      <LoaderCircle className="size-5 animate-spin text-indigo-500" />
                    ) : (
                      <ChevronRight className="size-5 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-indigo-500" />
                    )}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={resetPhone}
                className="text-xs font-semibold text-slate-500 hover:text-indigo-600"
              >
                Use a different mobile number
              </button>
            </div>
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void (pendingVerification ? handleSignIn() : handleSendOTP());
              }}
              className="space-y-6"
            >
              <OTPLogin
                phoneNumber={phoneNumber}
                otpCode={otpCode}
                setPhoneNumber={setPhoneNumber}
                setOtpCode={setOtpCode}
                pendingVerification={pendingVerification}
                otpInputRef={otpInputRef}
                isSending={isSending}
                resendTimer={resendTimer}
                handleSendOTP={handleSendOTP}
              />
              {pendingVerification && (
                <button
                  type="button"
                  onClick={resetPhone}
                  className="text-xs font-semibold text-slate-500 hover:text-indigo-600"
                >
                  Use a different mobile number
                </button>
              )}
              <button
                type="submit"
                disabled={
                  isSending || (pendingVerification && otpCode.length !== 6)
                }
                className="group flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-bold text-white shadow-[0_14px_32px_rgba(15,23,42,0.2)] transition hover:-translate-y-0.5 hover:bg-indigo-600 hover:shadow-[0_18px_38px_rgba(79,70,229,0.25)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {isSending ? (
                  <LoaderCircle className="size-5 animate-spin" />
                ) : (
                  <>
                    {pendingVerification
                      ? "Verify mobile number"
                      : "Send WhatsApp OTP"}
                    <ChevronRight className="size-4 opacity-60 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>
          )}

          <button
            type="button"
            onClick={() => switchLoginMode(passwordMode ? "OTP" : "PASSWORD")}
            className="mt-7 flex w-full items-center justify-center gap-2 border-t border-slate-100 pt-6 text-sm font-semibold text-slate-500 transition hover:text-indigo-600"
          >
            <LockKeyhole className="size-4" />
            {passwordMode
              ? "Use WhatsApp OTP instead"
              : "Use staff email or password instead"}
          </button>
          <Link
            href={`/${schoolSlug}/apply`}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-50 px-4 py-3 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100"
          >
            <FileText className="size-4" />
            Apply for a new admission
          </Link>
          <div className="mt-7 flex items-center justify-between text-[11px] text-slate-400">
            <span>Powered by SchoolDB</span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-emerald-500" />
              Secure connection
            </span>
          </div>
        </div>
      </section>

      <section className="relative hidden w-[55%] items-center justify-center overflow-hidden bg-[#050505] lg:flex">
        <div className="absolute right-0 top-0 size-96 rounded-full bg-indigo-500/15 blur-[120px]" />
        <div className="absolute bottom-0 left-0 size-96 rounded-full bg-emerald-500/10 blur-[120px]" />
        <Banknote className="absolute left-[16%] top-[20%] size-9 animate-pulse text-emerald-500/40" />
        <GraduationCap className="absolute right-[15%] top-[25%] size-10 animate-pulse text-violet-500/40 [animation-delay:1s]" />
        <FileSpreadsheet className="absolute bottom-[20%] left-[18%] size-8 animate-pulse text-blue-400/40 [animation-delay:2s]" />
        <Users className="absolute bottom-[16%] right-[18%] size-9 animate-pulse text-orange-500/40 [animation-delay:3s]" />
        <div className="relative z-10 max-w-xl px-12 text-center">
          <div
            className={`mx-auto flex size-24 items-center justify-center rounded-[28px] bg-gradient-to-br ${feature.color} shadow-2xl ring-4 ring-white/5`}
          >
            <FeatureIcon className="size-11 text-white" />
          </div>
          <h2 className="mt-8 text-4xl font-bold tracking-[-0.04em] text-white">
            {feature.title}
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-lg leading-8 text-zinc-400">
            {feature.description}
          </p>
          <div
            className="mt-14 flex justify-center gap-2.5"
            aria-label="Feature slides"
          >
            {FEATURES.map((item, index) => (
              <button
                key={item.title}
                type="button"
                aria-label={`Show ${item.title}`}
                onClick={() => setCurrentFeature(index)}
                className={`h-1.5 rounded-full transition-all duration-500 ${index === currentFeature ? "w-12 bg-white" : "w-2 bg-zinc-700 hover:bg-zinc-500"}`}
              />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
