"use client";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
export function AppointmentWhatsappDraft({phone,consent,schoolName,applicationNo,entranceAt,interviewAt}:{phone:string|null;consent:boolean;schoolName:string;applicationNo:string;entranceAt:string|null;interviewAt:string|null}){
 const mobile=phone?.replace(/\D/g,"")??"";
 if(!consent||!/^\d{10}$/.test(mobile))return <p className="text-xs text-muted-foreground">Parent WhatsApp reminder unavailable: verified messaging consent and a valid mobile are required.</p>;
 const slots=[{label:"Entrance examination",at:entranceAt},{label:"Interview",at:interviewAt}].filter(x=>x.at);
 if(!slots.length)return null;
 return <div className="flex flex-wrap gap-2">{slots.map(s=>{const date=new Intl.DateTimeFormat("en-IN",{timeZone:"Asia/Kolkata",dateStyle:"medium",timeStyle:"short"}).format(new Date(s.at!));const message=`Dear parent, a reminder from ${schoolName}: ${s.label} for application ${applicationNo} is scheduled for ${date} IST. Please contact the school if you need to reschedule.`;return <Button asChild variant="outline" size="sm" key={s.label}><a href={"https://wa.me/91"+mobile+"?text="+encodeURIComponent(message)} target="_blank" rel="noreferrer"><MessageCircle className="size-4"/>{s.label} WhatsApp draft</a></Button>})}</div>;
}
