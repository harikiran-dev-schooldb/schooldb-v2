import { NextResponse } from "next/server";
import { PERMISSIONS } from "@/lib/access-control";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { studentFeeLedgerService } from "@/features/student-fees/services/student-fee-ledger.service";
import { createSchoolReportWorkbook, safeReportFilename } from "@/lib/reports/excel";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ schoolSlug: string; studentFeeId: string }> }) {
  const { schoolSlug, studentFeeId } = await params;
  const tenant = await requirePermission(PERMISSIONS.FEE_READ);
  const [school, ledger] = await Promise.all([
    prisma.school.findFirst({ where: { id: tenant.schoolId, slug: schoolSlug }, select: { name: true } }),
    studentFeeLedgerService.get(studentFeeId, tenant.schoolId),
  ]);
  if (!school) return NextResponse.json({ error: "School not found." }, { status: 404 });
  if (!ledger) return NextResponse.json({ error: "Student fee not found." }, { status: 404 });

  const workbook = await createSchoolReportWorkbook({
    schoolName: school.name,
    reportName: "Student Fee Ledger",
    periodLabel: `Academic Year: ${ledger.academicYear.name}`,
    sheetName: "Fee Ledger",
    rows: ledger.installments,
    columns: [
      { header: "S.No", key: "serial", width: 8, value: (_r,i)=>i+1 },
      { header: "Admission No", key: "admission", width: 16, value: ()=>ledger.student.admissionNo },
      { header: "Student Name", key: "student", width: 30, value: ()=>ledger.student.fullName },
      { header: "Class", key: "class", width: 12, value: ()=>ledger.student.class.name },
      { header: "Section", key: "section", width: 10, value: ()=>ledger.student.section.name },
      { header: "Fee Plan", key: "plan", width: 24, value: ()=>ledger.studentFee.feePlan.name },
      { header: "Fee Category", key: "category", width: 22, value:r=>r.feeCategory.name },
      { header: "Installment / Term", key: "term", width: 20, value:r=>r.name },
      { header: "Due Date", key: "due", width: 15, value:r=>r.dueDate, numFmt:"dd-mm-yyyy" },
      { header: "Amount", key: "amount", width: 14, value:r=>r.amount, numFmt:"₹#,##0.00" },
      { header: "Concession", key: "concession", width: 14, value:r=>r.concession, numFmt:"₹#,##0.00" },
      { header: "Payable", key: "payable", width: 14, value:r=>r.payableAmount, numFmt:"₹#,##0.00" },
      { header: "Paid", key: "paid", width: 14, value:r=>r.paidAmount, numFmt:"₹#,##0.00" },
      { header: "Outstanding", key: "outstanding", width: 16, value:r=>r.outstanding, numFmt:"₹#,##0.00" },
      { header: "Status", key: "status", width: 13, value:r=>r.status },
    ],
  });

  const payments = workbook.addWorksheet("Payments");
  payments.addRow([school.name]); payments.mergeCells("A1:J1");
  payments.addRow(["Student Fee Ledger - Payments"]); payments.mergeCells("A2:J2");
  payments.addRow([`${ledger.student.fullName || "Student"} (${ledger.student.admissionNo}) | Academic Year: ${ledger.academicYear.name}`]); payments.mergeCells("A3:J3");
  payments.addRow([]);
  payments.addRow(["Receipt No","Payment Date","Payment Mode","Reference No","Fee Category","Installment / Term","Allocated Amount","Receipt Amount","Remarks","Status"]);
  for (const p of ledger.payments) {
    if (p.allocations.length) for (const a of p.allocations) payments.addRow([p.receiptNo,p.paymentDate,p.paymentMode.replaceAll("_"," "),p.referenceNo,a.feeCategory,a.installmentName,a.amount,p.amount,p.remarks,p.status]);
    else payments.addRow([p.receiptNo,p.paymentDate,p.paymentMode.replaceAll("_"," "),p.referenceNo,"","",0,p.amount,p.remarks,p.status]);
  }
  payments.getRow(5).font={bold:true}; payments.getRow(5).eachCell(c=>{c.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF091540"}};c.font={bold:true,color:{argb:"FFFFFFFF"}};});
  payments.getColumn(2).numFmt="dd-mm-yyyy";payments.getColumn(7).numFmt="₹#,##0.00";payments.getColumn(8).numFmt="₹#,##0.00";payments.columns=[{width:24},{width:16},{width:18},{width:22},{width:22},{width:22},{width:18},{width:18},{width:30},{width:14}];payments.views=[{state:"frozen",ySplit:5}];

  const summary=workbook.addWorksheet("Summary"); summary.addRow([school.name]);summary.mergeCells("A1:B1");summary.addRow(["Student Fee Ledger - Summary"]);summary.mergeCells("A2:B2");summary.addRow([`Academic Year: ${ledger.academicYear.name}`]);summary.mergeCells("A3:B3");summary.addRow([]);
  [["Admission No",ledger.student.admissionNo],["Student",ledger.student.fullName||""],["Class",ledger.student.class.name],["Section",ledger.student.section.name],["Fee Plan",ledger.studentFee.feePlan.name],["Total Fee",ledger.summary.total],["Concession",ledger.summary.concession],["Payable",Math.max(0,ledger.summary.total-ledger.summary.concession)],["Paid",ledger.summary.paid],["Outstanding",ledger.summary.outstanding]].forEach(r=>summary.addRow(r));
  summary.getColumn(1).width=24;summary.getColumn(2).width=32;for(let r=10;r<=14;r++)summary.getCell(r,2).numFmt="₹#,##0.00";

  const buffer=await workbook.xlsx.writeBuffer();
  return new NextResponse(Buffer.from(buffer),{headers:{"Content-Type":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","Content-Disposition":`attachment; filename="${safeReportFilename(ledger.student.admissionNo)}-fee-ledger-${safeReportFilename(ledger.academicYear.name)}.xlsx"`,"Cache-Control":"no-store"}});
}
