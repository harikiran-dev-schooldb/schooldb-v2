"use client";
import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

const TEMPLATE="academicYear,admissionNo,houseCode,houseName\n2026-27,17492,BLUE,\n2026-27,17285,RED,";
function parseCsv(text:string){const lines=text.trim().split(/\r?\n/).filter(Boolean);if(lines.length<2)return[];const headers=lines[0].split(",").map(v=>v.trim());return lines.slice(1).map(line=>{const values=line.split(",").map(v=>v.trim());return Object.fromEntries(headers.map((h,i)=>[h,values[i]??""]));});}

export default function BulkHouseAllocationsPage(){
 const [csv,setCsv]=useState(TEMPLATE);const[saving,setSaving]=useState(false);
 function downloadTemplate(){const blob=new Blob([TEMPLATE+"\n"],{type:"text/csv;charset=utf-8"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="student-house-allocation-template.csv";document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);}
 async function run(){const rows=parseCsv(csv);if(!rows.length)return toast.error("Add at least one student allocation.");setSaving(true);try{const res=await fetch("/api/v1/houses/allocations/bulk",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({rows})});const json=await res.json();if(!res.ok||!json.success)throw new Error(json.message||"Import failed.");toast.success(json.message);}catch(e){toast.error(e instanceof Error?e.message:"Import failed.");}finally{setSaving(false);}}
 return <div className="space-y-6"><PageHeader eyebrow="Bulk Operations" title="Student House Allocation" description="Assign or move students to houses in bulk by academic year and admission number."/><Card><CardContent className="space-y-4 p-6"><div><p className="font-semibold">CSV data</p><p className="text-sm text-muted-foreground">Columns: academicYear, admissionNo, houseCode, houseName. Use houseCode when available. Existing allocation for the same student and academic year will be updated.</p></div><Textarea className="min-h-80 font-mono text-xs" value={csv} onChange={e=>setCsv(e.target.value)}/><div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" onClick={downloadTemplate}><Download className="mr-2 size-4"/>Download CSV Template</Button><Button disabled={saving} onClick={run}>{saving?"Allocating...":"Allocate / Update Students"}</Button></div></CardContent></Card></div>;
}
