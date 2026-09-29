"use client";

import { useSignIn, useUser } from "@clerk/nextjs";
import Image from "next/image";
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
  Mail,
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
  { label: "Attendance", value: "96.4%", icon: CalendarCheck, position: "left-[2%] top-[5%] xl:left-[5%]", accent: "from-blue-100 to-indigo-50 text-blue-700" },
  { label: "Fees & receipts", value: "Live", icon: Banknote, position: "right-[1%] top-[6%] xl:right-[4%]", accent: "from-violet-100 to-fuchsia-50 text-violet-700" },
  { label: "Results", value: "Ready", icon: GraduationCap, position: "bottom-0 left-[1%] xl:left-[4%]", accent: "from-indigo-100 to-violet-50 text-indigo-700" },
  { label: "Student records", value: "Secure", icon: Users, position: "bottom-0 right-[1%] xl:right-[3%]", accent: "from-emerald-100 to-teal-50 text-emerald-700" },
];

type Props = {
  schoolSlug: string;
  schoolName: string;
  schoolLogo: string | null;
};
type LoginMode = "OTP" | "EMAIL";
type AccountChoice = { id: string; role: string; name: string };

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const clerkError = error as {
      message?: string;
      errors?: Array<{ longMessage?: string; message?: string }>;
    };
    const detail = clerkError.errors?.[0];
    return detail?.longMessage || detail?.message || clerkError.message ||
      "Something went wrong. Please try again.";
  }
  return "Something went wrong. Please try again.";
}

