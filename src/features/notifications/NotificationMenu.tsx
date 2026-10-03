"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { SCHOOL_TIME_ZONE } from "@/lib/date-time";
import { isApplePlatform } from "@/lib/browser-push";
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

async function updateAppBadge(count: number) {
  if (!("setAppBadge" in navigator)) return;
  try {
    if (count > 0) await navigator.setAppBadge(count);
    else if ("clearAppBadge" in navigator) await navigator.clearAppBadge();
  } catch {
    // Badging is optional and can be unavailable despite feature detection.
  }
}

function notificationDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: SCHOOL_TIME_ZONE,
  }).format(new Date(value));
}

export function NotificationMenu({
  schoolSlug,
  notificationsHref = `/${schoolSlug}/notification-inbox`,
  initialUnreadCount = 0,
}: {
  schoolSlug: string;
  notificationsHref?: string;
  initialUnreadCount?: number;
}) {
  const router = useRouter();
  const [feed, setFeed] = useState<Feed>(() => ({
    unreadCount: initialUnreadCount,
    items: [],
  }));
  const [loading, setLoading] = useState(true);

  const loadFeed = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/v1/notifications?schoolSlug=${encodeURIComponent(schoolSlug)}`,
        { cache: "no-store" },
      );
      const result = await response.json();
      if (response.ok && result.success) {
        setFeed(result.data);
        void updateAppBadge(result.data.unreadCount);
      }
    } finally {
      setLoading(false);
    }
  }, [schoolSlug]);

  useEffect(() => {
    void loadFeed();
    const refresh = () => {
      if (document.visibilityState === "visible") void loadFeed();
    };
    document.addEventListener("visibilitychange", refresh);
    const pushMessage = (event: MessageEvent) => {
      if (event.data?.type === "SCHOOLDB_PUSH_RECEIVED") void loadFeed();
    };
    navigator.serviceWorker?.addEventListener("message", pushMessage);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      navigator.serviceWorker?.removeEventListener("message", pushMessage);
    };
  }, [loadFeed]);

  useEffect(() => {
    if (
      isApplePlatform()
      || !("Notification" in window)
      || Notification.permission !== "granted"
    ) {
      return;
    }

    let unsubscribe: (() => void) | undefined;
    void Promise.all([
      import("firebase/messaging"),
      import("@/lib/firebase-client"),
    ]).then(async ([firebaseMessaging, firebaseClient]) => {
      const messaging = await firebaseClient.webMessaging();
      if (!messaging) return;
      unsubscribe = firebaseMessaging.onMessage(messaging, (payload) => {
        void loadFeed();
        const title = payload.notification?.title || payload.data?.title;
        const body = payload.notification?.body || payload.data?.body;
        if (title) toast.info(title, { description: body });
      });
    }).catch(() => {
      // Foreground refresh is an enhancement; background delivery remains active.
    });

    return () => unsubscribe?.();
  }, [loadFeed]);

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
      void updateAppBadge(Math.max(0, feed.unreadCount - 1));
    }
    router.push(notificationsHref);
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
        <div>
          <DropdownMenuItem
            className="cursor-pointer justify-center rounded-xl"
            onSelect={() => router.push(notificationsHref)}
          >
            <Check className="size-4" /> View all
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
