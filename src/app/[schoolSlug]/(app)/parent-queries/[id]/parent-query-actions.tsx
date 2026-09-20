"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type Status = "OPEN" | "ASSIGNED" | "IN_PROGRESS" | "WAITING" | "RESOLVED" | "CLOSED" | "REOPENED";
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

export function ParentQueryActions({ ticketId, schoolSlug, status, showNotes = false }: {
  ticketId: string; schoolSlug: string; status: Status; showNotes?: boolean;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [selectedStatus, setSelectedStatus] = useState(status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function request(path: string, body: object, method: "POST" | "PATCH") {
    const response = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json", "x-school-slug": schoolSlug },
      body: JSON.stringify(body),
    });
    const result: Result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.message || "Could not save the change.");
    router.refresh();
  }

  async function updateStatus(value: Status) {
    setError(""); setBusy(true);
    try {
      await request(`/api/v1/support/tickets/${ticketId}`, { status: value }, "PATCH");
      setSelectedStatus(value);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update status.");
    } finally { setBusy(false); }
  }

  async function addNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!note.trim()) return;
    setError(""); setBusy(true);
    try {
      await request(`/api/v1/support/tickets/${ticketId}/messages`, { body: note.trim() }, "POST");
      setNote("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not add the note.");
    } finally { setBusy(false); }
  }

  if (showNotes && status === "CLOSED") return <p className="mt-5 text-sm text-slate-500">Closed queries cannot receive new notes.</p>;

  return showNotes ? (
    <form onSubmit={addNote} className="mt-5 space-y-3">
      <label htmlFor="parentQueryNote" className="block text-sm font-semibold">Add an internal note</label>
      <textarea id="parentQueryNote" value={note} onChange={(event) => setNote(event.target.value)}
        maxLength={5000} rows={3} className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-indigo-600 focus:outline-none" />
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <button disabled={busy || !note.trim()} className="rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
        {busy ? "Saving…" : "Add note"}
      </button>
    </form>
  ) : (
    <div className="mt-4">
      <label htmlFor="parentQueryStatus" className="block text-sm text-slate-600">Update query status</label>
      <select id="parentQueryStatus" value={selectedStatus} disabled={busy} onChange={(event) => void updateStatus(event.target.value as Status)}
        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-indigo-600 focus:outline-none">
        {statuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
      </select>
      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
