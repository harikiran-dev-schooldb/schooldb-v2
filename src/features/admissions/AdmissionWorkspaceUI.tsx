"use client";
import { useState, type ReactNode } from "react";
import { ClipboardList, ChevronRight, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function AdmissionSelect({name,label,options,value,defaultValue,onChange,placeholder="Select an option",className}:{name?:string;label:string;options:{id:string;name:string}[];value?:string;defaultValue?:string;onChange?:(value:string)=>void;placeholder?:string;className?:string}) {
 const [local,setLocal]=useState(defaultValue??"");
 const current=value??local;
 return <><Select value={current||"__empty__"} onValueChange={next=>{const val=next==="__empty__"?"":next;setLocal(val);onChange?.(val);}}>
  <SelectTrigger aria-label={label} className={cn("h-11 w-full rounded-xl",className)}><SelectValue placeholder={placeholder}/></SelectTrigger>
  <SelectContent>{current&&!options.some(o=>o.id===current)&&<SelectItem value={current} disabled>Unavailable selection</SelectItem>}{!options.some(o=>o.id==="")&&<SelectItem value="__empty__" disabled>{placeholder}</SelectItem>}{options.map(o=><SelectItem key={o.id||"__empty__"} value={o.id||"__empty__"}>{o.name}</SelectItem>)}</SelectContent>
 </Select>{name&&<input type="hidden" name={name} value={current}/>}</>;
}

export function AdmissionPanel({title,description,icon:Icon=ClipboardList,children,action}:{title:string;description?:string;icon?:LucideIcon;children:ReactNode;action?:ReactNode}) {
 return <section className="premium-card min-w-0 overflow-hidden rounded-3xl">
  <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-muted/20 px-4 py-4 sm:px-6">
   <div className="flex min-w-0 items-center gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="size-5"/></div><div className="min-w-0"><h2 className="font-bold tracking-tight">{title}</h2>{description&&<p className="mt-0.5 text-xs leading-5 text-muted-foreground">{description}</p>}</div></div>{action}
  </header><div className="min-w-0 space-y-4 p-4 sm:p-6">{children}</div>
 </section>;
}

export function AdmissionDetails({title,description,children,label="View details"}:{title:string;description:string;children:ReactNode;label?:string}) {
 return <Dialog><DialogTrigger asChild><Button variant="outline" size="sm" className="rounded-xl">{label}<ChevronRight className="size-4"/></Button></DialogTrigger><DialogContent className="max-h-[90dvh] max-w-3xl gap-0 overflow-y-auto rounded-3xl border-border/70 bg-card p-0"><DialogHeader className="border-b border-border/60 bg-muted/30 px-5 py-5 sm:px-8"><p className="section-label">Admissions</p><DialogTitle className="text-xl">{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader><div className="space-y-4 p-4 sm:p-6">{children}</div></DialogContent></Dialog>;
}
