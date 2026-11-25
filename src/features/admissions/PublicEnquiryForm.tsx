"use client";
import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
type Choice={id:string;name:string};
export function PublicEnquiryForm({slug,years,classes}:{slug:string;years:Choice[];classes:Choice[]}){
 const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");const [done,setDone]=useState(false);
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setMessage("");const f=new FormData(e.currentTarget);try{const r=await fetch("/api/v1/public/admissions/"+slug+"/enquire",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...Object.fromEntries(f),consent:f.get("consent")==="on"})});const b=await r.json();if(!r.ok||!b.success)throw Error(b.message||"Unable to submit.");setDone(true);setMessage(b.message||"Enquiry received.");}catch(e){setMessage(e instanceof Error?e.message:"Unable to submit.");}finally{setBusy(false);}}
 if(done)return <p role="status" className="rounded-xl border p-4">{message}</p>;
 return <form onSubmit={submit} className="grid gap-4 rounded-2xl border bg-white p-5 text-slate-900 sm:grid-cols-2">
 <label>Academic year<select name="yearId" required className="block w-full rounded-md border p-2">{years.map(y=><option key={y.id} value={y.id}>{y.name}</option>)}</select></label>
 <label>Class<select name="classId" required className="block w-full rounded-md border p-2">{classes.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
 <label>Student name<Input required name="studentName" minLength={2} maxLength={255}/></label><label>Parent / guardian name<Input required name="parentName" minLength={2} maxLength={255}/></label>
 <label>Date of birth<Input required type="date" name="dob"/></label><label>Mobile<Input required name="mobile" pattern="[0-9]{10}" inputMode="tel"/></label>
 <div hidden aria-hidden="true"><input name="website" tabIndex={-1} autoComplete="off"/></div>
 <label className="flex gap-2 text-sm sm:col-span-2"><input type="checkbox" required name="consent"/>I consent to the school storing these details to review and contact me about admission. This is an enquiry, not an application or admission confirmation.</label>
 <Button disabled={busy||!years.length||!classes.length} type="submit">{busy?"Submitting…":"Submit enquiry"}</Button>{message&&<p role="alert" className="text-sm text-rose-700">{message}</p>}</form>;
}
