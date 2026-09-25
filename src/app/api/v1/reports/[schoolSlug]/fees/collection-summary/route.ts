import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { PERMISSIONS } from "@/lib/access-control";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createSchoolReportWorkbook, reportDateRange, safeReportFilename } from "@/lib/reports/excel";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ schoolSlug: string }> }) {
  const { schoolSlug } = await params;
  const tenant = await requirePermission(PERMISSIONS.FEE_READ);
  const q = request.nextUrl.searchParams;
  const academicYearId = q.get("academicYearId") || undefined;
  const installmentName = q.get("installmentName")?.trim() || undefined;
  const classId = q.get("classId") || undefined;
  const sectionId = q.get("sectionId") || undefined;
  const fromDate = q.get("fromDate") || undefined;
  const toDate = q.get("toDate") || undefined;

  const school = await prisma.school.findFirst({ where: { id: tenant.schoolId, slug: schoolSlug }, select: { name: true } });
  if (!school) return NextResponse.json({ error: "School not found." }, { status: 404 });
  const year = academicYearId
    ? await prisma.academicYear.findFirst({ where: { id: academicYearId, schoolId: tenant.schoolId }, select: { id: true, name: true } })
    : await prisma.academicYear.findFirst({ where: { schoolId: tenant.schoolId, active: true }, select: { id: true, name: true } });
  if (!year) return NextResponse.json({ error: "Academic year not found." }, { status: 404 });

  const installmentWhere: Prisma.StudentFeeInstallmentWhereInput = {
    ...(installmentName ? { name: installmentName } : {}),
    studentFeeItem: { studentFee: { schoolId: tenant.schoolId, active: true, feePlan: { academicYearId: year.id }, studentEnrollment: { ...(classId ? { classId } : {}), ...(sectionId ? { sectionId } : {}) } } },
  };
  const [installments, payments] = await Promise.all([
    prisma.studentFeeInstallment.findMany({ where: installmentWhere, select: { id:true,name:true,amount:true,concession:true,payableAmount:true,paidAmount:true,studentFeeItem:{select:{studentFee:{select:{studentEnrollment:{select:{student:{select:{admissionNo:true}},class:{select:{name:true}},section:{select:{name:true}}}}}}}}} }),
    prisma.feePaymentAllocation.findMany({ where: { payment: { schoolId: tenant.schoolId, status:"SUCCESS", studentEnrollment:{academicYearId:year.id,...(classId?{classId}:{}),...(sectionId?{sectionId}:{})}, ...(fromDate||toDate?{paymentDate:{...(fromDate?{gte:new Date(`${fromDate}T00:00:00.000Z`)}:{}),...(toDate?{lte:new Date(`${toDate}T23:59:59.999Z`)}:{})}}:{}) }, ...(installmentName?{studentFeeInstallment:{name:installmentName}}:{}) }, select:{amount:true,payment:{select:{paymentMode:true}},studentFeeInstallment:{select:{name:true}}} }),
  ]);

  type Group={className:string;sectionName:string;students:Set<string>;installments:number;gross:number;concession:number;payable:number;paid:number;outstanding:number};
  const groups=new Map<string,Group>();
  for(const i of installments){const e=i.studentFeeItem.studentFee.studentEnrollment,k=`${e.class.name}::${e.section.name}`;const g=groups.get(k)??{className:e.class.name,sectionName:e.section.name,students:new Set<string>(),installments:0,gross:0,concession:0,payable:0,paid:0,outstanding:0};const payable=Number(i.payableAmount),paid=Number(i.paidAmount);g.students.add(e.student.admissionNo);g.installments++;g.gross+=Number(i.amount);g.concession+=Number(i.concession);g.payable+=payable;g.paid+=paid;g.outstanding+=Math.max(0,payable-paid);groups.set(k,g);}
  const rows=[...groups.values()].sort((a,b)=>a.className.localeCompare(b.className)||a.sectionName.localeCompare(b.sectionName));
  const workbook=await createSchoolReportWorkbook({schoolName:school.name,reportName:installmentName?`Fee Collection Summary - ${installmentName}`:"Fee Collection Summary",periodLabel:`Academic Year: ${year.name} | ${reportDateRange(fromDate,toDate)}`,sheetName:"Class Summary",rows,columns:[
    {header:"S.No",key:"serial",width:8,value:(_r,i)=>i+1},{header:"Class",key:"class",width:16,value:r=>r.className},{header:"Section",key:"section",width:12,value:r=>r.sectionName},{header:"Students",key:"students",width:12,value:r=>r.students.size},{header:"Installments",key:"installments",width:14,value:r=>r.installments},
    {header:"Gross Amount",key:"gross",width:17,value:r=>r.gross,numFmt:"₹#,##0.00"},{header:"Concession",key:"concession",width:16,value:r=>r.concession,numFmt:"₹#,##0.00"},{header:"Payable",key:"payable",width:16,value:r=>r.payable,numFmt:"₹#,##0.00"},{header:"Collected",key:"paid",width:16,value:r=>r.paid,numFmt:"₹#,##0.00"},{header:"Outstanding",key:"outstanding",width:16,value:r=>r.outstanding,numFmt:"₹#,##0.00"},{header:"Collection %",key:"percent",width:14,value:r=>r.payable?r.paid/r.payable:0,numFmt:"0.00%"},
  ]});
  const modes=new Map<string,number>();for(const p of payments)modes.set(p.payment.paymentMode,(modes.get(p.payment.paymentMode)||0)+Number(p.amount));
  const modeSheet=workbook.addWorksheet("Payment Modes");modeSheet.addRow([school.name]);modeSheet.mergeCells("A1:B1");modeSheet.addRow(["Fee Collection Summary - Payment Modes"]);modeSheet.mergeCells("A2:B2");modeSheet.addRow([`Academic Year: ${year.name} | ${reportDateRange(fromDate,toDate)}`]);modeSheet.mergeCells("A3:B3");modeSheet.addRow([]);modeSheet.addRow(["Payment Mode","Collected Amount"]);for(const [mode,amount] of modes)modeSheet.addRow([mode.replaceAll("_"," "),amount]);modeSheet.getRow(5).font={bold:true};modeSheet.getColumn(2).numFmt="₹#,##0.00";modeSheet.columns=[{width:24},{width:20}];
  const buffer=await workbook.xlsx.writeBuffer();
  return new NextResponse(Buffer.from(buffer),{headers:{"Content-Type":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","Content-Disposition":`attachment; filename="${safeReportFilename(school.name)}-fee-collection-summary-${safeReportFilename(year.name)}.xlsx"`,"Cache-Control":"no-store"}});
}
