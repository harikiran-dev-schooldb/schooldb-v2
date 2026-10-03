"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import {
  BellRing,
  BarChart3,
  CheckCircle2,
  Cloud,
  Database,
  Fingerprint,
  HardDrive,
  RefreshCw,
  Share2,
  Send,
  Smartphone,
  Wifi,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  browserPushState,
  enableBrowserPush,
  isStandalonePwa,
  type BrowserPushState,
} from "@/lib/browser-push";
import {
  deletePwaSnapshot,
  flushPwaActions,
  listPwaActions,
  readPwaSnapshot,
  savePwaSnapshot,
  type PwaOfflineSnapshot,
} from "@/lib/pwa-storage";
import {
  defaultNotificationPreferences,
  type NotificationPreferenceValues,
} from "@/features/notifications/preferences";

const preferenceLabels: Array<[keyof NotificationPreferenceValues, string, string]> = [
  ["announcements", "Announcements", "General school news and circulars"],
  ["homework", "Homework", "Assignments and due-date updates"],
  ["attendance", "Attendance", "Present, absent, and attendance corrections"],
  ["fees", "Fees and payments", "Dues, receipts, and payment updates"],
  ["exams", "Exams and results", "Exam schedules, marks, and report updates"],
  ["leaveUpdates", "Leave decisions", "Approval or rejection of leave requests"],
  ["urgent", "Urgent alerts", "Time-sensitive school safety and priority notices"],
];

type PushReport = {
  id: string;
  kind: string;
  title: string;
  audienceUsers: number;
  eligibleDevices: number;
  noDeviceUsers: number;
  accepted: number;
  failed: number;
  invalidDevices: number;
  status: string;
  createdAt: string;
};

