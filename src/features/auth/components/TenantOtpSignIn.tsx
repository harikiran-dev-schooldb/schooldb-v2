"use client";

import { SignIn, useSignIn, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Banknote,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  FileText,
  GraduationCap,
  LoaderCircle,
  LockKeyhole,
  School,
  ShieldCheck,
  Sparkles,
  Users,
  UserRoundCog,
} from "lucide-react";
import { toast } from "sonner";

import OTPLogin from "./OTPLogin";

const FEATURES = [
  {
    title: "One place for every school day",
    description:
      "Attendance, fees, academics, communication, and student records stay connected.",
    icon: School,
  },
  {
    title: "Built for families and staff",
    description:
      "A simple workspace for parents, students, teachers, and school administrators.",
    icon: Users,
  },
  {
    title: "Clear fee visibility",
    description:
      "Track installments, receipts, balances, and payment history without confusion.",
    icon: Banknote,
  },
  {
    title: "Academic progress at a glance",
    description:
      "Attendance, exam schedules, marks, and results are always easy to reach.",
    icon: GraduationCap,
  },
];

const HIGHLIGHTS = [
  { label: "Attendance", icon: CalendarCheck },
  { label: "Fees & receipts", icon: Banknote },
  { label: "Results", icon: GraduationCap },
  { label: "Student records", icon: Users },
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
    if (userLoaded && isSignedIn) router.replace("/" + schoolSlug);
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
    if (signIn.status !== "complete") {
      throw new Error("Authentication could not be completed.");
    }
    const finalizeResult = await signIn.finalize({
      navigate: ({ decorateUrl }) =>
        router.replace(decorateUrl("/" + schoolSlug)),
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
      if (!response.ok) {
        throw new Error(data.error || "OTP verification failed.");
      }
      if (
        data.requiresAccountSelection &&
        data.challengeId &&
        data.accounts?.length
      ) {
        setChallengeId(data.challengeId);
        setAccountChoices(data.accounts);
        toast.success("Mobile number verified. Choose an account or role.");
        return;
      }
      if (!data.token) {
        throw new Error("Authentication could not be completed.");
      }
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
      if (!response.ok || !data.token) {
        throw new Error(data.error || "Account selection failed.");
      }
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
    <main className="min-h-screen bg-[#f3f6fb] p-0 lg:p-5">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] overflow-hidden bg-white lg:min-h-[calc(100vh-2.5rem)] lg:rounded-[36px] lg:border lg:border-slate-200/80 lg:shadow-[0_30px_90px_rgba(15,23,42,0.10)]">
        <section className="relative hidden w-[52%] overflow-hidden bg-[#091540] p-10 text-white lg:flex lg:flex-col xl:p-14">
          <div className="absolute -left-32 top-24 size-80 rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="absolute -right-20 bottom-4 size-96 rounded-full bg-violet-500/15 blur-3xl" />
          <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.18)_1px,transparent_1px)] [background-size:42px_42px]" />

          <div className="relative z-10 flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-white text-[#091540] shadow-lg shadow-black/10">
              <School className="size-5" />
            </div>
            <div>
              <p className="text-base font-extrabold tracking-[-0.02em]">SchoolDB</p>
              <p className="text-xs font-medium text-slate-300">
                Modern school management
              </p>
            </div>
          </div>

          <div className="relative z-10 my-auto max-w-2xl py-12">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3.5 py-2 text-xs font-bold text-indigo-100 backdrop-blur">
              <Sparkles className="size-3.5" />
              Secure access for {schoolName}
            </div>

            <h1 className="mt-7 max-w-xl text-[clamp(2.8rem,4vw,5rem)] font-extrabold leading-[0.98] tracking-[-0.055em]">
              Your school day,
              <span className="block text-indigo-300">beautifully connected.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-300 xl:text-lg xl:leading-8">
              A focused digital workspace that keeps students, families, teachers,
              and school operations in sync.
            </p>

            <div className="mt-10 grid max-w-xl grid-cols-2 gap-3">
              {HIGHLIGHTS.map(({ label, icon: Icon }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3.5 backdrop-blur-sm"
                >
                  <span className="flex size-9 items-center justify-center rounded-xl bg-white/10 text-indigo-200">
                    <Icon className="size-4" />
                  </span>
                  <span className="text-sm font-semibold text-slate-100">{label}</span>
                </div>
              ))}
            </div>

            <div className="mt-10 rounded-[28px] border border-white/10 bg-white/[0.07] p-5 backdrop-blur-md xl:p-6">
              <div className="flex items-start gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-400/15 text-indigo-200">
                  <FeatureIcon className="size-6" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold tracking-[-0.01em] text-white">
                    {feature.title}
                  </p>
                  <p className="mt-1.5 text-sm leading-6 text-slate-300">
                    {feature.description}
                  </p>
                </div>
              </div>
              <div className="mt-5 flex gap-2" aria-label="Platform highlights">
                {FEATURES.map((item, index) => (
                  <button
                    key={item.title}
                    type="button"
                    aria-label={"Show " + item.title}
                    onClick={() => setCurrentFeature(index)}
                    className={
                      "h-1.5 rounded-full transition-all duration-500 " +
                      (index === currentFeature
                        ? "w-10 bg-indigo-300"
                        : "w-2 bg-white/20 hover:bg-white/40")
                    }
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-between gap-6 border-t border-white/10 pt-6 text-xs text-slate-400">
            <span>© SchoolDB</span>
            <span className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-emerald-300" />
              Protected sign-in
            </span>
          </div>
        </section>

        <section className="flex w-full flex-col lg:w-[48%]">
          <div className="flex items-center justify-between px-5 py-5 sm:px-8 lg:hidden">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-[#091540] text-white shadow-lg shadow-slate-300/50">
                <School className="size-5" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-slate-950">SchoolDB</p>
                <p className="max-w-[220px] truncate text-[11px] font-medium text-slate-500">
                  {schoolName}
                </p>
              </div>
            </div>
            <ShieldCheck className="size-5 text-emerald-500" />
          </div>

          <div className="flex flex-1 items-center justify-center px-4 pb-8 pt-3 sm:px-8 sm:py-10 lg:px-10 xl:px-16">
            <div className="w-full max-w-[520px]">
              <div className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.09)] sm:rounded-[32px] sm:p-8 xl:p-9">
                <div className="mb-7">
                  <div className="mb-5 hidden items-center gap-3 lg:flex">
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                      <School className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold text-slate-950">
                        {schoolName}
                      </p>
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                        Secure school portal
                      </p>
                    </div>
                  </div>

                  <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-indigo-700">
                    <ShieldCheck className="size-3.5" />
                    Verified access
                  </div>
                  <h2 className="mt-4 text-3xl font-extrabold tracking-[-0.045em] text-slate-950 sm:text-[2.35rem]">
                    Welcome back
                  </h2>
                  <p className="mt-2.5 max-w-md text-sm leading-6 text-slate-500">
                    Choose how you want to sign in to your {schoolName} account.
                  </p>
                </div>

                <div className="mb-7 grid grid-cols-2 rounded-2xl bg-slate-100 p-1.5">
                  <button
                    type="button"
                    onClick={() => switchLoginMode("OTP")}
                    className={
                      "flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-bold transition " +
                      (!passwordMode
                        ? "bg-white text-slate-950 shadow-sm ring-1 ring-slate-200/70"
                        : "text-slate-500 hover:text-slate-800")
                    }
                  >
                    <ShieldCheck className="size-4" />
                    WhatsApp OTP
                  </button>
                  <button
                    type="button"
                    onClick={() => switchLoginMode("PASSWORD")}
                    className={
                      "flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-bold transition " +
                      (passwordMode
                        ? "bg-white text-slate-950 shadow-sm ring-1 ring-slate-200/70"
                        : "text-slate-500 hover:text-slate-800")
                    }
                  >
                    <LockKeyhole className="size-4" />
                    Staff login
                  </button>
                </div>

                {passwordMode ? (
                  <div>
                    <div className="mb-5 rounded-2xl border border-indigo-100 bg-indigo-50/70 px-4 py-3.5">
                      <p className="text-sm font-bold text-indigo-950">
                        Staff credentials
                      </p>
                      <p className="mt-1 text-xs leading-5 text-indigo-700/80">
                        Administrators and teachers can use their existing sign-in
                        credentials.
                      </p>
                    </div>
                    <SignIn
                      forceRedirectUrl={"/" + schoolSlug}
                      fallbackRedirectUrl={"/" + schoolSlug}
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
                          formButtonPrimary:
                            "h-12 bg-[#091540] hover:bg-indigo-600 shadow-none",
                          footerActionLink: "text-indigo-600 font-semibold",
                          formFieldInput:
                            "h-12 border-slate-200 bg-slate-50 focus:bg-white",
                          formFieldLabel: "text-slate-700 font-semibold",
                          socialButtonsBlockButton:
                            "h-12 border-slate-200 bg-white hover:bg-slate-50",
                        },
                      }}
                    />
                  </div>
                ) : accountChoices.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5">
                      <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
                      <div>
                        <p className="text-sm font-bold text-emerald-950">
                          Mobile number verified
                        </p>
                        <p className="mt-1 text-xs leading-5 text-emerald-700">
                          Select the person and role you want to continue as.
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3" aria-label="Choose an account or role">
                      {accountChoices.map((account) => (
                        <button
                          key={account.id}
                          type="button"
                          disabled={isSending}
                          onClick={() => void handleAccountSelect(account.id)}
                          className="group flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-[0_14px_30px_rgba(79,70,229,0.10)] disabled:cursor-wait disabled:opacity-60"
                        >
                          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                            <UserRoundCog className="size-5" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-extrabold text-slate-950">
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
                      className="text-xs font-bold text-slate-500 transition hover:text-indigo-600"
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
                    className="space-y-5"
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
                        className="text-xs font-bold text-slate-500 transition hover:text-indigo-600"
                      >
                        Use a different mobile number
                      </button>
                    )}

                    <button
                      type="submit"
                      disabled={
                        isSending || (pendingVerification && otpCode.length !== 6)
                      }
                      className="group flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#091540] px-5 text-sm font-extrabold text-white shadow-[0_14px_30px_rgba(9,21,64,0.18)] transition hover:-translate-y-0.5 hover:bg-indigo-600 hover:shadow-[0_18px_36px_rgba(79,70,229,0.22)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                    >
                      {isSending ? (
                        <LoaderCircle className="size-5 animate-spin" />
                      ) : (
                        <>
                          {pendingVerification
                            ? "Verify & continue"
                            : "Send WhatsApp OTP"}
                          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                        </>
                      )}
                    </button>
                  </form>
                )}

                <div className="my-7 flex items-center gap-3">
                  <div className="h-px flex-1 bg-slate-100" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    New admission
                  </span>
                  <div className="h-px flex-1 bg-slate-100" />
                </div>

                <Link
                  href={"/" + schoolSlug + "/apply"}
                  className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3.5 transition hover:border-indigo-200 hover:bg-indigo-50/70"
                >
                  <span className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200/70">
                      <FileText className="size-4" />
                    </span>
                    <span>
                      <span className="block text-sm font-bold text-slate-800">
                        Apply for admission
                      </span>
                      <span className="mt-0.5 block text-[11px] font-medium text-slate-500">
                        Start a new student application
                      </span>
                    </span>
                  </span>
                  <ChevronRight className="size-4 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-indigo-600" />
                </Link>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 px-4 text-[11px] font-medium text-slate-400">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-emerald-500" />
                  Secure connection
                </span>
                <span>Powered by SchoolDB</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
