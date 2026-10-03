"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { isSchoolDbProductionHost } from "@/lib/production-domain";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isAppleMobile() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function PwaRegistration() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showAppleInstructions, setShowAppleInstructions] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (!isSchoolDbProductionHost(window.location.hostname)) {
      void navigator.serviceWorker.getRegistrations().then((registrations) =>
        Promise.all(registrations.map((registration) => registration.unregister())),
      );
      if ("caches" in window) {
        void caches.keys().then((keys) =>
          Promise.all(
            keys
              .filter((key) => key.startsWith("schooldb-pwa-"))
              .map((key) => caches.delete(key)),
          ),
        );
      }
      return;
    }

    const register = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // Installation support should never interrupt the application UI.
      });
    };

    if (document.readyState === "complete") {
      register();
      return;
    }

    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  useEffect(() => {
    if (!isSchoolDbProductionHost(window.location.hostname) || isStandalone()) return;
    if (sessionStorage.getItem("schooldb:pwa-install-dismissed")) return;

    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => {
      setInstallPrompt(null);
      setShowAppleInstructions(false);
    };

    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    const appleInstructionTimer = isAppleMobile()
      ? window.setTimeout(() => setShowAppleInstructions(true), 0)
      : undefined;

    return () => {
      if (appleInstructionTimer !== undefined) window.clearTimeout(appleInstructionTimer);
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  function dismissInstallPrompt() {
    sessionStorage.setItem("schooldb:pwa-install-dismissed", "1");
    setInstallPrompt(null);
    setShowAppleInstructions(false);
  }

  async function install() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome !== "accepted") dismissInstallPrompt();
    setInstallPrompt(null);
  }

  if (!installPrompt && !showAppleInstructions) return null;

  return (
    <aside className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-border/70 bg-card/95 p-3 shadow-2xl backdrop-blur-xl">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {showAppleInstructions ? <Share className="size-5" /> : <Download className="size-5" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Install SchoolDB</p>
        <p className="text-xs leading-5 text-muted-foreground">
          {showAppleInstructions
            ? "Tap Share, then Add to Home Screen. Open the installed app to enable iPhone notifications."
            : "Install the app for faster access and reliable notifications."}
        </p>
      </div>
      {installPrompt && (
        <Button type="button" size="sm" className="shrink-0" onClick={() => void install()}>
          Install
        </Button>
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8 shrink-0 rounded-lg"
        aria-label="Dismiss installation instructions"
        onClick={dismissInstallPrompt}
      >
        <X className="size-4" />
      </Button>
    </aside>
  );
}