export function PwaControlCenter({
  schoolSlug,
  canViewDeliveryReports,
}: {
  schoolSlug: string;
  canViewDeliveryReports: boolean;
}) {
  const { userId } = useAuth();
  const { user } = useUser();
  const ownerKey = useMemo(() => userId ? `${userId}:${schoolSlug}` : null, [schoolSlug, userId]);
  const [pushState, setPushState] = useState<BrowserPushState>("unsupported");
  const [preferences, setPreferences] = useState(defaultNotificationPreferences);
  const [snapshot, setSnapshot] = useState<PwaOfflineSnapshot | null>(null);
  const [pendingActions, setPendingActions] = useState(0);
  const [storage, setStorage] = useState<{ usage: number; quota: number } | null>(null);
  const [serviceWorker, setServiceWorker] = useState("Checking");
  const [installed, setInstalled] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [reports, setReports] = useState<PushReport[]>([]);
  const [busy, setBusy] = useState(false);

  const loadLocalStatus = useCallback(async () => {
    setPushState(browserPushState(schoolSlug));
    setInstalled(isStandalonePwa());
    const registration = "serviceWorker" in navigator
      ? await navigator.serviceWorker.getRegistration("/")
      : null;
    setServiceWorker(registration?.active ? "Active" : registration ? "Installing" : "Not registered");
    if (navigator.storage?.estimate) {
      const estimate = await navigator.storage.estimate();
      setStorage({ usage: estimate.usage ?? 0, quota: estimate.quota ?? 0 });
    }
    if (ownerKey) {
      const [cached, actions] = await Promise.all([
        readPwaSnapshot(ownerKey),
        listPwaActions(ownerKey),
      ]);
      setSnapshot(cached);
      setPendingActions(actions.length);
    }
  }, [ownerKey, schoolSlug]);

  const loadDeliveryReports = useCallback(async () => {
    if (!canViewDeliveryReports) return;
    const response = await fetch(`/api/v1/pwa/push-reports?schoolSlug=${encodeURIComponent(schoolSlug)}`, {
      cache: "no-store",
    });
    const result = await response.json();
    if (response.ok && result.success) setReports(result.data);
  }, [canViewDeliveryReports, schoolSlug]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadLocalStatus(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadLocalStatus]);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/v1/notification-preferences?schoolSlug=${encodeURIComponent(schoolSlug)}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((result) => {
        if (!cancelled && result.success) setPreferences(result.data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [schoolSlug]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadDeliveryReports().catch(() => undefined), 0);
    return () => window.clearTimeout(timeout);
  }, [loadDeliveryReports]);

  async function enableNotifications() {
    setBusy(true);
    try {
      const enabled = await enableBrowserPush(schoolSlug);
      setPushState(browserPushState(schoolSlug));
      if (enabled) toast.success("Notifications enabled on this device.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to enable notifications.");
    } finally {
      setBusy(false);
    }
  }

  async function changePreference(field: keyof NotificationPreferenceValues, checked: boolean) {
    const previous = preferences;
    const next = { ...preferences, [field]: checked };
    setPreferences(next);
    try {
      const response = await fetch("/api/v1/notification-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolSlug, ...next }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Unable to save preferences.");
      setPreferences(result.data);
    } catch (error) {
      setPreferences(previous);
      toast.error(error instanceof Error ? error.message : "Unable to save preferences.");
    }
  }

  async function sendTestNotification() {
    setBusy(true);
    setTestResult(null);
    try {
      const response = await fetch("/api/v1/pwa/test-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolSlug }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Test notification failed.");
      setTestResult(result.message);
      toast.success("Test sent. Check the iPhone Lock Screen or Notification Centre.");
      await loadDeliveryReports();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Test notification failed.";
      setTestResult(message);
      toast.error(message);
      await loadDeliveryReports();
    } finally {
      setBusy(false);
    }
  }

  async function syncOfflineData() {
    if (!ownerKey) return;
    if (!navigator.onLine) {
      toast.error("Reconnect to refresh saved information.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`/api/v1/pwa/snapshot?schoolSlug=${encodeURIComponent(schoolSlug)}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Sync failed.");
      await savePwaSnapshot(ownerKey, result.data);
      const flushed = await flushPwaActions(ownerKey);
      toast.success(flushed.completed ? "Saved data refreshed and pending requests submitted." : "Offline data refreshed.");
      await loadLocalStatus();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to sync offline data.");
    } finally {
      setBusy(false);
    }
  }

  async function clearOfflineData() {
    if (!ownerKey) return;
    await deletePwaSnapshot(ownerKey);
    setSnapshot(null);
    toast.success("Saved offline school information removed from this device.");
  }

  async function createPasskey() {
    if (!user) return;
    setBusy(true);
    try {
      await user.createPasskey();
      toast.success("Passkey added. You can use your device lock or biometrics to sign in.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Passkeys are not enabled for this sign-in account.");
    } finally {
      setBusy(false);
    }
  }

  async function shareApp() {
    const data = { title: "SchoolDB", text: "Open the SchoolDB school app", url: window.location.origin };
    try {
      if (navigator.share) await navigator.share(data);
      else {
        await navigator.clipboard.writeText(data.url);
        toast.success("SchoolDB link copied.");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error("Unable to share SchoolDB.");
    }
  }

  const storageLabel = storage
    ? `${(storage.usage / 1024 / 1024).toFixed(1)} MB used of ${(storage.quota / 1024 / 1024).toFixed(0)} MB`
    : "Storage estimate unavailable";

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BellRing className="size-5 text-primary" /> Notifications</CardTitle>
          <CardDescription>Permission is requested here and in the post-login popup, never from the bell menu.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <StatusRow icon={Smartphone} label="This device" value={pushStateLabel(pushState)} good={pushState === "enabled"} />
          {pushState !== "enabled" && (
            <Button type="button" disabled={busy || pushState === "denied" || pushState === "unsupported" || pushState === "requires-install"} onClick={() => void enableNotifications()}>
              <BellRing className="size-4" /> Enable notifications
            </Button>
          )}
          <Button type="button" variant="outline" disabled={busy || pushState !== "enabled"} onClick={() => void sendTestNotification()}>
            <Send className="size-4" /> Send test notification
          </Button>
          {testResult && <p role="status" className="rounded-xl border border-border/70 bg-muted/35 px-3 py-2 text-sm text-muted-foreground">{testResult}</p>}
          {pushState === "requires-install" && <p className="text-sm text-muted-foreground">On iPhone, first add SchoolDB to the Home Screen, open the installed app, then return here.</p>}
          {pushState === "denied" && <p className="text-sm text-muted-foreground">Notifications are blocked in device settings. Allow SchoolDB there, then reopen the app.</p>}
          <div className="divide-y rounded-2xl border border-border/70">
            {preferenceLabels.map(([field, label, detail]) => (
              <label key={field} className="flex items-center gap-4 p-4">
                <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{label}</span><span className="block text-xs leading-5 text-muted-foreground">{detail}</span></span>
                <Switch checked={preferences[field]} onCheckedChange={(checked) => void changePreference(field, checked)} aria-label={label} />
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Cloud className="size-5 text-primary" /> App and offline status</CardTitle>
            <CardDescription>Check install, connectivity, updates, cached information, and pending work.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <StatusRow icon={Smartphone} label="Installed app" value={installed ? "Installed" : "Browser tab"} good={installed} />
            <StatusRow icon={Wifi} label="Connection" value={typeof navigator !== "undefined" && navigator.onLine ? "Online" : "Offline"} good={typeof navigator !== "undefined" && navigator.onLine} />
            <StatusRow icon={CheckCircle2} label="Service worker" value={serviceWorker} good={serviceWorker === "Active"} />
            <StatusRow icon={Database} label="Offline snapshot" value={snapshot ? new Date(snapshot.generatedAt).toLocaleString("en-IN") : "Not saved yet"} good={Boolean(snapshot)} />
            <StatusRow icon={RefreshCw} label="Pending requests" value={String(pendingActions)} good={pendingActions === 0} />
            <StatusRow icon={HardDrive} label="Browser storage" value={storageLabel} good={Boolean(storage)} />
            <div className="flex flex-wrap gap-2 pt-2">
              <Button type="button" disabled={busy} onClick={() => void syncOfflineData()}><RefreshCw className="size-4" /> Sync now</Button>
              {snapshot && <Button type="button" variant="outline" onClick={() => void clearOfflineData()}>Clear saved data</Button>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Fingerprint className="size-5 text-primary" /> Passkeys and sharing</CardTitle>
            <CardDescription>Use this device&apos;s screen lock, fingerprint, or Face ID for a faster sign-in.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Passkeys on your account: <strong className="text-foreground">{user?.passkeys.length ?? 0}</strong></p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" disabled={busy || !user} onClick={() => void createPasskey()}><Fingerprint className="size-4" /> Add passkey</Button>
              <Button type="button" variant="outline" onClick={() => void shareApp()}><Share2 className="size-4" /> Share SchoolDB</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {canViewDeliveryReports && (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BarChart3 className="size-5 text-primary" /> Notification delivery reports</CardTitle>
            <CardDescription>“Accepted” means Apple, Firebase, or the push provider accepted the message. Web Push does not provide a read receipt.</CardDescription>
          </CardHeader>
          <CardContent>
            {reports.length === 0 ? (
              <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">No delivery reports yet. New announcements and test notifications will appear here.</p>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-border/70">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="bg-muted/45 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr><th className="px-4 py-3">Notification</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Audience</th><th className="px-3 py-3">Devices</th><th className="px-3 py-3">Accepted</th><th className="px-3 py-3">Failed</th><th className="px-3 py-3">No device</th><th className="px-4 py-3">Time</th></tr>
                  </thead>
                  <tbody className="divide-y divide-border/70">
                    {reports.map((report) => (
                      <tr key={report.id}>
                        <td className="px-4 py-3"><p className="max-w-xs truncate font-semibold">{report.title}</p><p className="mt-1 text-xs text-muted-foreground">{report.kind === "TEST" ? "Test" : "Announcement"}{report.invalidDevices ? ` · ${report.invalidDevices} expired` : ""}</p></td>
                        <td className="px-3 py-3"><Badge variant={reportVariant(report.status)}>{reportStatusLabel(report.status)}</Badge></td>
                        <td className="px-3 py-3">{report.audienceUsers}</td>
                        <td className="px-3 py-3">{report.eligibleDevices}</td>
                        <td className="px-3 py-3 font-semibold text-emerald-700">{report.accepted}</td>
                        <td className="px-3 py-3 font-semibold text-destructive">{report.failed}</td>
                        <td className="px-3 py-3">{report.noDeviceUsers}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{new Date(report.createdAt).toLocaleString("en-IN")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatusRow({ icon: Icon, label, value, good }: { icon: typeof Wifi; label: string; value: string; good: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border/70 p-3">
      <Icon className="size-4 text-muted-foreground" />
      <span className="flex-1 text-sm font-medium">{label}</span>
      <Badge variant={good ? "success" : "secondary"}>{value}</Badge>
    </div>
  );
}

function pushStateLabel(state: BrowserPushState) {
  if (state === "enabled") return "Enabled";
  if (state === "denied") return "Blocked";
  if (state === "requires-install") return "Install required";
  if (state === "unsupported") return "Unavailable";
  return "Ready to enable";
}

function reportStatusLabel(status: string) {
  if (status === "ACCEPTED") return "Accepted";
  if (status === "PARTIAL") return "Partial";
  if (status === "FAILED") return "Failed";
  if (status === "NO_DEVICE") return "No device";
  if (status === "NO_AUDIENCE") return "No audience";
  if (status === "PREFERENCES_DISABLED") return "Preferences off";
  return "Error";
}

function reportVariant(status: string): "success" | "warning" | "destructive" | "secondary" {
  if (status === "ACCEPTED") return "success";
  if (status === "PARTIAL") return "warning";
  if (status === "FAILED" || status === "ERROR") return "destructive";
  return "secondary";
}
