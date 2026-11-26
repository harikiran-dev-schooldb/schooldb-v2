import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PrintDocumentButton } from "@/features/students/components/profile/PrintDocumentButton";
import { requireRole } from "@/lib/auth";
import { hasModuleAccess } from "@/lib/staff-permissions";
import { prisma } from "@/lib/prisma";
import { calculateExactAge,eligibleClassIds,assessAge,validCalendarDate } from "@/features/admissions/age-policy";
import { readAdmissionAgePolicy } from "@/features/admissions/age-policy.schema";
export default async function Page({params}:{params:Promise<{schoolSlug:string;id:string}>}){
 const {schoolSlug,id}=await params;
 const actor=await requireRole(["SUPER_ADMIN","SCHOOL_ADMIN","RECEPTIONIST"],schoolSlug);
 if(!hasModuleAccess(actor,"ADMISSIONS","MANAGE"))notFound();
 const record=await prisma.admissionEnquiry.findFirst({where:{id,schoolId:actor.schoolId,state:"OPEN"},include:{school:{select:{name:true}},academicYear:{select:{name:true,admissionAgePolicy:true}},applyingClass:{select:{name:true}}}});
 if(!record)notFound();
 const dob=record.dob?.toISOString().slice(0,10)??"";
 const policy=readAdmissionAgePolicy(record.academicYear.admissionAgePolicy);
 if(!policy||!policy.rules[record.classId]||(dob&&(!validCalendarDate(dob)||assessAge(dob,policy,record.classId).status!=="INELIGIBLE")))notFound();
 const age=calculateExactAge(dob,policy.ageAsOfDate);
 const classes=await prisma.class.findMany({where:{schoolId:actor.schoolId,active:true,id:{in:eligibleClassIds(dob,policy)}},select:{name:true},orderBy:{displayOrder:"asc"}});
 const rule=policy.rules[record.classId];
 return <div className="min-h-screen bg-muted p-4 print:bg-white print:p-0"><div className="mx-auto mb-4 flex max-w-3xl justify-between print:hidden"><Button asChild variant="outline"><Link href={`/${schoolSlug}/admissions/intake?year=${record.academicYearId}`}>Back to enquiries</Link></Button><PrintDocumentButton/></div><main className="theme-force-light mx-auto max-w-3xl space-y-6 border bg-white p-8 text-slate-950 print:border-0 print:p-4 sm:p-12"><header className="border-b-2 border-slate-900 pb-5 text-center"><h1 className="text-2xl font-bold uppercase">{record.school.name}</h1><p className="mt-2 text-lg font-semibold">Parent undertaking – age eligibility exception</p><p className="text-sm">Academic year {record.academicYear.name}</p></header><div className="grid grid-cols-2 gap-4 text-sm"><div>Student: <strong>{record.studentName}</strong></div><div>Parent / guardian: <strong>{record.parentName}</strong></div><div>Date of birth: <strong>{dob||"________________"}</strong></div><div>Age as on {policy.ageAsOfDate}: <strong>{age?age.years+"y "+age.months+"m "+age.days+"d":"—"}</strong></div><div>Requested class: <strong>{record.applyingClass.name}</strong></div><div>Calculated eligible class: <strong>{classes.map(c=>c.name).join(", ")||(dob?"No matching configured rule":"Complete after checking birth date")}</strong></div><div>Configured class age limits: {rule.minMonths}–{rule.maxMonths} months</div><div>Completed months: {age?.totalMonths??"—"}</div></div><p className="leading-7">I, the parent / guardian of the above student, confirm that I have been informed of the difference between the requested class and the age eligibility calculated under the school policy. I request the school to consider the requested class and confirm that the birth date and other information provided are accurate.</p><p className="leading-7">I understand that this request is subject to school approval and applicable education requirements. This undertaking does not override mandatory rules or waive any rights of the student.</p><div className="space-y-6"><p>Reason for requested class:</p><div className="border-b"/><div className="border-b"/><p>Signed date: ______________________ &nbsp; Document reference: ______________________</p></div><footer className="grid grid-cols-2 gap-10 pt-12 text-center text-sm"><div className="border-t pt-2">Parent / guardian signature</div><div className="border-t pt-2">Authorized school administrator</div></footer><p className="text-xs text-slate-500">Retain the signed original in the admission file. Record its reference in SchoolDB. This document is a school review template, not legal advice.</p></main></div>;
}
