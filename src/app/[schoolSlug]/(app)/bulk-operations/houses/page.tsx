"use client";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

const TEMPLATE="name,code,color,description,displayOrder,active\nRed House,RED,#DC2626,Red house,1,TRUE\nBlue House,BLUE,#2563EB,Blue house,2,TRUE";

function parseCsv(text:string){
 const lines=text.trim().split(/\r?\n/).filter(Boolean); if(lines.length<2)return [];
 const headers=lines[0].split(",").map(v=>v.trim());
 return lines.slice(1).map(line=>{const values=line.split(",").map(v=>v.trim());return Object.fromEntries(headers.map((h,i)=>[h,values[i]??""]));});
}
export default function BulkHousesPage(){
 const [csv,setCsv]=useState(TEMPLATE);const [saving,setSaving]=useState(false);
 async function importRows(){const rows=parseCsv(csv);if(!rows.length)return toast.error("Add at least one house row.");setSaving(true);try{const res=await fetch("/api/v1/houses/bulk",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({rows})});const json=await res.json();if(!res.ok||!json.success)throw new Error(json.message||"Import failed.");toast.success(json.message);}catch(e){toast.error(e instanceof Error?e.message:"Import failed.");}finally{setSaving(false);}}
 return <div className="space-y-6 p-4 pb-12 sm:p-6"><PageHeader eyebrow="Bulk Operations" title="Student Houses" description="Create new houses or update existing houses by matching house name or code."/><Card><CardContent className="space-y-4 p-4 sm:p-6"><div><p className="font-semibold">CSV data</p><p className="text-sm text-muted-foreground">Columns: name, code, color, description, displayOrder, active. Existing name/code is updated; otherwise a new house is created.</p></div><Textarea className="min-h-72 font-mono text-xs" value={csv} onChange={e=>setCsv(e.target.value)}/><div className="flex justify-stretch sm:justify-end"><Button className="w-full sm:w-auto" onClick={importRows} disabled={saving}>{saving?"Importing...":"Create / Update Houses"}</Button></div></CardContent></Card></div>;
}
