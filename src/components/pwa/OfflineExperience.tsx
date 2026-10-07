"use client";

import Image from "next/image";
import Link from "next/link";
import { CloudOff, Database, RefreshCw, ShieldCheck, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

export function OfflineExperience() {
  const [online, setOnline] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const updateConnection = () => setOnline(navigator.onLine);
    updateConnection();
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    return () => {
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
    };
  }, []);

  return (
    <section className="schooldb-offline-panel relative z-10 grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/70 shadow-[0_36px_120px_rgba(2,6,23,0.65)] backdrop-blur-2xl lg:grid-cols-[1.05fr_0.95fr]">
      <div className="relative z-10 flex flex-col justify-center p-7 sm:p-10 lg:p-14">
        <div className="flex items-center gap-3">
          <Image
            src="/pwa-192.png"
            alt="SchoolDB"
            width={44}
            height={44}
            className="rounded-xl shadow-lg shadow-indigo-950/50"
            priority
          />
          <div>
            <p className="text-sm font-semibold tracking-wide text-white">SchoolDB</p>
            <p className="text-xs text-slate-400">Offline workspace</p>
          </div>
        </div>

        <div
          className={`mt-10 inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${
            online
              ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-200"
              : "border-amber-300/20 bg-amber-300/10 text-amber-100"
          }`}
          role="status"
          aria-live="polite"
        >
          <span className={`size-2 rounded-full ${online ? "bg-emerald-400" : "schooldb-offline-status-dot bg-amber-300"}`} />
          {online ? "Connection restored" : "No internet connection"}
        </div>

        <h1 className="mt-5 max-w-xl text-4xl font-bold tracking-[-0.04em] text-white sm:text-5xl">
          You are offline<span className="text-indigo-400">.</span>
        </h1>
        <p className="mt-4 max-w-lg text-sm leading-7 text-slate-300 sm:text-base">
          {online
            ? "Your connection is back. Try again to return to the latest school information."
            : "SchoolDB is keeping this page ready while the network reconnects. Any saved school data remains available below."}
        </p>

        <Link
          href="/"
          onClick={() => setChecking(true)}
          className="schooldb-offline-retry mt-8 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-slate-950 shadow-xl shadow-indigo-950/30 outline-none transition hover:-translate-y-0.5 hover:bg-indigo-50 focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 sm:w-fit"
        >
          <RefreshCw className={`size-4 ${checking ? "animate-spin" : ""}`} aria-hidden="true" />
          Try again
        </Link>

        <div className="mt-9 grid gap-3 text-xs text-slate-400 sm:grid-cols-2">
          <div className="flex items-center gap-2.5">
            <Database className="size-4 text-indigo-300" aria-hidden="true" />
            Saved data stays on this device
          </div>
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="size-4 text-violet-300" aria-hidden="true" />
            Changes sync after reconnecting
          </div>
        </div>
      </div>

      <div className="relative flex min-h-[360px] items-center justify-center overflow-hidden border-t border-white/10 bg-gradient-to-br from-indigo-500/10 via-violet-500/5 to-cyan-400/10 p-8 lg:min-h-[590px] lg:border-t-0 lg:border-l">
        <div className="schooldb-offline-grid absolute inset-0 opacity-40" aria-hidden="true" />
        <div className="schooldb-offline-signal relative flex aspect-square w-full max-w-[350px] items-center justify-center" aria-hidden="true">
          <span className="schooldb-offline-ring schooldb-offline-ring-one absolute inset-[8%] rounded-full border border-indigo-300/15" />
          <span className="schooldb-offline-ring schooldb-offline-ring-two absolute inset-[20%] rounded-full border border-violet-300/20" />
          <span className="schooldb-offline-ring schooldb-offline-ring-three absolute inset-[32%] rounded-full border border-cyan-200/25" />

          <div className="schooldb-offline-orbit absolute inset-[13%] rounded-full border border-dashed border-indigo-200/20">
            <span className="absolute top-1/2 -left-1 size-2 rounded-full bg-indigo-300 shadow-[0_0_18px_4px_rgba(165,180,252,0.55)]" />
            <span className="absolute top-1/2 -right-1 size-2 rounded-full bg-cyan-200 shadow-[0_0_18px_4px_rgba(165,243,252,0.45)]" />
          </div>

          <div className="schooldb-offline-core relative flex size-32 items-center justify-center rounded-[2rem] border border-white/15 bg-slate-950/80 shadow-[0_0_70px_rgba(99,102,241,0.32)] backdrop-blur-xl">
            <CloudOff className="size-14 text-indigo-200" strokeWidth={1.5} />
            <span className="absolute -right-2 -bottom-2 flex size-10 items-center justify-center rounded-xl border border-white/15 bg-violet-500 text-white shadow-lg shadow-violet-950/40">
              <WifiOff className="size-5" />
            </span>
          </div>
        </div>

        <div className="schooldb-offline-float absolute top-8 right-7 rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-[11px] font-medium text-slate-300 shadow-xl backdrop-blur-xl">
          Waiting for network…
        </div>
        <div className="schooldb-offline-float schooldb-offline-float-delay absolute bottom-8 left-7 flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-[11px] font-medium text-slate-300 shadow-xl backdrop-blur-xl">
          <span className="size-1.5 rounded-full bg-emerald-400" />
          Auto-reconnect enabled
        </div>
      </div>
    </section>
  );
}
