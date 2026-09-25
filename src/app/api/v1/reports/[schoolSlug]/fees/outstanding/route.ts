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
  const search = q.get("search")?.trim() || undefined;
  const classId = q.get("classId") || undefined;
  const sectionId = q.get("sectionId") || undefined;
  const academicYearId = q.get("academicYearId") || undefined;

  const where: Prisma.StudentFeeInstallmentWhereInput = {
    status: { in: ["PENDING", "PARTIAL"] },
    studentFeeItem: { studentFee: {
      schoolId: tenant.schoolId, active: true,
      ...(academicYearId ? { feePlan: { academicYearId } } : {}),
      studentEnrollment: {
        ...(classId ? { classId } : {}), ...(sectionId ? { sectionId } : {}),
        ...(search ? { student: { OR: [{ fullName: { contains: search, mode: "insensitive" } }, { admissionNo: { contains: search, mode: "insensitive" } }] } } : {}),
      },
    }},
  };

  const [school, installments] = await Promise.all([
    prisma.school.findFirst({ where: { id: tenant.schoolId, slug: schoolSlug }, select: { name: true } }),
    prisma.studentFeeInstallment.findMany({
      where, orderBy: [{ studentFeeItem: { studentFee: { studentEnrollment: { class: { name: "asc" } } } } }, { dueDate: "asc" }],
      select: {
        name: true, dueDate: true, status: true, amount: true, concession: true, payableAmount: true, paidAmount: true,
        studentFeeItem: { select: { feeCategory: { select: { name: true } }, studentFee: { select: {
          feePlan: { select: { name: true, academicYear: { select: { name: true } } } },
          studentEnrollment: { select: { rollNo: true, student: { select: { admissionNo: true, fullName: true } }, class: { select: { name: true } }, section: { select: { name: true } } } },
        } } } },
      },
    }),
  ]);
  if (!school) return NextResponse.json({ error: "School not found." }, { status: 404 });

  const rows = installments.map(i => {
    const e = i.studentFeeItem.studentFee.studentEnrollment;
    const payable = Number(i.payableAmount); const paid = Number(i.paidAmount);
    return { admissionNo: e.student.admissionNo, studentName: e.student.fullName, className: e.class.name, sectionName: e.section.name, rollNo: e.rollNo,
      academicYear: i.studentFeeItem.studentFee.feePlan.academicYear.name, feePlan: i.studentFeeItem.studentFee.feePlan.name, feeCategory: i.studentFeeItem.feeCategory.name,
      installment: i.name, dueDate: i.dueDate, status: i.status, amount: Number(i.amount), concession: Number(i.concession), payable, paid, outstanding: Math.max(0, payable-paid) };
  });
  const workbook = await createSchoolReportWorkbook({ schoolName: school.name, reportName: "Outstanding Fees / Defaulters Report", periodLabel: "Current Outstanding Fees", sheetName: "Outstanding Fees", rows, columns: [
    { header: "S.No", key: "serial", width: 8, value: (_r,i)=>i+1 }, { header: "Admission No", key: "admission", width: 16, value:r=>r.admissionNo },
    { header: "Student Name", key: "student", width: 30, value:r=>r.studentName }, { header: "Class", key: "class", width: 12, value:r=>r.className },
    { header: "Section", key: "section", width: 10, value:r=>r.sectionName }, { header: "Roll No", key: "roll", width: 10, value:r=>r.rollNo },
    { header: "Academic Year", key: "year", width: 16, value:r=>r.academicYear }, { header: "Fee Plan", key: "plan", width: 24, value:r=>r.feePlan },
    { header: "Fee Category", key: "category", width: 22, value:r=>r.feeCategory }, { header: "Installment / Term", key: "term", width: 20, value:r=>r.installment },
    { header: "Due Date", key: "due", width: 15, value:r=>r.dueDate, numFmt:"dd-mm-yyyy" }, { header: "Status", key: "status", width: 12, value:r=>r.status },
    { header: "Amount", key: "amount", width: 14, value:r=>r.amount, numFmt:"₹#,##0.00" }, { header: "Concession", key: "concession", width: 14, value:r=>r.concession, numFmt:"₹#,##0.00" },
    { header: "Payable", key: "payable", width: 14, value:r=>r.payable, numFmt:"₹#,##0.00" }, { header: "Paid", key: "paid", width: 14, value:r=>r.paid, numFmt:"₹#,##0.00" },
    { header: "Outstanding", key: "outstanding", width: 16, value:r=>r.outstanding, numFmt:"₹#,##0.00" },
  ]});
  const detail = workbook.getWorksheet("Outstanding Fees")!;
  const totalRow = rows.length + 7; detail.getCell(totalRow, 16).value = "TOTAL"; detail.getCell(totalRow, 16).font = { bold: true }; detail.getCell(totalRow,17).value = rows.reduce((s,r)=>s+r.outstanding,0); detail.getCell(totalRow,17).numFmt="₹#,##0.00"; detail.getCell(totalRow,17).font={bold:true};

  const summary = workbook.addWorksheet("Class Summary");
  summary.addRow(["Class","Section","Students","Installments","Outstanding"]);
  const groups = new Map<string,{className:string;sectionName:string;students:Set<string>;count:number;outstanding:number}>();
  for (const r of rows) { const key=`${r.className}::${r.sectionName}`; const g=groups.get(key)??{className:r.className,sectionName:r.sectionName,students:new Set<string>(),count:0,outstanding:0}; g.students.add(r.admissionNo); g.count++; g.outstanding+=r.outstanding; groups.set(key,g); }
  for (const g of groups.values()) summary.addRow([g.className,g.sectionName,g.students.size,g.count,g.outstanding]);
  summary.getRow(1).font={bold:true}; summary.getColumn(5).numFmt="₹#,##0.00"; summary.columns=[{width:18},{width:12},{width:12},{width:15},{width:18}];

  const buffer=await workbook.xlsx.writeBuffer();
  return new NextResponse(Buffer.from(buffer),{headers:{"Content-Type":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","Content-Disposition":`attachment; filename="${safeReportFilename(school.name)}-outstanding-fees-report.xlsx"`,"Cache-Control":"no-store"}});
}
