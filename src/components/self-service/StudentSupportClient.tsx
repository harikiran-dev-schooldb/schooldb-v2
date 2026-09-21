"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  LifeBuoy,
  Loader2,
  MessageSquareText,
  Plus,
  RefreshCw,
  Send,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type TicketStatus = "OPEN" | "ASSIGNED" | "IN_PROGRESS" | "WAITING" | "RESOLVED" | "CLOSED" | "REOPENED";
type TicketType = "STUDENT" | "STAFF" | "ACADEMIC" | "MAINTENANCE" | "IT" | "ADMINISTRATION" | "FEES" | "TRANSPORT" | "GENERAL";

type Ticket = {
  id: string;
  ticketNo: string;
  subject: string;
  description: string;
  type: TicketType;
  priority: string;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
  assignedTo?: { id: string; firstName?: string | null; lastName?: string | null } | null;
};

type TicketDetail = Ticket & {
  messages: Array<{
    id: string;
    authorId: string;
    body: string;
    createdAt: string;
    author: { id: string; firstName?: string | null; lastName?: string | null };
  }>;
};

const TYPES: Array<{ value: TicketType; label: string }> = [
  { value: "STUDENT", label: "Student" },
  { value: "ACADEMIC", label: "Academic" },
  { value: "FEES", label: "Fees" },
  { value: "TRANSPORT", label: "Transport" },
  { value: "GENERAL", label: "General" },
];

function statusLabel(status: TicketStatus) {
  return status.replaceAll("_", " ");
}

function statusClass(status: TicketStatus) {
  if (status === "RESOLVED" || status === "CLOSED") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "WAITING") return "bg-amber-50 text-amber-700 border-amber-200";
  if (status === "REOPENED") return "bg-rose-50 text-rose-700 border-rose-200";
  return "bg-indigo-50 text-indigo-700 border-indigo-200";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const payload = await response.json();
  if (!response.ok || !payload.success) throw new Error(payload.message || "Request failed");
  return payload.data as T;
}

