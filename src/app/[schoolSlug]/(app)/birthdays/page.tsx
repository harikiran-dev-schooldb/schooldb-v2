"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cake, Gift, Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type BirthdayStudent={id:string;admissionNo:string;fullName:string|null;dob:string;imageUrl:string|null;whatsappOptIn:boolean;enrollments:Array<{class:{name:string};section:{name:string}}>}
type ResponseData={birthdays:BirthdayStudent[];total:number};

export default function BirthdaysPage(){
 const[data,setData]=useState<ResponseData>({birthdays:[],total:0});const[loading,setLoading]=useState(true);
 useEffect(()=>{void(async()=>{try{const r=await fetch("/api/v1/birthdays",{cache:"no-store"});const j=await r.json();if(!r.ok||!j.success)throw new Error(j.message||"Failed to load birthdays.");setData(j.data);}catch(e){toast.error(e instanceof Error?e.message:"Failed to load birthdays.");}finally{setLoading(false);}})()},[]);
 return <div className="space-y-6">
  <PageHeader title="Birthdays" description="Students celebrating their birthday today and WhatsApp wish eligibility."/>
  <Card className="overflow-hidden border-0 bg-gradient-to-r from-violet-50 via-white to-amber-50 shadow-sm"><CardContent className="flex items-center gap-4 p-6"><div className="flex size-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-600"><Cake className="size-7"/></div><div><p className="text-sm font-medium text-slate-500">Today's birthdays</p><p className="text-3xl font-bold text-slate-950">{loading?"—":data.total}</p></div></CardContent></Card>
  {loading?<div className="flex min-h-52 items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 size-4 animate-spin"/>Loading birthdays...</div>:data.birthdays.length===0?<Card><CardContent className="flex min-h-52 flex-col items-center justify-center text-center"><Gift className="size-10 text-violet-400"/><p className="mt-3 font-semibold">No birthdays today</p><p className="mt-1 text-sm text-muted-foreground">There are no active students celebrating a birthday today.</p></CardContent></Card>:<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data.birthdays.map(s=>{const enrollment=s.enrollments[0];return <Link key={s.id} href={`students/${s.id}`}><Card className="h-full transition-all hover:-translate-y-0.5 hover:shadow-md"><CardContent className="flex items-center gap-4 p-5">{s.imageUrl?<img src={s.imageUrl} alt="" className="size-14 rounded-2xl object-cover"/>:<div className="flex size-14 items-center justify-center rounded-2xl bg-violet-100 text-xl font-bold text-violet-600">{s.fullName?.charAt(0)||"S"}</div>}<div className="min-w-0 flex-1"><p className="truncate font-semibold">{s.fullName||"Unnamed Student"}</p><p className="text-xs text-muted-foreground">{s.admissionNo}{enrollment?` · ${enrollment.class.name} - ${enrollment.section.name}`:""}</p><div className="mt-2">{s.whatsappOptIn?<Badge variant="secondary"><MessageCircle className="mr-1 size-3"/>WhatsApp wish enabled</Badge>:<Badge variant="outline">WhatsApp not opted in</Badge>}</div></div><Cake className="size-5 text-violet-500"/></CardContent></Card></Link>})}</div>}
 </div>;
}
