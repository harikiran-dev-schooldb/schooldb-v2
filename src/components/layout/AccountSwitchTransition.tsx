"use client";

import { LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { SchoolLogo } from "@/components/branding/SchoolLogo";

type AccountSwitchTransitionDetail = {
  schoolName: string;
  schoolLogo: string | null;
};

const START_EVENT = "schooldb:account-switch-start";
const FINISH_EVENT = "schooldb:account-switch-finish";

export function startAccountSwitchTransition(
  detail: AccountSwitchTransitionDetail,
) {
  window.dispatchEvent(new CustomEvent(START_EVENT, { detail }));
}

export function finishAccountSwitchTransition() {
  window.dispatchEvent(new Event(FINISH_EVENT));
}

export function AccountSwitchTransition() {
  const [detail, setDetail] = useState<AccountSwitchTransitionDetail | null>(null);

  useEffect(() => {
    const start = (event: Event) => {
      setDetail((event as CustomEvent<AccountSwitchTransitionDetail>).detail);
    };
    const finish = () => setDetail(null);

    window.addEventListener(START_EVENT, start);
    window.addEventListener(FINISH_EVENT, finish);
    return () => {
      window.removeEventListener(START_EVENT, start);
      window.removeEventListener(FINISH_EVENT, finish);
    };
  }, []);

  if (!detail) return null;

  return (
    <div
      className="schooldb-workspace-launch fixed inset-0 z-[200] flex items-center justify-center overflow-hidden"
      role="status"
      aria-live="polite"
      aria-label={`Switching account for ${detail.schoolName}`}
    >
      <div className="schooldb-workspace-grid absolute inset-0" aria-hidden="true" />
      <div className="schooldb-workspace-launch-flare absolute size-44 rounded-full" aria-hidden="true" />
      <div className="schooldb-workspace-launch-content relative flex w-[min(88vw,420px)] flex-col items-center text-center">
        <div className="relative flex size-36 items-center justify-center sm:size-40">
          <div className="schooldb-workspace-ring schooldb-workspace-ring-one absolute inset-0 rounded-full border border-indigo-200/70" />
          <div className="schooldb-workspace-ring schooldb-workspace-ring-two absolute inset-4 rounded-full border border-indigo-100" />
          <div className="schooldb-workspace-logo-halo absolute inset-7 rounded-[32px]" />
          <SchoolLogo
            src={detail.schoolLogo}
            schoolName={detail.schoolName}
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
          Preparing your {detail.schoolName} workspace
        </p>
        <div
          className="mt-7 h-1.5 w-full overflow-hidden rounded-full border border-slate-200/80 bg-slate-100/90 shadow-inner"
          aria-hidden="true"
        >
          <div className="schooldb-workspace-progress h-full rounded-full" />
        </div>
      </div>
    </div>
  );
}