export function TenantOtpSignIn({ schoolSlug, schoolName, schoolLogo }: Props) {
  const router = useRouter();
  const { isLoaded: userLoaded, isSignedIn } = useUser();
  const { fetchStatus: signInStatus, signIn } = useSignIn();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [currentFeature, setCurrentFeature] = useState(0);
  const [loginMode, setLoginMode] = useState<LoginMode>("OTP");
  const [isArriving, setIsArriving] = useState(false);
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
    const transitionSchool = window.sessionStorage.getItem(
      "schooldb-school-transition",
    );
    if (transitionSchool !== schoolSlug) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      window.sessionStorage.removeItem("schooldb-school-transition");
      return;
    }

    let exitTimer = 0;
    const enterFrame = window.requestAnimationFrame(() => {
      setIsArriving(true);
      exitTimer = window.setTimeout(() => {
        setIsArriving(false);
        window.sessionStorage.removeItem("schooldb-school-transition");
      }, 1_250);
    });
    return () => {
      window.cancelAnimationFrame(enterFrame);
      window.clearTimeout(exitTimer);
    };
  }, [schoolSlug]);

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

  const finalizeSignIn = async () => {
    if (signIn.status !== "complete") {
      throw new Error("Authentication could not be completed.");
    }
    const finalizeResult = await signIn.finalize({
      navigate: ({ decorateUrl }) =>
        router.replace(decorateUrl("/" + schoolSlug)),
    });
    if (finalizeResult.error) throw finalizeResult.error;
  };

  const completeSignIn = async (token: string) => {
    const ticketResult = await signIn.ticket({ ticket: token });
    if (ticketResult.error) throw ticketResult.error;
    await finalizeSignIn();
  };

  const handleSendEmailCode = async () => {
    if (isSending || signInStatus === "fetching") return;
    if (!/^\S+@\S+\.\S+$/.test(emailAddress.trim())) {
      toast.error("Enter a valid email address.");
      return;
    }
    setIsSending(true);
    try {
      const result = await signIn.emailCode.sendCode({
        emailAddress: emailAddress.trim(),
      });
      if (result.error) throw result.error;
      setEmailCode("");
      setEmailCodeSent(true);
      setResendTimer(30);
      toast.success("Verification code sent to your email.");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setIsSending(false);
    }
  };

  const handleEmailCodeSignIn = async () => {
    if (isSending || signInStatus === "fetching") return;
    if (!/^\d{6}$/.test(emailCode)) {
      toast.error("Enter the complete 6-digit email code.");
      return;
    }
    setIsSending(true);
    try {
      const result = await signIn.emailCode.verifyCode({ code: emailCode });
      if (result.error) throw result.error;
      if (signIn.status !== "complete") {
        throw new Error("Email verification could not be completed.");
      }
      await finalizeSignIn();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setIsSending(false);
    }
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
  const emailMode = loginMode === "EMAIL";

  const switchLoginMode = (mode: LoginMode) => {
    setLoginMode(mode);
    setPendingVerification(false);
    setOtpCode("");
    setResendTimer(0);
    setAccountChoices([]);
    setChallengeId("");
    setEmailCode("");
    setEmailCodeSent(false);
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
    <main className={"schooldb-auth-scene relative min-h-screen overflow-hidden bg-[#f5f7ff] px-4 py-5 text-slate-950 sm:px-7 lg:px-9 lg:py-7 xl:px-12 " + (isArriving ? "is-arriving" : "")}>
      {isArriving && (
        <div className="schooldb-auth-arrival pointer-events-none fixed inset-0 z-50 flex items-center justify-center" aria-hidden="true">
          <div className="schooldb-auth-arrival-orbit absolute size-52 rounded-full border border-white/25" />
          <div className="schooldb-auth-arrival-identity relative flex flex-col items-center text-center">
            <Image
              src={schoolLogo || "/pwa-192.png"}
              alt=""
              width={88}
              height={88}
              unoptimized={Boolean(schoolLogo)}
              className="size-[88px] rounded-[24px] bg-white object-contain p-1.5 shadow-[0_24px_70px_rgba(30,27,75,.28)]"
              priority
            />
            <p className="mt-5 text-[10px] font-black uppercase tracking-[0.24em] text-indigo-100">
              Secure portal ready
            </p>
            <p className="mt-2 max-w-xs text-xl font-black tracking-tight text-white">
              {schoolName}
            </p>
          </div>
        </div>
      )}
      <div className="schooldb-aurora schooldb-aurora-one" aria-hidden="true" />
      <div className="schooldb-aurora schooldb-aurora-two" aria-hidden="true" />
      <div className="schooldb-auth-stars absolute inset-0" aria-hidden="true" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_110%,rgba(99,102,241,0.10),transparent_43%)]" aria-hidden="true" />

      <header className="relative z-20 mx-auto flex w-full max-w-[1680px] items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="schooldb-logo-glow flex size-11 items-center justify-center rounded-2xl border border-indigo-200/80 bg-white/85 text-indigo-600 shadow-[0_10px_30px_rgba(79,70,229,.12)] backdrop-blur-xl sm:size-12">
            <School className="size-5 sm:size-6" />
          </div>
          <div>
            <p className="text-lg font-black tracking-[-0.035em] sm:text-xl">SchoolDB</p>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400 sm:text-[10px]">
              Smarter schools · brighter futures
            </p>
          </div>
        </div>
        <div className="hidden items-center gap-2 rounded-full border border-slate-200/80 bg-white/75 px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm backdrop-blur-xl sm:flex">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-40" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          Secure portal for {schoolName}
        </div>
      </header>

      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-100px)] w-full min-w-0 max-w-[1680px] items-center gap-8 py-8 lg:grid-cols-[minmax(0,1.12fr)_minmax(430px,0.88fr)] lg:gap-10 lg:py-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(470px,0.8fr)] xl:gap-16">
        <section className="relative hidden min-h-[660px] lg:block xl:min-h-[720px] 2xl:min-h-[760px]" aria-label="Connected school platform">
          <div className="absolute left-0 top-6 max-w-[760px] xl:left-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/80 px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-700 shadow-sm backdrop-blur-xl">
              <Sparkles className="size-3.5 text-indigo-500" /> One connected school ecosystem
            </div>
            <h1 className="mt-5 max-w-[760px] text-[clamp(2.75rem,4.1vw,5.1rem)] font-black leading-[0.94] tracking-[-0.06em] text-slate-950">
              Every school day,<span className="schooldb-gradient-text block">in one orbit.</span>
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-slate-600 xl:text-base">
              Attendance, fees, academics, communication, and student records move together in one secure workspace.
            </p>
          </div>

          <div className="absolute inset-x-0 bottom-0 h-[365px] xl:h-[390px] 2xl:h-[420px]" aria-hidden="true">
            <div className="schooldb-orbit schooldb-orbit-one absolute left-1/2 top-1/2 h-[245px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border border-indigo-300/30" />
            <div className="schooldb-orbit schooldb-orbit-two absolute left-1/2 top-1/2 h-[330px] w-[650px] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border border-violet-300/20" />
            <svg className="absolute inset-0 size-full opacity-60" viewBox="0 0 760 420" fill="none">
              <path className="schooldb-data-path" d="M145 95 C245 112 260 170 370 210" />
              <path className="schooldb-data-path schooldb-data-path-delay" d="M620 105 C520 120 500 175 390 210" />
              <path className="schooldb-data-path schooldb-data-path-delay" d="M145 325 C250 305 275 250 370 220" />
              <path className="schooldb-data-path" d="M625 320 C520 300 495 250 390 220" />
            </svg>
            <div className="schooldb-core absolute left-1/2 top-1/2 flex size-44 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-indigo-200/80 bg-[radial-gradient(circle_at_35%_25%,rgba(255,255,255,.98),rgba(238,242,255,.94)_48%,rgba(224,231,255,.90)_100%)] text-center shadow-[0_24px_70px_rgba(79,70,229,.16),inset_0_1px_0_rgba(255,255,255,.9)] backdrop-blur-xl xl:size-48">
              <div key={currentFeature} className="schooldb-core-content flex flex-col items-center">
                <div className="flex size-14 items-center justify-center rounded-2xl border border-indigo-200 bg-white/90 text-indigo-600 shadow-[0_10px_30px_rgba(79,70,229,.12)]">
                  <FeatureIcon className="size-7" />
                </div>
                <p className="mt-3 px-5 text-sm font-extrabold leading-tight text-slate-900">{feature.title}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-500/70">SchoolDB live</p>
              </div>
            </div>
            {HIGHLIGHTS.map(({ label, value, icon: Icon, position, accent }, index) => (
              <button key={label} type="button" tabIndex={-1} onClick={() => setCurrentFeature(index)} className={"schooldb-float-card absolute w-[185px] rounded-[22px] border border-slate-200/90 bg-white/82 p-4 text-left shadow-[0_20px_55px_rgba(79,70,229,.12)] backdrop-blur-2xl transition hover:border-indigo-300 hover:bg-white xl:w-[205px] " + position} style={{ animationDelay: `${index * -1.35}s` }}>
                <span className={"flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br " + accent}><Icon className="size-5" /></span>
                <span className="mt-4 block text-sm font-bold text-slate-900">{label}</span>
                <span className="mt-1 flex items-center justify-between text-[11px] font-semibold text-slate-400"><span>Synced now</span><span className="text-indigo-600">{value}</span></span>
                <span className="mt-3 block h-1 overflow-hidden rounded-full bg-slate-100"><span className="schooldb-card-progress block h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" /></span>
              </button>
            ))}
          </div>
        </section>

        <section className="flex w-full min-w-0 items-center justify-center lg:justify-end">
          <div className="w-full min-w-0 max-w-[530px]">
            <div className="mb-5 min-w-0 overflow-hidden rounded-[24px] border border-indigo-100 bg-white/75 p-4 shadow-[0_18px_50px_rgba(79,70,229,.08)] backdrop-blur-xl lg:hidden">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-600">Connected school workspace</p>
              <h1 className="mt-2 text-2xl font-black tracking-[-0.045em] text-slate-950 sm:text-3xl">Your school day, <span className="text-indigo-600">beautifully connected.</span></h1>
              <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                {HIGHLIGHTS.map(({ label, icon: Icon }) => (
                  <span key={label} className="flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-600"><Icon className="size-3.5 text-indigo-500" /> {label}</span>
                ))}
              </div>
            </div>
            <div className="schooldb-auth-card relative overflow-hidden rounded-[30px] border border-white bg-white/88 p-5 shadow-[0_35px_100px_rgba(79,70,229,.14),0_8px_30px_rgba(15,23,42,.06),inset_0_1px_0_rgba(255,255,255,.95)] backdrop-blur-2xl sm:rounded-[36px] sm:p-8 xl:p-9">
              <div className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/70 to-transparent" />
              <div className="pointer-events-none absolute -right-20 -top-20 size-52 rounded-full bg-indigo-300/20 blur-3xl" />
              <div className="schooldb-card-sheen pointer-events-none absolute inset-y-0 -left-1/2 w-1/3" aria-hidden="true" />
                <div className="relative mb-7">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-indigo-100 bg-indigo-50 text-indigo-600">
                      {schoolLogo ? (
                        <Image
                          src={schoolLogo}
                          alt={`${schoolName} logo`}
                          width={44}
                          height={44}
                          unoptimized
                          className="size-full bg-white object-contain p-1"
                        />
                      ) : (
                        <School className="size-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold text-slate-950">
                        {schoolName}
                      </p>
                      <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-slate-400">
                        Secure school portal
                      </p>
                    </div>
                  </div>

                  <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700">
                    <ShieldCheck className="size-3.5" />
                    Verified access
                  </div>
                  <h2 className="mt-4 text-3xl font-black tracking-[-0.05em] text-slate-950 sm:text-[2.45rem]">
                    {emailMode ? "Email verification" : "WhatsApp verification"}
                  </h2>
                  <p className="mt-2.5 max-w-md text-sm leading-6 text-slate-500">
                    {emailMode
                      ? `Receive a secure OTP on your ${schoolName} email ID.`
                      : "Use your registered mobile number to receive a secure OTP."}
                  </p>
                </div>

                <div className="relative mb-6 flex items-center justify-between gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/70 px-4 py-3.5">
                  <span className="flex items-center gap-2 text-sm font-bold text-indigo-950">
                    {emailMode ? (
                      <Mail className="size-4 text-indigo-600" />
                    ) : (
                      <ShieldCheck className="size-4 text-indigo-600" />
                    )}
                    {emailMode ? "Email OTP" : "WhatsApp OTP"}
                  </span>
                  {emailMode && (
                    <button
                      type="button"
                      onClick={() => switchLoginMode("OTP")}
                      className="text-xs font-bold text-indigo-600 transition hover:text-indigo-800"
                    >
                      Back to WhatsApp login
                    </button>
                  )}
                </div>

                {emailMode ? (
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      void (emailCodeSent
                        ? handleEmailCodeSignIn()
                        : handleSendEmailCode());
                    }}
                    className="space-y-5"
                  >
                    <label className="grid gap-2.5">
                      <span className="text-sm font-bold text-slate-700">
                        School email ID
                      </span>
                      <div className="group relative">
                        <Mail className="pointer-events-none absolute left-4 top-1/2 size-4.5 -translate-y-1/2 text-slate-400 transition group-focus-within:text-indigo-500" />
                        <input
                          type="email"
                          inputMode="email"
                          autoComplete="username"
                          value={emailAddress}
                          onChange={(event) => setEmailAddress(event.target.value)}
                          placeholder="name@school.com"
                          disabled={emailCodeSent}
                          className="h-[56px] w-full rounded-2xl border border-slate-200 bg-slate-50/80 pl-12 pr-4 text-[15px] font-semibold text-slate-950 outline-none transition placeholder:font-medium placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100/80 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600"
                        />
                      </div>
                    </label>

                    {emailCodeSent ? (
                      <div className="grid gap-3">
                        <div className="flex items-end justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-slate-700">
                              Email verification code
                            </p>
                            <p className="mt-1 text-xs leading-5 text-slate-500">
                              Sent to {emailAddress.trim()}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => void handleSendEmailCode()}
                            disabled={resendTimer > 0 || isSending}
                            className="shrink-0 text-xs font-bold text-indigo-600 transition hover:text-indigo-700 disabled:cursor-not-allowed disabled:text-slate-400"
                          >
                            {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend code"}
                          </button>
                        </div>
                        <div className="group relative">
                          <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 size-4.5 -translate-y-1/2 text-slate-400 transition group-focus-within:text-indigo-500" />
                          <input
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            maxLength={6}
                            value={emailCode}
                            onChange={(event) =>
                              setEmailCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                            }
                            placeholder="• • • • • •"
                            className="h-[60px] w-full rounded-2xl border border-slate-200 bg-slate-50/80 pl-12 pr-4 text-center text-xl font-extrabold tracking-[0.38em] text-slate-950 outline-none transition placeholder:tracking-[0.18em] placeholder:text-slate-300 hover:border-slate-300 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100/80"
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] leading-5 text-slate-400">
                        We will send a 6-digit verification code to your school email ID.
                      </p>
                    )}

                    {emailCodeSent && (
                      <button
                        type="button"
                        onClick={() => {
                          setEmailCodeSent(false);
                          setEmailCode("");
                          setResendTimer(0);
                        }}
                        className="text-xs font-bold text-slate-500 transition hover:text-indigo-600"
                      >
                        Use a different email address
                      </button>
                    )}

                    <button
                      type="submit"
                      disabled={isSending || signInStatus === "fetching"}
                      className="schooldb-primary-action group relative flex h-[54px] w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-blue-600 px-5 text-sm font-extrabold text-white shadow-[0_16px_40px_rgba(79,70,229,.25)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_48px_rgba(79,70,229,.24)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                    >
                      {isSending ? (
                        <LoaderCircle className="size-5 animate-spin" />
                      ) : (
                        <>
                          {emailCodeSent ? "Verify & continue" : "Send email OTP"}
                          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                        </>
                      )}
                    </button>
                  </form>
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
                          className="group flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-[0_14px_30px_rgba(79,70,229,.10)] disabled:cursor-wait disabled:opacity-60"
                        >
                          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                            <UserRoundCog className="size-5" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-extrabold text-slate-950">
                              {account.name}
                            </span>
                            <span className="mt-1 block text-xs font-semibold text-slate-400">
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
                      className="schooldb-primary-action group relative flex h-[54px] w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-blue-600 px-5 text-sm font-extrabold text-white shadow-[0_16px_40px_rgba(79,70,229,.25)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_48px_rgba(79,70,229,.24)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
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

                    <div className="flex items-center gap-3 pt-1">
                      <div className="h-px flex-1 bg-slate-100" />
                      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                        Alternative sign in
                      </span>
                      <div className="h-px flex-1 bg-slate-100" />
                    </div>
                    <button
                      type="button"
                      onClick={() => switchLoginMode("EMAIL")}
                      className="group flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                    >
                      <Mail className="size-4 text-indigo-600" />
                      Use email OTP instead
                      <ChevronRight className="size-4 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-500" />
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
                    <span className="flex size-9 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200/80">
                      <FileText className="size-4" />
                    </span>
                    <span>
                      <span className="block text-sm font-bold text-slate-800">
                        Apply for admission
                      </span>
                      <span className="mt-0.5 block text-[11px] font-medium text-slate-400">
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
        </section>
      </div>
    </main>
  );
}
