"use client";

import type { Dispatch, RefObject, SetStateAction } from "react";
import { KeyRound, Phone, RotateCw } from "lucide-react";

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
    <fieldset className="flex flex-col gap-6" disabled={isSending}>
      <label className="grid gap-2.5">
        <span className="text-sm font-semibold text-slate-700">Registered mobile number</span>
        <div className="relative">
          <Phone className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
          <span className="absolute left-12 top-1/2 -translate-y-1/2 border-r border-slate-200 pr-3 text-sm font-semibold text-slate-600">+91</span>
          <input
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            aria-label="Registered mobile number"
            value={phoneNumber}
            onChange={(event) => setPhoneNumber(event.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="Enter mobile number"
            disabled={pendingVerification}
            className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50/70 pl-24 pr-4 text-slate-900 shadow-inner shadow-slate-100 outline-none transition placeholder:text-slate-400 hover:border-indigo-200 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100 disabled:opacity-70"
          />
        </div>
      </label>

      {pendingVerification && (
        <div className="grid gap-3">
          <div className="flex items-end justify-between gap-3">
            <div><p className="text-sm font-semibold text-slate-700">WhatsApp verification code</p><p className="mt-1 text-xs text-slate-500">Enter the 6-digit code sent to +91 ••••••{phoneNumber.slice(-4)}</p></div>
            <button type="button" onClick={handleSendOTP} disabled={resendTimer > 0} className="inline-flex shrink-0 items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 disabled:cursor-not-allowed disabled:text-slate-400">
              <RotateCw className="size-3.5" />{resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend OTP"}
            </button>
          </div>
          <div className="relative">
            <KeyRound className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
            <input
              ref={otpInputRef}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              aria-label="Six digit WhatsApp code"
              value={otpCode}
              onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="••••••"
              className="h-16 w-full rounded-2xl border border-slate-200 bg-slate-50/70 pl-12 pr-4 text-center text-xl font-bold tracking-[0.45em] text-slate-900 shadow-inner shadow-slate-100 outline-none transition placeholder:text-slate-300 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
            />
          </div>
        </div>
      )}
    </fieldset>
  );
}
