"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";

import { SchoolLogo } from "@/components/branding/SchoolLogo";
import { applySchoolLogoBrandColor } from "@/lib/logo-brand-color";

type Props = {
  schoolSlug: string;
  schoolName: string;
  schoolLogo: string | null;
};

const TRANSITION_KEY = "schooldb-workspace-transition";

export function WorkspaceEntryTransition({
  schoolSlug,
  schoolName,
  schoolLogo,
}: Props) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    void applySchoolLogoBrandColor(schoolSlug, schoolLogo, controller.signal);

    return () => controller.abort();
  }, [schoolLogo, schoolSlug]);

  useEffect(() => {
    const transitionSchool = window.sessionStorage.getItem(TRANSITION_KEY);

    if (transitionSchool !== schoolSlug) return;

    window.sessionStorage.removeItem(TRANSITION_KEY);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const startTimer = window.setTimeout(() => setVisible(true), 0);

    const revealTimer = window.setTimeout(() => {
      setLeaving(true);
    }, 620);

    const finishTimer = window.setTimeout(() => setVisible(false), 1_200);

    return () => {
      window.clearTimeout(startTimer);
      window.clearTimeout(revealTimer);
      window.clearTimeout(finishTimer);
    };
  }, [schoolSlug]);

  if (!visible) return null;

  return (
    <div
      className={`schooldb-workspace-arrival fixed inset-0 z-[100] flex items-center justify-center overflow-hidden ${leaving ? "is-leaving" : ""}`}
      role="status"
      aria-live="polite"
      aria-label={`Opening ${schoolName} workspace`}
    >
      <div className="schooldb-workspace-grid absolute inset-0" aria-hidden="true" />
      <div className="schooldb-workspace-launch-flare absolute size-44 rounded-full" aria-hidden="true" />
      <div className="schooldb-workspace-beam schooldb-workspace-beam-left" aria-hidden="true" />
      <div className="schooldb-workspace-beam schooldb-workspace-beam-right" aria-hidden="true" />

      <div className="schooldb-workspace-arrival-content relative flex w-[min(88vw,430px)] flex-col items-center text-center">
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
          <span className="schooldb-workspace-verified absolute bottom-3 right-2 flex size-8 items-center justify-center rounded-full border-2 border-white/70 bg-emerald-400 text-emerald-950 shadow-lg sm:right-3">
            <Check className="size-4 stroke-[3]" />
          </span>
        </div>

        <p className="mt-7 text-[10px] font-black uppercase tracking-[0.22em] text-emerald-600">
          Access granted
        </p>

        <h2 className="mt-3 text-2xl font-black tracking-[-0.035em] text-slate-950 sm:text-3xl">
          {schoolName}
        </h2>
        <p className="mt-2 text-sm font-semibold text-slate-500">
          Connecting your secure workspace
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
