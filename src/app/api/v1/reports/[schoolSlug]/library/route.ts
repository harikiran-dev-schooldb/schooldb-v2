import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createSchoolReportWorkbook, reportDateRange, safeReportFilename } from "@/lib/reports/excel";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ schoolSlug: string }> }) {
  const { schoolSlug } = await params;
  const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
  const q = request.nextUrl.searchParams;
  const report = q.get("report") === "circulation" ? "circulation" : "inventory";
  const from = q.get("fromDate") || undefined;
  const to = q.get("toDate") || undefined;
  const status = q.get("status") || "ALL";
  const search = q.get("search")?.trim() || undefined;
  const school = await prisma.school.findFirst({ where: { id: tenant.schoolId, slug: schoolSlug }, select: { name: true } });
  if (!school) return NextResponse.json({ error: "School not found." }, { status: 404 });

  let workbook;
  if (report === "inventory") {
    const books = await prisma.libraryBook.findMany({
      where: { schoolId: tenant.schoolId, active: true, ...(search ? { OR: [{ title: { contains: search, mode: "insensitive" } }, { author: { contains: search, mode: "insensitive" } }, { accessionNo: { contains: search, mode: "insensitive" } }, { isbn: { contains: search, mode: "insensitive" } }] } : {}) },
      orderBy: { title: "asc" },
      select: { accessionNo: true, isbn: true, title: true, author: true, publisher: true, edition: true, shelf: true, category: { select: { name: true } }, copies: { select: { barcode: true, status: true } } },
    });
    const rows = books.flatMap((book) => book.copies.map((copy) => ({ ...book, barcode: copy.barcode, copyStatus: copy.status })));
    workbook = await createSchoolReportWorkbook({
      schoolName: school.name, reportName: "Library Book Inventory Report", periodLabel: "Current Library Inventory", sheetName: "Book Inventory", rows,
      columns: [
        { header: "S.No", key: "serial", width: 8, value: (_r, i) => i + 1 },
        { header: "Accession No", key: "accession", width: 16, value: r => r.accessionNo },
        { header: "Barcode", key: "barcode", width: 18, value: r => r.barcode },
        { header: "Title", key: "title", width: 34, value: r => r.title },
        { header: "Author", key: "author", width: 26, value: r => r.author },
        { header: "Category", key: "category", width: 20, value: r => r.category?.name },
        { header: "ISBN", key: "isbn", width: 18, value: r => r.isbn },
        { header: "Publisher", key: "publisher", width: 24, value: r => r.publisher },
        { header: "Edition", key: "edition", width: 14, value: r => r.edition },
        { header: "Shelf", key: "shelf", width: 12, value: r => r.shelf },
        { header: "Copy Status", key: "status", width: 15, value: r => r.copyStatus },
      ],
    });
  } else {
    const dateWhere = from || to ? { issuedAt: { ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}), ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}) } } : {};
    const now = new Date();
    const loans = await prisma.libraryLoan.findMany({
      where: { schoolId: tenant.schoolId, ...dateWhere, ...(status === "ISSUED" ? { returnedAt: null, dueAt: { gte: now } } : status === "OVERDUE" ? { returnedAt: null, dueAt: { lt: now } } : status === "RETURNED" ? { returnedAt: { not: null } } : {}) },
      orderBy: { issuedAt: "desc" },
      select: { borrowerType: true, issuedAt: true, dueAt: true, returnedAt: true, renewedCount: true, fineAmount: true, notes: true, copy: { select: { barcode: true, book: { select: { accessionNo: true, title: true, author: true } } } }, studentEnrollment: { select: { student: { select: { admissionNo: true, fullName: true } }, class: { select: { name: true } }, section: { select: { name: true } } } }, teacher: { select: { employeeId: true, fullName: true } } },
    });
    workbook = await createSchoolReportWorkbook({
      schoolName: school.name, reportName: "Library Circulation Report", periodLabel: reportDateRange(from, to), sheetName: "Circulation", rows: loans,
      columns: [
        { header: "S.No", key: "serial", width: 8, value: (_r, i) => i + 1 },
        { header: "Accession No", key: "accession", width: 16, value: r => r.copy.book.accessionNo },
        { header: "Barcode", key: "barcode", width: 18, value: r => r.copy.barcode },
        { header: "Book Title", key: "title", width: 34, value: r => r.copy.book.title },
        { header: "Author", key: "author", width: 24, value: r => r.copy.book.author },
        { header: "Borrower Type", key: "type", width: 16, value: r => r.borrowerType },
        { header: "Borrower ID", key: "borrowerId", width: 16, value: r => r.studentEnrollment?.student.admissionNo ?? r.teacher?.employeeId },
        { header: "Borrower Name", key: "borrower", width: 28, value: r => r.studentEnrollment?.student.fullName ?? r.teacher?.fullName },
        { header: "Class", key: "class", width: 12, value: r => r.studentEnrollment?.class.name },
        { header: "Section", key: "section", width: 10, value: r => r.studentEnrollment?.section.name },
        { header: "Issued Date", key: "issued", width: 15, value: r => r.issuedAt, numFmt: "dd-mm-yyyy" },
        { header: "Due Date", key: "due", width: 15, value: r => r.dueAt, numFmt: "dd-mm-yyyy" },
        { header: "Returned Date", key: "returned", width: 16, value: r => r.returnedAt, numFmt: "dd-mm-yyyy" },
        { header: "Status", key: "status", width: 14, value: r => r.returnedAt ? "RETURNED" : r.dueAt < now ? "OVERDUE" : "ISSUED" },
        { header: "Renewals", key: "renewals", width: 11, value: r => r.renewedCount },
        { header: "Fine", key: "fine", width: 12, value: r => Number(r.fineAmount), numFmt: "₹#,##0.00" },
        { header: "Notes", key: "notes", width: 30, value: r => r.notes },
      ],
    });
  }
  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(Buffer.from(buffer), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${safeReportFilename(school.name)}-library-${report}-report.xlsx"`, "Cache-Control": "no-store" } });
}
