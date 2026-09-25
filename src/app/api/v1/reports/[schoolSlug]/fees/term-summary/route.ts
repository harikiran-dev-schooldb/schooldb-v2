import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { PERMISSIONS } from "@/lib/access-control";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createSchoolReportWorkbook, safeReportFilename } from "@/lib/reports/excel";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ schoolSlug: string }> }) {
  const { schoolSlug } = await params;
  const tenant = await requirePermission(PERMISSIONS.FEE_READ);
  const q = request.nextUrl.searchParams;
  const academicYearId = q.get("academicYearId") || undefined;
  const installmentName = q.get("installmentName")?.trim() || undefined;
  const classId = q.get("classId") || undefined;
  const sectionId = q.get("sectionId") || undefined;

  const school = await prisma.school.findFirst({ where: { id: tenant.schoolId, slug: schoolSlug }, select: { name: true } });
  if (!school) return NextResponse.json({ error: "School not found." }, { status: 404 });

  const year = academicYearId
    ? await prisma.academicYear.findFirst({ where: { id: academicYearId, schoolId: tenant.schoolId }, select: { id: true, name: true } })
    : await prisma.academicYear.findFirst({ where: { schoolId: tenant.schoolId, active: true }, select: { id: true, name: true } });
  if (!year) return NextResponse.json({ error: "Academic year not found." }, { status: 404 });

  const where: Prisma.StudentFeeInstallmentWhereInput = {
    ...(installmentName ? { name: installmentName } : {}),
    studentFeeItem: { studentFee: { schoolId: tenant.schoolId, active: true, feePlan: { academicYearId: year.id }, studentEnrollment: { ...(classId ? { classId } : {}), ...(sectionId ? { sectionId } : {}) } } },
  };
  const installments = await prisma.studentFeeInstallment.findMany({
    where, orderBy: [{ sequence: "asc" }, { studentFeeItem: { studentFee: { studentEnrollment: { class: { name: "asc" } } } } }],
    select: { name: true, sequence: true, dueDate: true, status: true, amount: true, concession: true, payableAmount: true, paidAmount: true,
      studentFeeItem: { select: { feeCategory: { select: { name: true } }, studentFee: { select: { feePlan: { select: { name: true } }, studentEnrollment: { select: { rollNo: true, student: { select: { admissionNo: true, fullName: true } }, class: { select: { name: true } }, section: { select: { name: true } } } } } } } } },
  });
  const rows=installments.map(i=>{const e=i.studentFeeItem.studentFee.studentEnrollment;const payable=Number(i.payableAmount),paid=Number(i.paidAmount);return {admissionNo:e.student.admissionNo,student:e.student.fullName,className:e.class.name,sectionName:e.section.name,rollNo:e.rollNo,term:i.name,sequence:i.sequence,dueDate:i.dueDate,category:i.studentFeeItem.feeCategory.name,plan:i.studentFeeItem.studentFee.feePlan.name,amount:Number(i.amount),concession:Number(i.concession),payable,paid,outstanding:Math.max(0,payable-paid),status:i.status};});
  const title=installmentName?`Fee Term Summary - ${installmentName}`:"Fee Term Summary";
  const workbook=await createSchoolReportWorkbook({schoolName:school.name,reportName:title,periodLabel:`Academic Year: ${year.name}`,sheetName:"Student Allocations",rows,columns:[
    {header:"S.No",key:"serial",width:8,value:(_r,i)=>i+1},{header:"Admission No",key:"admission",width:16,value:r=>r.admissionNo},{header:"Student Name",key:"student",width:30,value:r=>r.student},
    {header:"Class",key:"class",width:12,value:r=>r.className},{header:"Section",key:"section",width:10,value:r=>r.sectionName},{header:"Roll No",key:"roll",width:10,value:r=>r.rollNo},
    {header:"Term / Installment",key:"term",width:20,value:r=>r.term},{header:"Fee Category",key:"category",width:22,value:r=>r.category},{header:"Fee Plan",key:"plan",width:22,value:r=>r.plan},
    {header:"Due Date",key:"due",width:15,value:r=>r.dueDate,numFmt:"dd-mm-yyyy"},{header:"Amount",key:"amount",width:14,value:r=>r.amount,numFmt:"₹#,##0.00"},
    {header:"Concession",key:"concession",width:14,value:r=>r.concession,numFmt:"₹#,##0.00"},{header:"Payable",key:"payable",width:14,value:r=>r.payable,numFmt:"₹#,##0.00"},
    {header:"Paid",key:"paid",width:14,value:r=>r.paid,numFmt:"₹#,##0.00"},{header:"Outstanding",key:"outstanding",width:16,value:r=>r.outstanding,numFmt:"₹#,##0.00"},{header:"Status",key:"status",width:13,value:r=>r.status},
  ]});
  const summary=workbook.addWorksheet("Class Summary"); summary.addRow([school.name]);summary.mergeCells("A1:J1");summary.addRow([title]);summary.mergeCells("A2:J2");summary.addRow([`Academic Year: ${year.name}`]);summary.mergeCells("A3:J3");summary.addRow([]);
  summary.addRow(["Class","Section","Students","Installments","Gross Amount","Concession","Payable","Paid","Outstanding","Collection %"]);
  const groups=new Map<string,{className:string;sectionName:string;students:Set<string>;count:number;amount:number;concession:number;payable:number;paid:number;outstanding:number}>();
  for(const r of rows){const k=`${r.className}::${r.sectionName}`;const g=groups.get(k)??{className:r.className,sectionName:r.sectionName,students:new Set<string>(),count:0,amount:0,concession:0,payable:0,paid:0,outstanding:0};g.students.add(r.admissionNo);g.count++;g.amount+=r.amount;g.concession+=r.concession;g.payable+=r.payable;g.paid+=r.paid;g.outstanding+=r.outstanding;groups.set(k,g);}
  for(const g of groups.values())summary.addRow([g.className,g.sectionName,g.students.size,g.count,g.amount,g.concession,g.payable,g.paid,g.outstanding,g.payable?g.paid/g.payable:0]);
  summary.getRow(5).font={bold:true};summary.getRow(5).eachCell(c=>{c.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF091540"}};c.font={bold:true,color:{argb:"FFFFFFFF"}};});
  for(let col=5;col<=9;col++)summary.getColumn(col).numFmt="₹#,##0.00";summary.getColumn(10).numFmt="0.00%";summary.columns=[{width:16},{width:12},{width:12},{width:14},{width:16},{width:16},{width:16},{width:16},{width:16},{width:14}];summary.views=[{state:"frozen",ySplit:5}];
  const buffer=await workbook.xlsx.writeBuffer();
  return new NextResponse(Buffer.from(buffer),{headers:{"Content-Type":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","Content-Disposition":`attachment; filename="${safeReportFilename(school.name)}-fee-term-summary-${safeReportFilename(year.name)}.xlsx"`,"Cache-Control":"no-store"}});
}
