"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, Check, Loader2, Settings2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { isSchoolDbProductionHost } from "@/lib/production-domain";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  category: string;
  priority: string;
  targetLabel: string;
  publishedAt: string;
  read: boolean;
};

type Feed = {
  unreadCount: number;
  items: NotificationItem[];
};

const emptyFeed: Feed = { unreadCount: 0, items: [] };

function withTimeout<T>(promise: Promise<T>, milliseconds: number, message: string) {
  return new Promise<T>((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error(message)), milliseconds);
    promise.then(
      (value) => {
        window.clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

function browserDeviceKey(schoolSlug: string) {
  return `schooldb:web-push:v1:${schoolSlug}`;
}

function notificationDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}

export function NotificationMenu({ schoolSlug }: { schoolSlug: string }) {
  const router = useRouter();
  const [feed, setFeed] = useState<Feed>(emptyFeed);
  const [loading, setLoading] = useState(true);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushStage, setPushStage] = useState("");
  const [pushEnabled, setPushEnabled] = useState(false);

  const loadFeed = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/v1/notifications?schoolSlug=${encodeURIComponent(schoolSlug)}`,
        { cache: "no-store" },
      );
      const result = await response.json();
      if (response.ok && result.success) setFeed(result.data);
    } finally {
      setLoading(false);
    }
  }, [schoolSlug]);

  const rebindPush = useCallback(async () => {
    if (!isSchoolDbProductionHost(window.location.hostname)) return;

    if (
      !("Notification" in window) ||
      !("serviceWorker" in navigator) ||
      Notification.permission !== "granted"
    ) return;

    const key = browserDeviceKey(schoolSlug);
    const installationId = localStorage.getItem(key);
    if (!installationId) return;

    try {
      const [{ getToken }, firebaseClient] = await Promise.all([
        import("firebase/messaging"),
        import("@/lib/firebase-client"),
      ]);
      if (!firebaseClient.firebaseWebPushConfigured || !firebaseClient.firebaseVapidKey) return;
      const messaging = await firebaseClient.webMessaging();
      if (!messaging) return;
      const registration =
        (await navigator.serviceWorker.getRegistration("/")) ??
        (await navigator.serviceWorker.register("/sw.js", { scope: "/" }));
      const fcmToken = await getToken(messaging, {
        vapidKey: firebaseClient.firebaseVapidKey,
        serviceWorkerRegistration: registration,
      });
      if (!fcmToken) return;

      const response = await fetch("/api/v1/web-push/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolSlug, installationId, fcmToken }),
      });
      if (response.ok) setPushEnabled(true);
    } catch (error) {
      console.warn("Unable to refresh browser push registration.", error);
    }
  }, [schoolSlug]);

  useEffect(() => {
    // The subscription flag is browser-local and is only available after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPushEnabled(Boolean(localStorage.getItem(browserDeviceKey(schoolSlug))));
    void loadFeed();
    void rebindPush();
    const refresh = () => {
      if (document.visibilityState === "visible") void loadFeed();
    };
    document.addEventListener("visibilitychange", refresh);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [loadFeed, rebindPush, schoolSlug]);

  async function markRead(item: NotificationItem) {
    if (!item.read) {
      setFeed((current) => ({
        unreadCount: Math.max(0, current.unreadCount - 1),
        items: current.items.map((entry) =>
          entry.id === item.id ? { ...entry, read: true } : entry,
        ),
      }));
      await fetch("/api/v1/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolSlug,
          announcementId: item.id,
          read: true,
        }),
      });
    }
    router.push(`/${schoolSlug}/notification-inbox`);
  }

  async function enablePush() {
    if (!isSchoolDbProductionHost(window.location.hostname)) {
      toast.error("Browser notifications are available only on schooldb.co.in.");
      return;
    }
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      toast.error("This browser does not support push notifications.");
      return;
    }

    setPushBusy(true);
    try {
      setPushStage("Requesting permission");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Notification permission was not granted.");
        return;
      }

      const [{ getToken }, firebaseClient] = await Promise.all([
        import("firebase/messaging"),
        import("@/lib/firebase-client"),
      ]);
      const { firebaseVapidKey, firebaseWebPushConfigured, webMessaging } =
        firebaseClient;
      if (!firebaseWebPushConfigured || !firebaseVapidKey) {
        throw new Error("Browser push needs the Firebase web keys to be configured.");
      }

      setPushStage("Starting Firebase");
      const messaging = await withTimeout(
        webMessaging(),
        10_000,
        "Firebase messaging did not start. Check browser storage access and reload.",
      );
      if (!messaging) throw new Error("Push messaging is unavailable.");
      setPushStage("Starting service worker");
      const existingRegistration =
        await navigator.serviceWorker.getRegistration("/");
      if (!existingRegistration) {
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      }
      const registration = await withTimeout(
        navigator.serviceWorker.ready,
        10_000,
        "The notification service worker did not become ready. Reload the page and try again.",
      );
      setPushStage("Registering browser");
      const fcmToken = await withTimeout(
        getToken(messaging, {
          vapidKey: firebaseVapidKey,
          serviceWorkerRegistration: registration,
        }),
        20_000,
        "Firebase did not return a browser token. Confirm that the VAPID key belongs to this Firebase project.",
      );
      if (!fcmToken) throw new Error("The browser did not return a push token.");

      const key = browserDeviceKey(schoolSlug);
      const installationId =
        localStorage.getItem(key) ?? `web:${crypto.randomUUID()}`;
      const response = await fetch("/api/v1/web-push/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolSlug, installationId, fcmToken }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to enable browser alerts.");
      }
      localStorage.setItem(key, installationId);
      setPushEnabled(true);
      toast.success("Browser notifications are enabled.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to enable browser alerts.",
      );
    } finally {
      setPushBusy(false);
      setPushStage("");
    }
  }

  async function disablePush() {
    const key = browserDeviceKey(schoolSlug);
    const installationId = localStorage.getItem(key);
    if (!installationId) {
      setPushEnabled(false);
      return;
    }

    setPushBusy(true);
    try {
      const response = await fetch("/api/v1/web-push/devices", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolSlug, installationId }),
      });
      if (!response.ok) throw new Error("Unable to disable browser alerts.");
      localStorage.removeItem(key);
      setPushEnabled(false);
      toast.success("Browser notifications are disabled for this school.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to disable browser alerts.",
      );
    } finally {
      setPushBusy(false);
    }
  }

  return (
    <DropdownMenu onOpenChange={(open) => open && void loadFeed()}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={
            feed.unreadCount
              ? `Notifications, ${feed.unreadCount} unread`
              : "Notifications"
          }
          className="relative rounded-xl text-muted-foreground transition-all hover:bg-card hover:text-foreground hover:shadow-sm"
        >
          <Bell className="size-[18px]" />
          {feed.unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full border-2 border-background bg-primary px-1 text-[10px] font-bold leading-4 text-primary-foreground">
              {feed.unreadCount > 99 ? "99+" : feed.unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-[min(92vw,380px)] rounded-2xl p-2 shadow-xl"
      >
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          <span className="text-xs text-muted-foreground">
            {feed.unreadCount ? `${feed.unreadCount} unread` : "All caught up"}
          </span>
        </div>
        <DropdownMenuSeparator />
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading updates
          </div>
        ) : feed.items.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No notifications yet.
          </div>
        ) : (
          feed.items.slice(0, 5).map((item) => (
            <DropdownMenuItem
              key={item.id}
              className="cursor-pointer items-start gap-3 rounded-xl px-3 py-3"
              onSelect={() => void markRead(item)}
            >
              <span
                className={`mt-1.5 size-2 shrink-0 rounded-full ${
                  item.read ? "bg-muted-foreground/25" : "bg-primary"
                }`}
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold">
                    {item.title}
                  </span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {notificationDate(item.publishedAt)}
                  </span>
                </span>
                <span className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                  {item.body}
                </span>
              </span>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <div className="grid grid-cols-2 gap-1">
          <DropdownMenuItem
            className="cursor-pointer justify-center rounded-xl"
            onSelect={() => router.push(`/${schoolSlug}/notification-inbox`)}
          >
            <Check className="size-4" /> View all
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={pushBusy}
            className="cursor-pointer justify-center rounded-xl"
            onSelect={(event) => {
              event.preventDefault();
              void (pushEnabled ? disablePush() : enablePush());
            }}
          >
            {pushBusy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : pushEnabled ? (
              <BellOff className="size-4" />
            ) : (
              <Settings2 className="size-4" />
            )}
            {pushBusy
              ? pushStage || "Connecting"
              : pushEnabled
                ? "Disable alerts"
                : "Browser alerts"}
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
