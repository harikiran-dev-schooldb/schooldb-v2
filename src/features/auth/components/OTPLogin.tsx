"use client";

import type { Dispatch, RefObject, SetStateAction } from "react";
import { CheckCircle2, KeyRound, Phone, RotateCw } from "lucide-react";

type Props = {
  phoneNumber: string;
  otpCode: string;
  setPhoneNumber: Dispatch<SetStateAction<string>>;
  setOtpCode: Dispatch<SetStateAction<string>>;
  pendingVerification: boolean;
  otpInputRef: RefObject<HTMLInputElement | null>;
  isSending: boolean;
  resendTimer: number;
  handleSendOTP: () => Promise<void>;
};

export default function OTPLogin({
  phoneNumber,
  otpCode,
  setPhoneNumber,
  setOtpCode,
  pendingVerification,
  otpInputRef,
  isSending,
  resendTimer,
  handleSendOTP,
}: Props) {
  return (
    <fieldset className="flex flex-col gap-5" disabled={isSending}>
      <label className="grid gap-2.5">
        <span className="flex items-center justify-between gap-3">
          <span className="text-sm font-bold text-slate-700">
            Registered mobile number
          </span>
          {pendingVerification && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
              <CheckCircle2 className="size-3.5" />
              OTP sent
            </span>
          )}
        </span>

        <div className="group relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
            <Phone className="size-4.5 text-slate-400 transition group-focus-within:text-indigo-500" />
          </div>
          <span className="pointer-events-none absolute left-11 top-1/2 -translate-y-1/2 border-r border-slate-200 pr-3 text-sm font-bold text-slate-600">
            +91
          </span>
          <input
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            aria-label="Registered mobile number"
            value={phoneNumber}
            onChange={(event) =>
              setPhoneNumber(event.target.value.replace(/\D/g, "").slice(0, 10))
            }
            placeholder="98765 43210"
            disabled={pendingVerification}
            className="h-[56px] w-full rounded-2xl border border-slate-200 bg-slate-50/80 pl-[92px] pr-4 text-[15px] font-semibold tracking-[0.02em] text-slate-950 outline-none transition placeholder:font-medium placeholder:tracking-normal placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100/80 disabled:cursor-not-allowed disabled:bg-slate-100/80 disabled:text-slate-600"
          />
        </div>

        {!pendingVerification && (
          <span className="text-[11px] leading-5 text-slate-400">
            We will send a 6-digit verification code to your registered WhatsApp
            number.
          </span>
        )}
      </label>

      {pendingVerification && (
        <div className="grid gap-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-slate-700">
                WhatsApp verification code
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Sent to +91 ••••••{phoneNumber.slice(-4)}
              </p>
            </div>
            <button
              type="button"
              onClick={handleSendOTP}
              disabled={resendTimer > 0}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-1 py-1 text-xs font-bold text-indigo-600 transition hover:text-indigo-700 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              <RotateCw className="size-3.5" />
              {resendTimer > 0 ? "Resend in " + resendTimer + "s" : "Resend OTP"}
            </button>
          </div>

          <div className="group relative">
            <KeyRound className="pointer-events-none absolute left-4 top-1/2 size-4.5 -translate-y-1/2 text-slate-400 transition group-focus-within:text-indigo-500" />
            <input
              ref={otpInputRef}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              aria-label="Six digit WhatsApp code"
              value={otpCode}
              onChange={(event) =>
                setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="• • • • • •"
              className="h-[60px] w-full rounded-2xl border border-slate-200 bg-slate-50/80 pl-12 pr-4 text-center text-xl font-extrabold tracking-[0.38em] text-slate-950 outline-none transition placeholder:tracking-[0.18em] placeholder:text-slate-300 hover:border-slate-300 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100/80"
            />
          </div>
        </div>
      )}
    </fieldset>
  );
}
