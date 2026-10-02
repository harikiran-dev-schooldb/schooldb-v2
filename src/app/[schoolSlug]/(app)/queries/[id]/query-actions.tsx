"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type Status =
  | "OPEN"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "WAITING"
  | "RESOLVED"
  | "CLOSED"
  | "REOPENED";
type Result = { success: boolean; message: string };

const statuses: { value: Status; label: string }[] = [
  { value: "OPEN", label: "Open" },
  { value: "ASSIGNED", label: "Assigned" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "WAITING", label: "Waiting" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "CLOSED", label: "Closed" },
  { value: "REOPENED", label: "Reopened" },
];

export function QueryActions({
  ticketId,
  schoolSlug,
  status,
  isParentQuery = false,
}: {
  ticketId: string;
  schoolSlug: string;
  status: Status;
  isParentQuery?: boolean;
}) {
  const router = useRouter();
  const [reply, setReply] = useState("");
  const [visibility, setVisibility] = useState<"PARENT" | "INTERNAL">("INTERNAL");
  const [selectedStatus, setSelectedStatus] = useState(status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function request(path: string, body: object, method: "POST" | "PATCH") {
    const response = await fetch(path, {
      method,
      headers: {
        "Content-Type": "application/json",
        "x-school-slug": schoolSlug,
      },
      body: JSON.stringify(body),
    });
    const result: Result = await response.json();
    if (!response.ok || !result.success)
      throw new Error(result.message || "Could not save the change.");
    router.refresh();
  }

  async function updateStatus(value: Status) {
    setError("");
    setBusy(true);
    try {
      await request(
        `/api/v1/support/tickets/${ticketId}`,
        { status: value },
        "PATCH",
      );
      setSelectedStatus(value);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not update status.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function sendReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reply.trim()) return;
    setError("");
    setBusy(true);
    try {
      await request(
        `/api/v1/support/tickets/${ticketId}/messages`,
        {
          body: reply.trim(),
          isInternal: isParentQuery ? visibility === "INTERNAL" : false,
        },
        "POST",
      );
      setReply("");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not send reply.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <label
          htmlFor="queryStatus"
          className="block text-sm font-semibold text-slate-800"
        >
          Status
        </label>
        <select
          id="queryStatus"
          value={selectedStatus}
          disabled={busy}
          onChange={(event) => void updateStatus(event.target.value as Status)}
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-indigo-600 focus:outline-none"
        >
          {statuses.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      {status !== "CLOSED" ? (
        <form onSubmit={sendReply} className="space-y-3">
          <label
            htmlFor="queryReply"
            className="block text-sm font-semibold text-slate-800"
          >
            Reply
          </label>
          <textarea
            id="queryReply"
            value={reply}
            onChange={(event) => setReply(event.target.value)}
            maxLength={5000}
            rows={4}
            placeholder="Write a reply..."
            className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-indigo-600 focus:outline-none"
          />
          {isParentQuery && (
            <div>
              <label
                htmlFor="queryReplyVisibility"
                className="block text-sm font-semibold text-slate-800"
              >
                Message visibility
              </label>
              <select
                id="queryReplyVisibility"
                value={visibility}
                disabled={busy}
                onChange={(event) =>
                  setVisibility(event.target.value as "PARENT" | "INTERNAL")
                }
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-indigo-600 focus:outline-none"
              >
                <option value="PARENT">Show to parent</option>
                <option value="INTERNAL">Internal only — school staff</option>
              </select>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Parent-visible messages are sent through the parent support
                channel. Internal messages stay inside School Support.
              </p>
            </div>
          )}
          <button
            disabled={busy || !reply.trim()}
            className="w-full rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-800 disabled:opacity-50"
          >
            {busy
              ? "Sending…"
              : isParentQuery && visibility === "INTERNAL"
                ? "Save internal note"
                : isParentQuery
                  ? "Send to parent"
                  : "Send reply"}
          </button>
        </form>
      ) : (
        <p className="text-sm text-slate-500">
          Closed queries cannot receive replies.
        </p>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