export function StudentSupportClient({
  schoolSlug,
  studentId,
  studentName,
}: {
  schoolSlug: string;
  studentId: string;
  studentName: string;
}) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selected, setSelected] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reply, setReply] = useState("");
  const [form, setForm] = useState({ type: "GENERAL" as TicketType, subject: "", description: "" });

  const endpoint = "/api/v1/self-service/support/tickets";

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ tickets: Ticket[] }>(`${endpoint}?studentId=${encodeURIComponent(studentId)}`);
      setTickets(data.tickets);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load support tickets");
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => { void loadTickets(); }, [loadTickets]);

  async function openTicket(id: string) {
    setDetailLoading(true);
    try {
      setSelected(await api<TicketDetail>(`${endpoint}/${id}`));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open ticket");
    } finally {
      setDetailLoading(false);
    }
  }

  async function createTicket(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const ticket = await api<Ticket>(endpoint, {
        method: "POST",
        body: JSON.stringify({ studentId, ...form }),
      });
      toast.success(`${ticket.ticketNo} created`);
      setShowCreate(false);
      setForm({ type: "GENERAL", subject: "", description: "" });
      await loadTickets();
      await openTicket(ticket.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create ticket");
    } finally {
      setSaving(false);
    }
  }

  async function sendReply(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || !reply.trim()) return;
    setSaving(true);
    try {
      await api(`${endpoint}/${selected.id}/messages`, {
        method: "POST",
        body: JSON.stringify({ body: reply }),
      });
      setReply("");
      await openTicket(selected.id);
      await loadTickets();
      toast.success("Reply sent");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send reply");
    } finally {
      setSaving(false);
    }
  }

  async function resolutionAction(action: "CONFIRM_RESOLVED" | "REOPEN") {
    if (!selected) return;
    setSaving(true);
    try {
      await api(`${endpoint}/${selected.id}`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      await openTicket(selected.id);
      await loadTickets();
      toast.success(action === "REOPEN" ? "Ticket reopened" : "Resolution confirmed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update ticket");
    } finally {
      setSaving(false);
    }
  }

  const activeCount = useMemo(
    () => tickets.filter((ticket) => !["RESOLVED", "CLOSED"].includes(ticket.status)).length,
    [tickets],
  );

  if (selected) {
    const canReply = !["RESOLVED", "CLOSED"].includes(selected.status);
    return (
      <div className="space-y-5">
        <Button variant="ghost" onClick={() => setSelected(null)} className="-ml-2">
          <ArrowLeft className="size-4" /> Back to tickets
        </Button>

        <Card className="overflow-hidden border-white/80 bg-white/90 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
          <CardHeader className="border-b bg-gradient-to-r from-indigo-50/80 via-white to-violet-50/70">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">{selected.ticketNo} · {selected.type}</p>
                <CardTitle className="mt-2 text-xl">{selected.subject}</CardTitle>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{selected.description}</p>
              </div>
              <Badge variant="outline" className={statusClass(selected.status)}>{statusLabel(selected.status)}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 p-5 sm:p-6">
            <div className="rounded-2xl border bg-slate-50/70 p-4 text-sm">
              <p className="font-semibold text-slate-800">Conversation</p>
              <p className="mt-1 text-xs text-muted-foreground">Messages between your family and the school. Staff-only notes are never shown here.</p>
            </div>

            <div className="space-y-3">
              {selected.messages.length === 0 ? (
                <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                  No replies yet. The school will respond here.
                </div>
              ) : selected.messages.map((message) => (
                <div key={message.id} className="rounded-2xl border bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">
                      {[message.author.firstName, message.author.lastName].filter(Boolean).join(" ") || "SchoolDB user"}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDate(message.createdAt)}</p>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{message.body}</p>
                </div>
              ))}
            </div>

            {selected.status === "RESOLVED" && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 size-5 text-emerald-600" />
                  <div className="flex-1">
                    <p className="font-semibold text-emerald-900">Has this issue been resolved?</p>
                    <p className="mt-1 text-sm text-emerald-800/80">Confirm to close the ticket, or reopen it if you still need help.</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button disabled={saving} onClick={() => void resolutionAction("CONFIRM_RESOLVED")}>
                        <CheckCircle2 className="size-4" /> Confirm resolved
                      </Button>
                      <Button disabled={saving} variant="outline" onClick={() => void resolutionAction("REOPEN")}>
                        <RefreshCw className="size-4" /> Reopen
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {canReply && (
              <form onSubmit={sendReply} className="space-y-3 rounded-2xl border bg-slate-50/60 p-4">
                <label className="text-sm font-semibold" htmlFor="support-reply">Reply</label>
                <textarea
                  id="support-reply"
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  maxLength={5000}
                  rows={4}
                  placeholder="Add more information for the school..."
                  className="w-full resize-y rounded-xl border border-input bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                />
                <div className="flex justify-end">
                  <Button type="submit" disabled={saving || !reply.trim()}>
                    {saving ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Send reply
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] bg-gradient-to-r from-indigo-600 via-violet-600 to-blue-600 p-6 text-white shadow-[0_24px_60px_rgba(79,70,229,0.2)] sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-100">School support</p>
            <h2 className="mt-3 text-2xl font-bold tracking-[-0.03em] sm:text-3xl">How can we help {studentName}?</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-100">Send a query or concern to the school and keep the full conversation in one place.</p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="bg-white text-indigo-700 hover:bg-indigo-50">
            <Plus className="size-4" /> New ticket
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="flex items-center gap-3 p-5"><LifeBuoy className="size-5 text-indigo-600" /><div><p className="text-2xl font-bold">{tickets.length}</p><p className="text-xs text-muted-foreground">Total tickets</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-5"><Clock3 className="size-5 text-amber-600" /><div><p className="text-2xl font-bold">{activeCount}</p><p className="text-xs text-muted-foreground">Active</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-5"><CheckCircle2 className="size-5 text-emerald-600" /><div><p className="text-2xl font-bold">{tickets.length - activeCount}</p><p className="text-xs text-muted-foreground">Resolved / closed</p></div></CardContent></Card>
      </div>

      <Card className="border-white/80 bg-white/90 shadow-[0_14px_38px_rgba(15,23,42,0.05)]">
        <CardHeader><CardTitle>My tickets</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground"><Loader2 className="mr-2 size-5 animate-spin" /> Loading tickets...</div>
          ) : tickets.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-10 text-center">
              <MessageSquareText className="mx-auto size-8 text-indigo-400" />
              <p className="mt-3 font-semibold">No support tickets yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Create a ticket whenever you need help from the school.</p>
            </div>
          ) : tickets.map((ticket) => (
            <button
              type="button"
              key={ticket.id}
              onClick={() => void openTicket(ticket.id)}
              disabled={detailLoading}
              className="flex w-full items-center gap-4 rounded-2xl border bg-white p-4 text-left transition hover:border-indigo-200 hover:bg-indigo-50/30"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><MessageSquareText className="size-4" /></div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-semibold text-slate-900">{ticket.subject}</p>
                  <Badge variant="outline" className={statusClass(ticket.status)}>{statusLabel(ticket.status)}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{ticket.ticketNo} · {ticket.type} · Updated {formatDate(ticket.updatedAt)}</p>
              </div>
              <ChevronRight className="size-5 shrink-0 text-slate-300" />
            </button>
          ))}
        </CardContent>
      </Card>

      {showCreate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-xl shadow-2xl">
            <CardHeader className="flex-row items-start justify-between gap-4">
              <div><CardTitle>Create support ticket</CardTitle><p className="mt-1 text-sm text-muted-foreground">Tell the school what you need help with.</p></div>
              <Button variant="ghost" size="icon-sm" onClick={() => setShowCreate(false)}><X className="size-4" /></Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={createTicket} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Category</label>
                  <select
                    value={form.type}
                    onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as TicketType }))}
                    className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm"
                  >
                    {TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium" htmlFor="support-subject">Subject</label>
                  <Input id="support-subject" value={form.subject} maxLength={160} onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))} placeholder="Briefly describe your concern" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium" htmlFor="support-description">Details</label>
                  <textarea
                    id="support-description"
                    value={form.description}
                    maxLength={5000}
                    rows={6}
                    onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                    placeholder="Give the school enough information to understand and resolve the issue..."
                    className="w-full resize-y rounded-xl border border-input bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
                {(form.subject.trim().length > 0 && form.subject.trim().length < 3) || (form.description.trim().length > 0 && form.description.trim().length < 10) ? (
                  <p className="flex items-center gap-2 text-xs text-amber-700"><CircleAlert className="size-3.5" /> Subject needs 3 characters and details need at least 10.</p>
                ) : null}
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                  <Button type="submit" disabled={saving || form.subject.trim().length < 3 || form.description.trim().length < 10}>
                    {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Create ticket
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
