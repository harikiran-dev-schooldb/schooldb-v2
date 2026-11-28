"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Message = { id: string; author: string; body: string; timestamp: string; mine: boolean; isInternal: boolean };

export function QueryConversation({ messages, isParentQuery }: { messages: Message[]; isParentQuery: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  useEffect(() => {
    if (!autoRefresh) return;
    const refresh = () => { if (document.visibilityState === "visible") router.refresh(); };
    const timer = window.setInterval(refresh, 15000);
    document.addEventListener("visibilitychange", refresh);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", refresh); };
  }, [autoRefresh, router]);
  const term = query.trim().toLowerCase();
  const filtered = messages.filter(message => !term || (message.author + " " + message.body).toLowerCase().includes(term));
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="space-y-3 border-b p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><h2 className="font-bold text-slate-950">Conversation</h2><p className="text-xs text-slate-500">{messages.length} messages · staff workspace</p></div>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600"><input type="checkbox" checked={autoRefresh} onChange={event => setAutoRefresh(event.target.checked)} /> Auto-refresh (15s)</label>
        </div>
        <div className="flex gap-2">
          <input aria-label="Search conversation" placeholder="Search messages or sender" maxLength={100} value={query} onChange={event => setQuery(event.target.value)} className="min-w-0 flex-1 rounded-xl border px-3 py-2 text-sm" />
          <button type="button" onClick={() => router.refresh()} className="rounded-xl border px-3 text-xs font-semibold">Refresh</button>
        </div>
      </div>
      <div className="space-y-3 bg-slate-50/80 p-4 sm:p-5">
        {!filtered.length && <p className="py-6 text-center text-sm text-slate-500">{messages.length ? "No matching messages." : "No replies yet."}</p>}
        {filtered.map(message => (
          <div key={message.id} className={`flex ${message.mine ? "justify-end" : "justify-start"}`}>
            <article className={`max-w-[92%] rounded-2xl border p-3 shadow-sm sm:max-w-[82%] ${message.isInternal ? "border-amber-200 bg-amber-50" : message.mine ? "rounded-tr-sm border-emerald-100 bg-emerald-50" : "rounded-tl-sm border-slate-200 bg-white"}`}>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-bold text-slate-800">{message.mine ? "You" : message.author}</span>
                {message.isInternal ? <span className="font-semibold text-amber-800">Internal note</span> : isParentQuery ? <span className="text-emerald-700">Parent-visible</span> : null}
              </div>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{message.body}</p>
              <p className="mt-1 text-right text-[11px] text-slate-500">{message.timestamp}</p>
            </article>
          </div>
        ))}
      </div>
    </section>
  );
}
