"use client";

import { useEffect, useState } from "react";
import { Check, ShieldCheck, Sparkles } from "lucide-react";

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
    void applySchoolLogoBrandColor(schoolSlug, schoolLogo);

    const transitionSchool = window.sessionStorage.getItem(TRANSITION_KEY);

    if (transitionSchool !== schoolSlug) {
      document.documentElement.classList.remove(
        "schooldb-workspace-transition-pending",
      );
      return;
    }

    window.sessionStorage.removeItem(TRANSITION_KEY);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.documentElement.classList.remove(
        "schooldb-workspace-transition-pending",
      );
      return;
    }

    const startTimer = window.setTimeout(() => setVisible(true), 0);

    const revealTimer = window.setTimeout(() => {
      document.documentElement.classList.remove(
        "schooldb-workspace-transition-pending",
      );
      setLeaving(true);
    }, 280);

    const finishTimer = window.setTimeout(() => setVisible(false), 820);

    return () => {
      window.clearTimeout(startTimer);
      window.clearTimeout(revealTimer);
      window.clearTimeout(finishTimer);
      document.documentElement.classList.remove(
        "schooldb-workspace-transition-pending",
      );
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
      <div className="schooldb-workspace-beam schooldb-workspace-beam-left" aria-hidden="true" />
      <div className="schooldb-workspace-beam schooldb-workspace-beam-right" aria-hidden="true" />

      <div className="schooldb-workspace-arrival-content relative flex w-[min(88vw,430px)] flex-col items-center text-center">
        <div className="relative flex size-36 items-center justify-center sm:size-40">
          <div className="schooldb-workspace-ring schooldb-workspace-ring-one absolute inset-0 rounded-full border border-white/25" />
          <div className="schooldb-workspace-ring schooldb-workspace-ring-two absolute inset-4 rounded-full border border-dashed border-white/30" />
          <div className="schooldb-workspace-logo-halo absolute inset-7 rounded-[32px]" />
          <SchoolLogo
            src={schoolLogo}
            schoolName={schoolName}
            sizes="88px"
            className="relative size-[88px] rounded-[25px] border-white/80 shadow-[0_28px_80px_rgba(15,23,42,.38)] ring-8 ring-white/10"
            priority
          />
          <span className="schooldb-workspace-verified absolute bottom-3 right-2 flex size-8 items-center justify-center rounded-full border-2 border-white/70 bg-emerald-400 text-emerald-950 shadow-lg sm:right-3">
            <Check className="size-4 stroke-[3]" />
          </span>
        </div>

        <div className="mt-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/90 backdrop-blur-xl">
          <ShieldCheck className="size-3.5 text-emerald-300" />
          Identity verified
        </div>

        <h2 className="mt-4 text-2xl font-black tracking-[-0.035em] text-white sm:text-3xl">
          Welcome to {schoolName}
        </h2>
        <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-white/80">
          <Sparkles className="size-4 text-white/75" />
          Preparing your secure workspace
        </p>

        <div className="mt-7 h-1.5 w-full overflow-hidden rounded-full bg-white/10 ring-1 ring-white/10">
          <span className="schooldb-workspace-progress block h-full rounded-full " />
        </div>

        <div className="mt-3 flex w-full justify-between text-[9px] font-bold uppercase tracking-[0.14em] text-white/60">
          <span>Verified</span>
          <span>School connected</span>
          <span>Workspace ready</span>
        </div>
      </div>
    </div>
  );
}
