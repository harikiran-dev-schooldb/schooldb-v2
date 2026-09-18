"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Download, FileSpreadsheet, Loader2, UploadCloud, XCircle } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSchool } from "@/contexts/school-context";
import { postImportInBatches, type ImportProgress } from "@/lib/batched-import";

const HEADERS=["academicYear","admissionNo","houseCode"] as const;
type Header=(typeof HEADERS)[number];
type HouseRow=Record<Header,string>;
type RowError={row:number;message:string};
const MAX_ROWS=5000;
const BATCH_SIZE=250;
const TEMPLATE=[HEADERS.join(","),"2026-27,17492,BLUE","2026-27,17285,RED"].join("\n");

function parseCsvLine(line:string){const values:string[]=[];let current="";let quoted=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'){if(quoted&&line[i+1]==='"'){current+='"';i++;}else quoted=!quoted;}else if(c===","&&!quoted){values.push(current.trim());current="";}else current+=c;}values.push(current.trim());return values;}
function parseCsv(text:string){
 const lines=text.replace(/^\uFEFF/,"").split(/\r?\n/).filter(l=>l.trim());
 if(!lines.length)throw new Error("The file is empty.");
 const headers=parseCsvLine(lines[0]);if(headers.join("|")!==HEADERS.join("|"))throw new Error(`Invalid columns. Expected: ${HEADERS.join(", ")}`);
 const totalRows=lines.length-1;if(totalRows>MAX_ROWS)throw new Error(`Maximum ${MAX_ROWS.toLocaleString()} rows per file.`);
 const rows:HouseRow[]=[];const errors:RowError[]=[];
 lines.slice(1).forEach((line,index)=>{const values=parseCsvLine(line);const row=Object.fromEntries(HEADERS.map((h,i)=>[h,values[i]??""])) as HouseRow;const n=index+2;
  if(!row.academicYear)errors.push({row:n,message:"Academic year is required."});
  else if(!row.admissionNo)errors.push({row:n,message:"Admission number is required."});
  else if(!row.houseCode)errors.push({row:n,message:"House code is required."});
  else rows.push(row);
 });return{rows,errors,totalRows};
}
function downloadTemplate(){const url=URL.createObjectURL(new Blob([TEMPLATE+"\n"],{type:"text/csv;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download="student-house-allocation-template.csv";a.click();URL.revokeObjectURL(url);}

export default function BulkHouseAllocationsPage(){
 const{school}=useSchool();const inputRef=useRef<HTMLInputElement>(null);
 const[fileName,setFileName]=useState("");const[rows,setRows]=useState<HouseRow[]>([]);const[errors,setErrors]=useState<RowError[]>([]);const[totalRows,setTotalRows]=useState(0);const[fileError,setFileError]=useState<string|null>(null);const[importing,setImporting]=useState(false);const[progress,setProgress]=useState<ImportProgress|null>(null);const[result,setResult]=useState<{created:number;updated:number;total:number}|null>(null);
 const duplicates=useMemo(()=>{const seen=new Set<string>();let count=0;for(const row of rows){const key=`${row.academicYear.toLowerCase()}:${row.admissionNo.toLowerCase()}`;if(seen.has(key))count++;seen.add(key);}return count;},[rows]);
 async function handleFile(file:File){setFileName(file.name);setRows([]);setErrors([]);setTotalRows(0);setFileError(null);setResult(null);setProgress(null);if(!file.name.toLowerCase().endsWith(".csv"))return setFileError("Upload a CSV file using the SchoolDB house allocation template.");try{const p=parseCsv(await file.text());setRows(p.rows);setErrors(p.errors);setTotalRows(p.totalRows);}catch(e){setFileError(e instanceof Error?e.message:"Unable to read the file.");}}
 async function run(){if(!rows.length||errors.length||duplicates)return;setImporting(true);setFileError(null);setResult(null);try{const data=await postImportInBatches<HouseRow,{created:number;updated:number;total:number}>({endpoint:"/api/v1/houses/allocations/bulk",bodyKey:"rows",rows,batchSize:BATCH_SIZE,onProgress:setProgress,failureMessage:"Student house allocation import failed."});setResult(data);}catch(e){setFileError(e instanceof Error?e.message:"Student house allocation import failed.");}finally{setImporting(false);}}
 function reset(){setFileName("");setRows([]);setErrors([]);setTotalRows(0);setFileError(null);setResult(null);setProgress(null);if(inputRef.current)inputRef.current.value="";}
 return <div className="space-y-8 pb-12">
  <PageHeader eyebrow="Bulk Operations" title="Student House Allocation" description="Upload, validate and allocate students to houses by academic year." action={<Button variant="outline" onClick={downloadTemplate}><Download className="size-4"/>Download Template</Button>}/>
  <div className="flex items-center gap-2 text-xs text-muted-foreground"><Link href={`/${school.slug}/bulk-operations`} className="font-semibold text-primary hover:underline">Bulk Operations</Link><span>/</span><span>Student House Allocation</span></div>
  <Card className="premium-card overflow-hidden rounded-2xl border-0"><CardHeader className="border-b border-border/60 px-6 py-5"><div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><FileSpreadsheet className="size-5"/></div><div><CardTitle>House allocation import</CardTitle><p className="mt-1 text-xs text-muted-foreground">Columns: academicYear, admissionNo, houseCode. Existing allocations are updated. Maximum {MAX_ROWS.toLocaleString()} rows.</p></div></div></CardHeader>
  <CardContent className="space-y-6 p-6"><input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)void handleFile(f);}}/>
  {!fileName&&!fileError&&<button type="button" onClick={()=>inputRef.current?.click()} className="flex min-h-64 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/70 bg-muted/20 px-6 text-center transition-all hover:border-primary/40 hover:bg-primary/[0.03]"><div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><UploadCloud className="size-7"/></div><p className="mt-4 text-base font-bold">Upload house allocation CSV</p><p className="mt-1 text-sm text-muted-foreground">Validation happens before database changes. Use the SchoolDB template.</p></button>}
  {fileError&&<div className="flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-4"><XCircle className="mt-0.5 size-5 text-destructive"/><div className="flex-1"><p className="text-sm font-semibold">Import cannot continue</p><p className="mt-1 text-sm text-muted-foreground">{fileError}</p></div><Button size="sm" variant="outline" onClick={reset}>Reset</Button></div>}
  {fileName&&!fileError&&<><div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4"><div><p className="text-sm font-semibold">{fileName}</p><p className="mt-1 text-xs text-muted-foreground">{totalRows.toLocaleString()} rows · {rows.length.toLocaleString()} valid</p></div><div className="flex gap-2"><Badge variant={rows.length?"success":"destructive"}><CheckCircle2 className="size-3"/>{rows.length} valid</Badge>{duplicates>0&&<Badge variant="destructive">{duplicates} duplicates</Badge>}{errors.length>0&&<Badge variant="destructive">{errors.length} errors</Badge>}</div></div>
  {errors.length>0&&<div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4"><p className="text-sm font-semibold text-destructive">Fix these rows before importing</p><div className="mt-3 max-h-44 space-y-2 overflow-auto text-xs">{errors.slice(0,50).map(e=><p key={`${e.row}-${e.message}`}><b>Row {e.row}:</b> {e.message}</p>)}</div></div>}
  {rows.length>0&&<div className="overflow-hidden rounded-2xl border border-border/60"><div className="max-h-[460px] overflow-auto"><table className="w-full text-sm"><thead className="sticky top-0 bg-card"><tr><th className="px-4 py-3 text-left">#</th>{HEADERS.map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr></thead><tbody>{rows.slice(0,100).map((row,i)=><tr key={`${row.academicYear}-${row.admissionNo}-${i}`} className="border-t border-border/40"><td className="px-4 py-3 text-muted-foreground">{i+1}</td>{HEADERS.map(h=><td key={h} className="whitespace-nowrap px-4 py-3">{row[h]||"—"}</td>)}</tr>)}</tbody></table></div>{rows.length>100&&<p className="border-t px-4 py-3 text-xs text-muted-foreground">Showing first 100 rows. All {rows.length.toLocaleString()} valid rows will be imported.</p>}</div>}
  {importing&&progress&&<div className="space-y-2 rounded-2xl border border-primary/20 bg-primary/5 p-4"><div className="flex justify-between text-xs font-semibold"><span>Batch {Math.min(progress.completedBatches+1,progress.totalBatches)} of {progress.totalBatches}</span><span>{progress.completedRows} / {progress.totalRows} rows</span></div><div className="h-2 overflow-hidden rounded-full bg-primary/10"><div className="h-full rounded-full bg-primary" style={{width:`${(progress.completedRows/progress.totalRows)*100}%`}}/></div></div>}
  {result&&<div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4"><p className="text-sm font-bold">Import complete</p><p className="mt-1 text-xs text-muted-foreground">{result.created} allocated · {result.updated} updated · {result.total} processed</p></div>}
  <div className="flex justify-end gap-3"><Button variant="outline" onClick={reset} disabled={importing}>Start Over</Button><Button onClick={()=>void run()} disabled={importing||!!errors.length||duplicates>0||!rows.length}>{importing?<Loader2 className="size-4 animate-spin"/>:<UploadCloud className="size-4"/>}{importing?"Importing...":`Allocate / Update ${rows.length.toLocaleString()} Students`}</Button></div></>}
  </CardContent></Card></div>;
}
