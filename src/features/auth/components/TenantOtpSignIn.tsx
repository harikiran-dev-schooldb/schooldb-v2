"use client";

import { SignIn, useSignIn, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Banknote,
  CalendarCheck,
  ChevronRight,
  FileSpreadsheet,
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
  { title: "Student enrollment", description: "Student profiles, contacts, and academic history—all in one secure place.", icon: Users, color: "from-orange-500 to-amber-400" },
  { title: "Fee management", description: "Clear installments, payment history, receipts, and outstanding balances.", icon: Banknote, color: "from-emerald-500 to-teal-400" },
  { title: "Smart attendance", description: "Daily attendance records and progress available whenever families need them.", icon: CalendarCheck, color: "from-blue-500 to-cyan-400" },
  { title: "Exams & results", description: "Schedules, marks, report cards, and academic progress in a single student space.", icon: GraduationCap, color: "from-violet-500 to-fuchsia-500" },
];

type Props = { schoolSlug: string; schoolName: string };
type LoginMode = "FAMILY" | "STAFF" | "PASSWORD";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
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
  const [loginMode, setLoginMode] = useState<LoginMode>("FAMILY");
  const otpInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentFeature((current) => (current + 1) % FEATURES.length), 5_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (pendingVerification) otpInputRef.current?.focus();
  }, [pendingVerification]);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const timer = window.setInterval(() => setResendTimer((current) => Math.max(0, current - 1)), 1_000);
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
        body: JSON.stringify({ phone: phoneNumber, schoolSlug, accountType: loginMode }),
      });
      const data = (await response.json()) as { error?: string; message?: string };
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
        body: JSON.stringify({ phone: phoneNumber, otp: otpCode, schoolSlug }),
      });
      const data = (await response.json()) as { error?: string; token?: string };
      if (!response.ok || !data.token) throw new Error(data.error || "OTP verification failed.");
      const ticketResult = await signIn.ticket({ ticket: data.token });
      if (ticketResult.error) throw ticketResult.error;
      if (signIn.status !== "complete") throw new Error("Authentication could not be completed.");
      const finalizeResult = await signIn.finalize({
        navigate: ({ decorateUrl }) => router.replace(decorateUrl(`/${schoolSlug}`)),
      });
      if (finalizeResult.error) throw finalizeResult.error;
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setIsSending(false);
    }
  };

  const feature = FEATURES[currentFeature];
  const FeatureIcon = feature.icon;
  const passwordMode = loginMode === "PASSWORD";
  const staffOtpMode = loginMode === "STAFF";

  const switchLoginMode = (mode: LoginMode) => {
    setLoginMode(mode);
    setPendingVerification(false);
    setOtpCode("");
    setResendTimer(0);
  };

  return (
    <main className="flex min-h-screen w-full bg-white font-sans">
      <section className="relative z-10 flex w-full flex-col justify-center px-5 py-10 sm:px-10 lg:w-[45%] lg:px-14 xl:px-24">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-9 flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-[0_12px_30px_rgba(15,23,42,0.18)]"><School className="size-6" /></div>
            <div><p className="font-bold tracking-[-0.02em] text-slate-950">{schoolName}</p><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">SchoolDB · Student space</p></div>
          </div>

          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">{passwordMode || staffOtpMode ? "School workspace" : "Welcome back"}</p>
            <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-slate-950 sm:text-4xl">{passwordMode ? "Staff sign in" : "Login with WhatsApp"}</h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">{passwordMode ? "Use your existing administrator or teacher credentials." : staffOtpMode ? "Use the mobile number registered to your staff account." : "Use the mobile number registered with the student. No password needed."}</p>
          </div>

          {!passwordMode && (
            <div className="mb-6 grid grid-cols-2 rounded-2xl border border-slate-200 bg-slate-50 p-1.5" role="tablist" aria-label="Choose account type">
              <button type="button" role="tab" aria-selected={loginMode === "FAMILY"} onClick={() => switchLoginMode("FAMILY")} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition ${loginMode === "FAMILY" ? "bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-800"}`}><Users className="size-4" />Student / Parent</button>
              <button type="button" role="tab" aria-selected={loginMode === "STAFF"} onClick={() => switchLoginMode("STAFF")} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition ${loginMode === "STAFF" ? "bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-800"}`}><UserRoundCog className="size-4" />Staff</button>
            </div>
          )}

          {passwordMode ? (
            <SignIn
              forceRedirectUrl={`/${schoolSlug}`}
              fallbackRedirectUrl={`/${schoolSlug}`}
              appearance={{
                variables: { colorPrimary: "#4f46e5", colorBackground: "#ffffff", colorForeground: "#0f172a", borderRadius: "1rem" },
                elements: { rootBox: "w-full", card: "w-full bg-transparent shadow-none border-0 p-0", headerTitle: "hidden", headerSubtitle: "hidden", formButtonPrimary: "bg-indigo-600 hover:bg-indigo-700", footerActionLink: "text-indigo-600" },
              }}
            />
          ) : (
            <form onSubmit={(event) => { event.preventDefault(); void (pendingVerification ? handleSignIn() : handleSendOTP()); }} className="space-y-6">
              <OTPLogin phoneNumber={phoneNumber} otpCode={otpCode} setPhoneNumber={setPhoneNumber} setOtpCode={setOtpCode} pendingVerification={pendingVerification} otpInputRef={otpInputRef} isSending={isSending} resendTimer={resendTimer} handleSendOTP={handleSendOTP} />
              {pendingVerification && <button type="button" onClick={() => { setPendingVerification(false); setOtpCode(""); setResendTimer(0); }} className="text-xs font-semibold text-slate-500 hover:text-indigo-600">Use a different mobile number</button>}
              <button type="submit" disabled={isSending || (pendingVerification && otpCode.length !== 6)} className="group flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-bold text-white shadow-[0_14px_32px_rgba(15,23,42,0.2)] transition hover:-translate-y-0.5 hover:bg-indigo-600 hover:shadow-[0_18px_38px_rgba(79,70,229,0.25)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0">
                {isSending ? <LoaderCircle className="size-5 animate-spin" /> : <>{pendingVerification ? "Verify & login" : "Send WhatsApp OTP"}<ChevronRight className="size-4 opacity-60 transition-transform group-hover:translate-x-1" /></>}
              </button>
            </form>
          )}

          <button type="button" onClick={() => switchLoginMode(passwordMode ? "STAFF" : "PASSWORD")} className="mt-7 flex w-full items-center justify-center gap-2 border-t border-slate-100 pt-6 text-sm font-semibold text-slate-500 transition hover:text-indigo-600">
            <LockKeyhole className="size-4" />{passwordMode ? "Use staff WhatsApp OTP instead" : "Use staff email or password instead"}
          </button>
          <div className="mt-7 flex items-center justify-between text-[11px] text-slate-400"><span>Powered by SchoolDB</span><span className="flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-emerald-500" />Secure connection</span></div>
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
          <div className={`mx-auto flex size-24 items-center justify-center rounded-[28px] bg-gradient-to-br ${feature.color} shadow-2xl ring-4 ring-white/5`}><FeatureIcon className="size-11 text-white" /></div>
          <h2 className="mt-8 text-4xl font-bold tracking-[-0.04em] text-white">{feature.title}</h2>
          <p className="mx-auto mt-4 max-w-lg text-lg leading-8 text-zinc-400">{feature.description}</p>
          <div className="mt-14 flex justify-center gap-2.5" aria-label="Feature slides">{FEATURES.map((item, index) => <button key={item.title} type="button" aria-label={`Show ${item.title}`} onClick={() => setCurrentFeature(index)} className={`h-1.5 rounded-full transition-all duration-500 ${index === currentFeature ? "w-12 bg-white" : "w-2 bg-zinc-700 hover:bg-zinc-500"}`} />)}</div>
        </div>
      </section>
    </main>
  );
}
