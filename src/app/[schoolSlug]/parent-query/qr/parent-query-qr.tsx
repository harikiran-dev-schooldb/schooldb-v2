"use client";

import QRCode from "react-qr-code";

export function ParentQueryQr({ schoolName, schoolSlug }: { schoolName: string; schoolSlug: string }) {
  const url = `https://www.schooldb.co.in/${encodeURIComponent(schoolSlug)}/parent-query`;
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 print:bg-white">
      <div className="mx-auto max-w-xl rounded-3xl bg-white p-8 text-center shadow-xl print:shadow-none sm:p-12">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-700">{schoolName}</p>
        <h1 className="mt-5 text-3xl font-extrabold">Parents, have a query?</h1>
        <p className="mt-3 text-slate-600">Scan this QR code with your phone camera to reach the principal and school administration.</p>
        <div className="mx-auto mt-8 w-fit rounded-3xl border-4 border-indigo-100 bg-white p-5">
          <QRCode value={url} size={240} level="M" aria-label="QR code for parent query form" />
        </div>
        <p className="mt-7 text-lg font-semibold">Scan · Choose your child · Send your query</p>
        <p className="mt-2 text-sm text-slate-500">No login required</p>
        <p className="mt-7 break-all text-sm text-indigo-700">{url}</p>
        <button type="button" onClick={() => window.print()} className="mt-8 rounded-xl bg-indigo-700 px-6 py-3 font-semibold text-white print:hidden">Print this QR</button>
      </div>
    </main>
  );
}
