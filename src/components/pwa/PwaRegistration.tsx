"use client";

import { useAuth } from "@clerk/nextjs";
import { BellRing, CloudOff, Download, RefreshCw, Share, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  browserPushState,
  enableBrowserPush,
  isAppleMobile,
  isStandalonePwa,
  refreshBrowserPush,
  type BrowserPushState,
} from "@/lib/browser-push";
import { isSchoolDbProductionHost } from "@/lib/production-domain";
import {
  clearActivePwaOwner,
  flushPwaActions,
  rememberPwaOwner,
  savePwaSnapshot,
  type PwaOfflineSnapshot,
} from "@/lib/pwa-storage";
import { schoolSlugFromPath } from "@/lib/tenant-context";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function subscribeOnlineStatus(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function browserOnlineStatus() {
  return navigator.onLine;
}

export function PwaRegistration() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const schoolSlug = useMemo(() => schoolSlugFromPath(pathname), [pathname]);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showAppleInstructions, setShowAppleInstructions] = useState(false);
  const online = useSyncExternalStore(subscribeOnlineStatus, browserOnlineStatus, () => true);
  const [updateReady, setUpdateReady] = useState(false);
  const [pushDialogOpen, setPushDialogOpen] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushState, setPushState] = useState<BrowserPushState>("available");

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

    const watchForUpdate = (registration: ServiceWorkerRegistration) => {
      if (registration.waiting && navigator.serviceWorker.controller) setUpdateReady(true);
      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        worker?.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            setUpdateReady(true);
          }
        });
      });
    };
    const register = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" })
        .then(watchForUpdate)
        .catch(() => {
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
    if (!online) return;
    window.dispatchEvent(new Event("schooldb:sync-requested"));
  }, [online]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn || !userId) {
      clearActivePwaOwner();
      return;
    }
    if (!schoolSlug) return;

    const ownerKey = `${userId}:${schoolSlug}`;
    rememberPwaOwner(ownerKey);
    let cancelled = false;
    const sync = async () => {
      if (!navigator.onLine) return;
      try {
        const response = await fetch(`/api/v1/pwa/snapshot?schoolSlug=${encodeURIComponent(schoolSlug)}`, {
          cache: "no-store",
        });
        const result = await response.json();
        if (response.ok && result.success && !cancelled) {
          await savePwaSnapshot(ownerKey, result.data as PwaOfflineSnapshot);
        }
        const flushed = await flushPwaActions(ownerKey);
        if (flushed.completed > 0 && !cancelled) {
          toast.success(`${flushed.completed} saved request${flushed.completed === 1 ? "" : "s"} submitted.`);
          router.refresh();
        }
      } catch {
        // The cached copy and pending actions remain available for a later sync.
      }
    };
    const handleSync = () => void sync();
    void sync();
    window.addEventListener("schooldb:sync-requested", handleSync);
    return () => {
      cancelled = true;
      window.removeEventListener("schooldb:sync-requested", handleSync);
    };
  }, [isLoaded, isSignedIn, router, schoolSlug, userId]);

  useEffect(() => {
    if (!isSchoolDbProductionHost(window.location.hostname) || isStandalonePwa()) return;
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

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !userId || !schoolSlug) return;
    if (pathname.includes("/login") || pathname.endsWith("/logout")) return;

    let cancelled = false;
    const prepare = async () => {
      const refreshed = await refreshBrowserPush(schoolSlug);
      if (cancelled || refreshed) {
        if (!cancelled) setPushState("enabled");
        return;
      }
      const nextState = browserPushState(schoolSlug);
      setPushState(nextState);
      if (nextState !== "available") return;
      const snoozedUntil = Number(localStorage.getItem(`schooldb:push-snooze:${schoolSlug}`) || 0);
      if (Date.now() < snoozedUntil) return;
      window.setTimeout(() => {
        if (!cancelled) setPushDialogOpen(true);
      }, 1_200);
    };
    void prepare();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, pathname, schoolSlug, userId]);

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

  async function enableNotifications() {
    if (!schoolSlug) return;
    setPushBusy(true);
    try {
      const enabled = await enableBrowserPush(schoolSlug);
      if (enabled) {
        setPushState("enabled");
        setPushDialogOpen(false);
        localStorage.removeItem(`schooldb:push-snooze:${schoolSlug}`);
        toast.success("SchoolDB notifications are enabled.");
      }
    } catch (error) {
      setPushState(browserPushState(schoolSlug));
      toast.error(error instanceof Error ? error.message : "Unable to enable notifications.");
    } finally {
      setPushBusy(false);
    }
  }

  function snoozeNotifications() {
    if (schoolSlug) {
      localStorage.setItem(
        `schooldb:push-snooze:${schoolSlug}`,
        String(Date.now() + 3 * 24 * 60 * 60 * 1_000),
      );
    }
    setPushDialogOpen(false);
  }

  async function applyUpdate() {
    const registration = await navigator.serviceWorker.getRegistration("/");
    if (!registration?.waiting) {
      window.location.reload();
      return;
    }
    navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload(), { once: true });
    registration?.waiting?.postMessage({ type: "SKIP_WAITING" });
  }

  return (
    <>
      {!online && (
        <div className="fixed inset-x-0 top-0 z-[70] flex items-center justify-center gap-2 bg-amber-500 px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 text-center text-xs font-semibold text-amber-950 shadow-lg">
          <CloudOff className="size-4" /> Offline mode · saved information remains available
        </div>
      )}

      {(installPrompt || showAppleInstructions || updateReady) && (
        <aside className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-border/70 bg-card/95 p-3 shadow-2xl backdrop-blur-xl">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {updateReady ? <RefreshCw className="size-5" /> : showAppleInstructions ? <Share className="size-5" /> : <Download className="size-5" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{updateReady ? "SchoolDB update ready" : "Install SchoolDB"}</p>
            <p className="text-xs leading-5 text-muted-foreground">
              {updateReady
                ? "Reload to use the newest app and offline improvements."
                : showAppleInstructions
                  ? "Tap Share, then Add to Home Screen. Open the installed app to enable iPhone notifications."
                  : "Install the app for faster access and reliable notifications."}
            </p>
          </div>
          {updateReady ? (
            <Button type="button" size="sm" onClick={() => void applyUpdate()}>Update</Button>
          ) : installPrompt ? (
            <Button type="button" size="sm" className="shrink-0" onClick={() => void install()}>
              Install
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 rounded-lg"
            aria-label="Dismiss"
            onClick={() => updateReady ? setUpdateReady(false) : dismissInstallPrompt()}
          >
            <X className="size-4" />
          </Button>
        </aside>
      )}

      <Dialog open={pushDialogOpen} onOpenChange={setPushDialogOpen}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <span className="mb-2 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <BellRing className="size-6" />
            </span>
            <DialogTitle>Stay updated by your school</DialogTitle>
            <DialogDescription className="leading-6">
              Allow SchoolDB to notify you about homework, attendance, fees, exams, leave decisions, and urgent announcements.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl border border-border/70 bg-muted/35 p-4 text-sm leading-6 text-muted-foreground">
            You can choose notification categories and inspect PWA status from the PWA settings page.
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={snoozeNotifications}>Not now</Button>
            {schoolSlug && (
              <Button asChild type="button" variant="outline">
                <Link href={`/${schoolSlug}/pwa`} onClick={() => setPushDialogOpen(false)}>PWA settings</Link>
              </Button>
            )}
            <Button type="button" disabled={pushBusy || pushState !== "available"} onClick={() => void enableNotifications()}>
              {pushBusy ? "Enabling…" : "Enable notifications"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
