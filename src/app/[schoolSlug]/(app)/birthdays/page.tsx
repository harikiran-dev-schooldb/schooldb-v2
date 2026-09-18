"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cake, CalendarDays, Gift, Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type BirthdayStudent={id:string;admissionNo:string;fullName:string|null;dob:string;imageUrl:string|null;whatsappOptIn:boolean;birthdayMonth:number;birthdayDay:number;nextBirthday:string;ageTurning:number;enrollments:Array<{class:{name:string};section:{name:string}}>}
type ResponseData={birthdays:BirthdayStudent[];next7:BirthdayStudent[];thisMonth:BirthdayStudent[];total:number};
const EMPTY:ResponseData={birthdays:[],next7:[],thisMonth:[],total:0};
function birthdayDate(s:BirthdayStudent){return new Intl.DateTimeFormat("en-IN",{day:"2-digit",month:"short"}).format(new Date(s.nextBirthday));}

function StudentCard({student,showDate=false}:{student:BirthdayStudent;showDate?:boolean}){
 const enrollment=student.enrollments[0];
 return <Link href={`students/${student.id}`}><Card className="h-full transition-all hover:-translate-y-0.5 hover:shadow-md"><CardContent className="flex items-center gap-4 p-5">
  {student.imageUrl?<img src={student.imageUrl} alt="" className="size-14 rounded-2xl object-cover"/>:<div className="flex size-14 items-center justify-center rounded-2xl bg-violet-100 text-xl font-bold text-violet-600">{student.fullName?.charAt(0)||"S"}</div>}
  <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate font-semibold">{student.fullName||"Unnamed Student"}</p>{showDate&&<Badge variant="outline">{birthdayDate(student)}</Badge>}</div>
  <p className="mt-1 text-xs text-muted-foreground">{student.admissionNo}{enrollment?` · ${enrollment.class.name} - ${enrollment.section.name}`:""} · Turns {student.ageTurning}</p>
  <div className="mt-2">{student.whatsappOptIn?<Badge variant="secondary"><MessageCircle className="mr-1 size-3"/>WhatsApp enabled</Badge>:<Badge variant="outline">WhatsApp not opted in</Badge>}</div></div><Cake className="size-5 text-violet-500"/>
 </CardContent></Card></Link>;
}

export default function BirthdaysPage(){
 const[data,setData]=useState<ResponseData>(EMPTY);const[loading,setLoading]=useState(true);
 useEffect(()=>{void(async()=>{try{const r=await fetch("/api/v1/birthdays",{cache:"no-store"});const j=await r.json();if(!r.ok||!j.success)throw new Error(j.message||"Failed to load birthdays.");setData(j.data);}catch(e){toast.error(e instanceof Error?e.message:"Failed to load birthdays.");}finally{setLoading(false);}})()},[]);
 return <div className="space-y-7 pb-10">
  <PageHeader title="Birthdays" description="Today's celebrations and upcoming student birthdays."/>
  <div className="grid gap-4 sm:grid-cols-3">
   <Card className="border-0 bg-gradient-to-br from-violet-50 to-white shadow-sm"><CardContent className="flex items-center gap-4 p-5"><div className="flex size-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-600"><Cake className="size-6"/></div><div><p className="text-xs font-medium text-slate-500">Today</p><p className="text-2xl font-bold">{loading?"—":data.birthdays.length}</p></div></CardContent></Card>
   <Card className="border-0 bg-gradient-to-br from-blue-50 to-white shadow-sm"><CardContent className="flex items-center gap-4 p-5"><div className="flex size-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600"><CalendarDays className="size-6"/></div><div><p className="text-xs font-medium text-slate-500">Next 7 Days</p><p className="text-2xl font-bold">{loading?"—":data.next7.length}</p></div></CardContent></Card>
   <Card className="border-0 bg-gradient-to-br from-amber-50 to-white shadow-sm"><CardContent className="flex items-center gap-4 p-5"><div className="flex size-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600"><Gift className="size-6"/></div><div><p className="text-xs font-medium text-slate-500">This Month</p><p className="text-2xl font-bold">{loading?"—":data.thisMonth.length}</p></div></CardContent></Card>
  </div>
  {loading?<div className="flex min-h-52 items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 size-4 animate-spin"/>Loading birthdays...</div>:<>
   <section><div className="mb-3"><h2 className="text-lg font-bold">Today's Birthdays</h2><p className="text-sm text-muted-foreground">Students celebrating today.</p></div>{data.birthdays.length?<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data.birthdays.map(s=><StudentCard key={s.id} student={s}/>)}</div>:<Card><CardContent className="flex min-h-36 flex-col items-center justify-center"><Gift className="size-8 text-violet-400"/><p className="mt-2 text-sm text-muted-foreground">No birthdays today.</p></CardContent></Card>}</section>
   <section><div className="mb-3"><h2 className="text-lg font-bold">Next 7 Days</h2><p className="text-sm text-muted-foreground">Upcoming birthdays after today.</p></div>{data.next7.length?<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data.next7.map(s=><StudentCard key={s.id} student={s} showDate/>)}</div>:<p className="text-sm text-muted-foreground">No birthdays in the next 7 days.</p>}</section>
   <section><div className="mb-3"><h2 className="text-lg font-bold">This Month</h2><p className="text-sm text-muted-foreground">All student birthdays in the current month.</p></div>{data.thisMonth.length?<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data.thisMonth.map(s=><StudentCard key={s.id} student={s} showDate/>)}</div>:<p className="text-sm text-muted-foreground">No birthdays this month.</p>}</section>
  </>}
 </div>;
}
