"use client";

import { useState, type FormEvent } from "react";

type SchoolClass = { id: string; name: string; sections: { id: string; name: string }[] };
type StudentOption = { id: string; name: string; admissionHint: string };
type ApiResult<T> = { success: boolean; message: string; data?: T };

const categories = [
  { value: "STUDENT", label: "Student concern" },
  { value: "ACADEMIC", label: "Academics" },
  { value: "FEES", label: "Fees" },
  { value: "TRANSPORT", label: "Transport" },
  { value: "GENERAL", label: "General" },
];

const fieldClass = "mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-base outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100";
const labelClass = "block text-sm font-semibold text-slate-800";

export function ParentQueryForm({ schoolSlug, classes }: { schoolSlug: string; classes: SchoolClass[] }) {
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [studentQuery, setStudentQuery] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [verificationToken, setVerificationToken] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [student, setStudent] = useState<StudentOption | null>(null);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [ticketNo, setTicketNo] = useState("");
  const sections = classes.find((item) => item.id === classId)?.sections ?? [];

  async function sendOtp() {
    setError("");
    if (!/^[6-9]\d{9}$/.test(parentPhone)) {
      setError("Enter the 10-digit mobile number registered with the school.");
      return;
    }
    setSendingOtp(true);
    try {
      const response = await fetch("/api/v1/public/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: parentPhone, schoolSlug }),
      });
      const result: { success?: boolean; message?: string; error?: string } = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Could not send the code.");
      setOtpSent(true);
      setOtp("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not send the code. Try again.");
    } finally {
      setSendingOtp(false);
    }
  }

  async function verifyOtp() {
    setError("");
    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the 6-digit code sent on WhatsApp.");
      return;
    }
    setVerifyingOtp(true);
    try {
      const response = await fetch(`/api/v1/public/support/${schoolSlug}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: parentPhone, otp }),
      });
      const result: { success?: boolean; token?: string; error?: string } = await response.json();
      if (!response.ok || !result.success || !result.token) {
        throw new Error(result.error || "Could not verify the code.");
      }
      setVerificationToken(result.token);
      setOtp("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not verify the code. Try again.");
    } finally {
      setVerifyingOtp(false);
    }
  }

  async function searchStudent() {
    setError("");
    setStudents([]);
    if (!classId || !sectionId || !studentQuery.trim() || parentPhone.length !== 10) {
      setError("Select class and section, then enter the full admission number and registered 10-digit mobile number.");
      return;
    }
    setSearching(true);
    try {
      const query = new URLSearchParams({
        classId,
        sectionId,
        admissionNo: studentQuery.trim(),
        mobile: parentPhone,
      });
      const response = await fetch(`/api/v1/public/support/${schoolSlug}/students?${query}`, {
        headers: { Authorization: `Bearer ${verificationToken}` },
      });
      const result: ApiResult<StudentOption[]> = await response.json();
      if (response.status === 401) {
        setVerificationToken("");
        setOtpSent(false);
        throw new Error("Your verification expired. Request a new WhatsApp code.");
      }
      if (!response.ok || !result.success) throw new Error(result.message || "Student search failed.");
      setStudents(result.data ?? []);
      if (!result.data?.length) setError("No matching student was found in this class and section.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Student search failed. Try again.");
    } finally {
      setSearching(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!student) {
      setError("Choose the student before submitting.");
      return;
    }
    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    try {
      const response = await fetch(`/api/v1/public/support/${schoolSlug}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${verificationToken}`,
        },
        body: JSON.stringify({
          classId,
          sectionId,
          studentId: student.id,
          category: form.get("category"),
          subject: form.get("subject"),
          description: form.get("description"),
          parentName: form.get("parentName"),
          parentPhone: form.get("parentPhone"),
          website: form.get("website"),
        }),
      });
      const result: ApiResult<{ ticketNo: string }> = await response.json();
      if (response.status === 401) {
        setVerificationToken("");
        setOtpSent(false);
        throw new Error("Your verification expired. Request a new WhatsApp code.");
      }
      if (!response.ok || !result.success || !result.data) throw new Error(result.message || "Could not submit the query.");
      setTicketNo(result.data.ticketNo);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not submit the query. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (ticketNo) return (
    <div className="py-9 text-center" role="status">
      <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700">✓</div>
      <h2 className="mt-5 text-2xl font-bold">Your query was sent</h2>
      <p className="mt-3 text-slate-600">The principal and school administration have received it.</p>
      <p className="mt-5 rounded-xl bg-slate-100 px-4 py-3 font-semibold">Reference: {ticketNo}</p>
      <p className="mt-3 text-sm text-slate-500">Keep this number if you need to follow up with the school.</p>
    </div>
  );

  if (!verificationToken) return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold">Verify your registered number</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Only registered parents can raise a ticket. We’ll send a 6-digit verification code on WhatsApp.
        </p>
      </div>
      <label className={labelClass}>Registered mobile number
        <input
          required
          value={parentPhone}
          onChange={(event) => {
            setParentPhone(event.target.value.replace(/\D/g, "").slice(-10));
            setOtpSent(false);
            setOtp("");
            setError("");
          }}
          maxLength={10}
          inputMode="numeric"
          className={fieldClass}
          autoComplete="tel"
          placeholder="10-digit number registered with the school"
        />
      </label>
      {otpSent && <label className={labelClass}>WhatsApp verification code
        <input
          value={otp}
          onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
          maxLength={6}
          inputMode="numeric"
          autoComplete="one-time-code"
          className={fieldClass}
          placeholder="6-digit code"
        />
      </label>}
      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {otpSent ? (
        <div className="space-y-3">
          <button type="button" onClick={verifyOtp} disabled={verifyingOtp || otp.length !== 6} className="w-full rounded-xl bg-indigo-700 px-5 py-3.5 font-bold text-white hover:bg-indigo-800 disabled:opacity-50">
            {verifyingOtp ? "Verifying…" : "Verify and continue"}
          </button>
          <button type="button" onClick={sendOtp} disabled={sendingOtp} className="w-full text-sm font-semibold text-indigo-700 disabled:opacity-50">
            {sendingOtp ? "Sending…" : "Send a new code"}
          </button>
        </div>
      ) : (
        <button type="button" onClick={sendOtp} disabled={sendingOtp || parentPhone.length !== 10} className="w-full rounded-xl bg-indigo-700 px-5 py-3.5 font-bold text-white hover:bg-indigo-800 disabled:opacity-50">
          {sendingOtp ? "Sending…" : "Send WhatsApp code"}
        </button>
      )}
      <p className="text-center text-xs text-slate-500">For privacy, we do not reveal whether an unverified number is registered.</p>
    </div>
  );

  return (
    <form onSubmit={submit} className="space-y-6">
      <div>
        <h2 className="text-lg font-bold">Choose your child</h2>
        <p className="mt-1 text-sm text-slate-600">Verify the student using the admission number and a registered family mobile number.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>Class
          <select required className={fieldClass} value={classId} onChange={(event) => {
            setClassId(event.target.value); setSectionId(""); setStudent(null); setStudents([]);
          }}>
            <option value="">Select class</option>
            {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label className={labelClass}>Section
          <select required className={fieldClass} value={sectionId} disabled={!classId} onChange={(event) => {
            setSectionId(event.target.value); setStudent(null); setStudents([]);
          }}>
            <option value="">Select section</option>
            {sections.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
      </div>
      <div>
        <label htmlFor="studentSearch" className={labelClass}>Full admission number</label>
        <div className="mt-2 flex gap-2">
          <input id="studentSearch" value={studentQuery} onChange={(event) => {
            setStudentQuery(event.target.value); setStudent(null); setStudents([]);
          }} className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-3 text-base outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100" placeholder="Enter the complete admission number" maxLength={80} />
          <button type="button" onClick={searchStudent} disabled={searching || !sectionId} className="rounded-xl bg-indigo-600 px-4 font-semibold text-white disabled:opacity-50">
            {searching ? "Finding…" : "Find"}
          </button>
        </div>
        {student && <p className="mt-3 rounded-xl bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-900">Selected: {student.name} · Admission ending {student.admissionHint}</p>}
        {students.length > 0 && <div className="mt-2 divide-y rounded-xl border border-slate-200" role="listbox" aria-label="Matching students">
          {students.map((item) => <button key={item.id} type="button" role="option" aria-selected={student?.id === item.id} onClick={() => {
            setStudent(item); setStudents([]); setError("");
          }} className="block w-full px-4 py-3 text-left text-sm hover:bg-indigo-50">
            <span className="font-semibold">{item.name}</span> <span className="text-slate-500">· Admission ending {item.admissionHint}</span>
          </button>)}
        </div>}
      </div>
      <label className={labelClass}>Verified mobile number
        <input
          name="parentPhone"
          required
          value={parentPhone}
          readOnly
          maxLength={10}
          inputMode="numeric"
          className={fieldClass}
          autoComplete="tel"
          placeholder="10-digit number registered with the school"
        />
      </label>
      <button type="button" onClick={() => {
        setVerificationToken(""); setOtpSent(false); setStudent(null); setStudents([]); setError("");
      }} className="-mt-3 text-sm font-semibold text-indigo-700">Use a different number</button>
      <div className="border-t border-slate-200 pt-6">
        <h2 className="text-lg font-bold">Your query</h2>
      </div>
      <label className={labelClass}>Category
        <select name="category" required className={fieldClass} defaultValue="">
          <option value="" disabled>Select category</option>
          {categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </label>
      <label className={labelClass}>Subject
        <input name="subject" required minLength={3} maxLength={160} className={fieldClass} placeholder="What is your query about?" />
      </label>
      <label className={labelClass}>Description
        <textarea name="description" required minLength={10} maxLength={5000} rows={5} className={fieldClass} placeholder="Tell the school what happened and what help you need." />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>Your name <span className="font-normal text-slate-500">(optional)</span>
          <input name="parentName" maxLength={100} className={fieldClass} autoComplete="name" />
        </label>
      </div>
      <div className="hidden" aria-hidden="true"><label>Website <input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <button type="submit" disabled={submitting || !student} className="w-full rounded-xl bg-indigo-700 px-5 py-3.5 font-bold text-white hover:bg-indigo-800 disabled:opacity-50">
        {submitting ? "Submitting…" : "Send query to school"}
      </button>
      <p className="text-center text-xs text-slate-500">Your verified number receives WhatsApp updates as the query moves through resolution.</p>
    </form>
  );
}
