"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ImageIcon, Loader2, Pencil, Plus, Search, Shield, Users } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type House = { id:string; name:string; code:string|null; color:string|null; description:string|null; iconUrl:string|null; displayOrder:number; active:boolean; _count:{students:number} };
type Year = { id:string; name:string; active:boolean };
type SchoolClass = { id:string; name:string; sections:{id:string;name:string}[] };
type Enrollment = { id:string; rollNo:number|null; student:{id:string;admissionNo:string;fullName:string|null;gender:string}; class:{id:string;name:string}; section:{id:string;name:string}; houseAssignment:{houseId:string;house:{id:string;name:string;code:string|null;color:string|null}}|null };
type Data = { houses:House[]; academicYears:Year[]; classes:SchoolClass[]; enrollments:Enrollment[] };

export default function StudentHousesPage() {
  const searchParams = useSearchParams();
  const initialHouseId = searchParams.get("houseId") || "ALL";
  const [data,setData]=useState<Data>({houses:[],academicYears:[],classes:[],enrollments:[]});
  const [yearId,setYearId]=useState(""); const [houseId,setHouseId]=useState(""); const [houseFilter,setHouseFilter]=useState(initialHouseId); const [classId,setClassId]=useState("ALL"); const [sectionId,setSectionId]=useState("ALL");
  const [selected,setSelected]=useState<string[]>([]); const [search,setSearch]=useState(""); const [loading,setLoading]=useState(true); const [saving,setSaving]=useState(false);
  const [name,setName]=useState(""); const [code,setCode]=useState(""); const [color,setColor]=useState("#4f46e5");
  const [editing,setEditing]=useState<House|null>(null); const [editName,setEditName]=useState(""); const [editCode,setEditCode]=useState(""); const [editColor,setEditColor]=useState("#4f46e5"); const [editDescription,setEditDescription]=useState(""); const [editIconUrl,setEditIconUrl]=useState(""); const [editOrder,setEditOrder]=useState(0); const [editActive,setEditActive]=useState(true);

  const load=useCallback(async (targetYear=yearId)=>{
    setLoading(true);
    try {
      const q=new URLSearchParams();
      if(targetYear) q.set("academicYearId",targetYear);
      if(classId!=="ALL") q.set("classId",classId);
      if(sectionId!=="ALL") q.set("sectionId",sectionId);
      if(houseFilter!=="ALL" && houseFilter!=="UNALLOCATED") q.set("houseId",houseFilter);
      const res=await fetch(`/api/v1/houses?${q}`,{cache:"no-store"}); const json=await res.json();
      if(!res.ok||!json.success) throw new Error(json.message||"Failed to load houses.");
      setData(json.data);
      if(!targetYear){const active=json.data.academicYears.find((y:Year)=>y.active)?.id||json.data.academicYears[0]?.id||""; if(active) setYearId(active);}
    } catch(e){toast.error(e instanceof Error?e.message:"Failed to load houses.");} finally{setLoading(false);}
  },[yearId,classId,sectionId,houseFilter]);

  useEffect(()=>{
    // Filter changes intentionally trigger a fresh server load.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  },[load]);

  const sections=data.classes.find(c=>c.id===classId)?.sections??[];
  const visible=useMemo(()=>{const q=search.trim().toLowerCase();return data.enrollments.filter(e=>(houseFilter!=="UNALLOCATED"||!e.houseAssignment)&&(!q||e.student.fullName?.toLowerCase().includes(q)||e.student.admissionNo.toLowerCase().includes(q)));},[data.enrollments,search,houseFilter]);
  const allChecked=visible.length>0&&visible.every(e=>selected.includes(e.id));

  async function createHouse(){
    if(!name.trim()) return toast.error("Enter house name.");
    setSaving(true); try{const res=await fetch("/api/v1/houses",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,code,color})});const json=await res.json();if(!res.ok||!json.success)throw new Error(json.message||"Failed to create house.");toast.success("House created.");setName("");setCode("");await load();}catch(e){toast.error(e instanceof Error?e.message:"Failed to create house.");}finally{setSaving(false);}
  }
  function openEdit(h:House){setEditing(h);setEditName(h.name);setEditCode(h.code||"");setEditColor(h.color||"#4f46e5");setEditDescription(h.description||"");setEditIconUrl(h.iconUrl||"");setEditOrder(h.displayOrder);setEditActive(h.active);}
  async function updateHouse(){if(!editing||!editName.trim())return toast.error("Enter house name.");setSaving(true);try{const res=await fetch("/api/v1/houses",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:editing.id,name:editName,code:editCode,color:editColor,description:editDescription,iconUrl:editIconUrl,displayOrder:editOrder,active:editActive})});const json=await res.json();if(!res.ok||!json.success)throw new Error(json.message||"Failed to update house.");toast.success("House updated.");setEditing(null);await load();}catch(e){toast.error(e instanceof Error?e.message:"Failed to update house.");}finally{setSaving(false);}}
  async function allocate(){
    if(!yearId||!houseId||selected.length===0)return toast.error("Select academic year, house and students.");
    setSaving(true);try{const res=await fetch("/api/v1/houses",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({academicYearId:yearId,houseId,enrollmentIds:selected})});const json=await res.json();if(!res.ok||!json.success)throw new Error(json.message||"Allocation failed.");toast.success(json.message||"Students allocated.");setSelected([]);await load();}catch(e){toast.error(e instanceof Error?e.message:"Allocation failed.");}finally{setSaving(false);}
  }

  return <div className="space-y-6">
    <PageHeader title="Student Houses" description="Create school houses and allocate students house-wise for each academic year." />
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {data.houses.map(h=><Card key={h.id} className={`cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md ${houseFilter===h.id?"ring-2 ring-primary/40":""}`} onClick={()=>setHouseFilter(h.id)}><CardContent className="flex items-center gap-4 p-5"><div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-background">{h.iconUrl?<img src={h.iconUrl} alt={`${h.name} emblem`} className="size-full object-contain"/>:<Shield className="size-7" style={{color:h.color||"#4f46e5"}}/>}</div><div className="min-w-0 flex-1"><p className="font-semibold">{h.name}</p><p className="text-xs text-muted-foreground">{h.code||"No code"} · {h._count.students} allocations</p></div><Button size="icon" variant="ghost" onClick={e=>{e.stopPropagation();openEdit(h)}} aria-label={`Edit ${h.name}`}><Pencil className="size-4"/></Button></CardContent></Card>)}
    </div>
    <Card><CardContent className="p-5"><div className="mb-4 flex items-center gap-2 font-semibold"><Plus className="size-4"/>Create House</div><div className="grid gap-3 md:grid-cols-[1fr_160px_100px_auto]"><Input placeholder="House name" value={name} onChange={e=>setName(e.target.value)}/><Input placeholder="Code" value={code} onChange={e=>setCode(e.target.value)}/><Input type="color" value={color} onChange={e=>setColor(e.target.value)}/><Button onClick={createHouse} disabled={saving}>Add House</Button></div></CardContent></Card>
    <Card><CardContent className="p-5">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="min-w-48"><p className="mb-1 text-xs text-muted-foreground">Academic Year</p><Select value={yearId} onValueChange={value=>{setYearId(value);setSelected([]);}}><SelectTrigger><SelectValue placeholder="Academic year"/></SelectTrigger><SelectContent>{data.academicYears.map(y=><SelectItem key={y.id} value={y.id}>{y.name}{y.active?" · Active":""}</SelectItem>)}</SelectContent></Select></div>
        <div className="min-w-44"><p className="mb-1 text-xs text-muted-foreground">Class</p><Select value={classId} onValueChange={value=>{setClassId(value);setSectionId("ALL");setSelected([]);}}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="ALL">All Classes</SelectItem>{data.classes.map(c=><SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
        <div className="min-w-44"><p className="mb-1 text-xs text-muted-foreground">Section</p><Select value={sectionId} onValueChange={value=>{setSectionId(value);setSelected([]);}} disabled={classId==="ALL"}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="ALL">All Sections</SelectItem>{sections.map(s=><SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
        <div className="min-w-48"><p className="mb-1 text-xs text-muted-foreground">House Filter</p><Select value={houseFilter} onValueChange={setHouseFilter}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="ALL">All Houses</SelectItem><SelectItem value="UNALLOCATED">Not Allocated</SelectItem>{data.houses.map(h=><SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}</SelectContent></Select></div>
        <div className="min-w-48"><p className="mb-1 text-xs text-muted-foreground">Allocate to House</p><Select value={houseId} onValueChange={setHouseId}><SelectTrigger><SelectValue placeholder="Select house"/></SelectTrigger><SelectContent>{data.houses.filter(h=>h.active).map(h=><SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}</SelectContent></Select></div>
        <Button onClick={allocate} disabled={saving||selected.length===0}>{saving?<Loader2 className="mr-2 size-4 animate-spin"/>:<Users className="mr-2 size-4"/>}Allocate {selected.length||""}</Button>
      </div>
      <div className="mb-4 relative max-w-md"><Search className="absolute left-3 top-3 size-4 text-muted-foreground"/><Input className="pl-9" placeholder="Search student or admission no." value={search} onChange={e=>setSearch(e.target.value)}/></div>
      {loading?<div className="flex h-40 items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 size-4 animate-spin"/>Loading students...</div>:<div className="overflow-x-auto rounded-xl border"><table className="w-full text-sm"><thead className="bg-muted/50"><tr><th className="w-12 p-3"><Checkbox checked={allChecked} onCheckedChange={()=>setSelected(allChecked?selected.filter(id=>!visible.some(e=>e.id===id)):[...new Set([...selected,...visible.map(e=>e.id)])])}/></th><th className="p-3 text-left">Roll No</th><th className="p-3 text-left">Admission No</th><th className="p-3 text-left">Student</th><th className="p-3 text-left">Class</th><th className="p-3 text-left">Section</th><th className="p-3 text-left">Current House</th></tr></thead><tbody className="divide-y">{visible.map(e=><tr key={e.id}><td className="p-3"><Checkbox checked={selected.includes(e.id)} onCheckedChange={()=>setSelected(v=>v.includes(e.id)?v.filter(id=>id!==e.id):[...v,e.id])}/></td><td className="p-3">{e.rollNo??"—"}</td><td className="p-3">{e.student.admissionNo}</td><td className="p-3 font-medium">{e.student.fullName||"Unnamed Student"}</td><td className="p-3">{e.class.name}</td><td className="p-3">{e.section.name}</td><td className="p-3">{e.houseAssignment?<span className="inline-flex items-center gap-2"><span className="size-2.5 rounded-full" style={{backgroundColor:e.houseAssignment.house.color||"#64748b"}}/>{e.houseAssignment.house.name}</span>:<span className="text-muted-foreground">Not allocated</span>}</td></tr>)}</tbody></table>{visible.length===0&&<div className="p-8 text-center text-sm text-muted-foreground">No students found for the selected filters.</div>}</div>}
    </CardContent></Card>
    <Dialog open={!!editing} onOpenChange={open=>{if(!open)setEditing(null)}}>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit House</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2"><Label>House Name</Label><Input value={editName} onChange={e=>setEditName(e.target.value)}/></div>
          <div className="grid gap-2"><Label>House Code</Label><Input value={editCode} onChange={e=>setEditCode(e.target.value)}/></div>
          <div className="grid gap-2"><Label>House Color</Label><div className="flex items-center gap-3"><Input className="w-20" type="color" value={editColor} onChange={e=>setEditColor(e.target.value)}/><Input value={editColor} onChange={e=>setEditColor(e.target.value)}/></div></div>
          <div className="grid gap-2"><Label>Description</Label><Textarea value={editDescription} onChange={e=>setEditDescription(e.target.value)}/></div>\n          <div className="grid gap-2"><Label>House Icon URL</Label><div className="flex gap-3"><div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted/30">{editIconUrl?<img src={editIconUrl} alt="House icon preview" className="size-full object-contain"/>:<Shield className="size-7" style={{color:editColor}}/>}</div><div className="flex-1 space-y-2"><Input placeholder="https://.../house-icon.png" value={editIconUrl} onChange={e=>setEditIconUrl(e.target.value)}/><p className="text-xs text-muted-foreground"><ImageIcon className="mr-1 inline size-3"/>Paste the uploaded PNG/WebP URL. Leave blank to use the colored shield fallback.</p>{editIconUrl&&<Button type="button" size="sm" variant="outline" onClick={()=>setEditIconUrl("")}>Remove Icon</Button>}</div></div></div>
          <div className="grid gap-2"><Label>Display Order</Label><Input type="number" value={editOrder} onChange={e=>setEditOrder(Number(e.target.value))}/></div>
          <div className="flex items-center justify-between rounded-lg border p-3"><div><Label>Active</Label><p className="text-xs text-muted-foreground">Inactive houses cannot receive new allocations.</p></div><Switch checked={editActive} onCheckedChange={setEditActive}/></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={()=>setEditing(null)}>Cancel</Button><Button onClick={updateHouse} disabled={saving}>{saving&&<Loader2 className="mr-2 size-4 animate-spin"/>}Save Changes</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}
