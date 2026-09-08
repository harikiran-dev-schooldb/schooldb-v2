import { z } from "zod";

import { prisma } from "@/lib/prisma";

const optional = z.string().trim().max(160).optional().transform((value) => value || null);

export const categorySchema = z.object({ name: z.string().trim().min(2).max(100) });
export const bookSchema = z.object({
  accessionNo: z.string().trim().min(1).max(40).transform((value) => value.toUpperCase()),
  isbn: optional,
  title: z.string().trim().min(2).max(240),
  author: z.string().trim().min(2).max(160),
  publisher: optional,
  edition: optional,
  shelf: optional,
  categoryId: z.string().optional().transform((value) => !value || value === "none" ? null : value),
  copies: z.coerce.number().int().min(1).max(100),
});
export const issueSchema = z.object({
  borrowerType: z.enum(["STUDENT", "TEACHER"]),
  borrowerId: z.string().min(1),
  academicYearId: z.string().optional(),
  bookId: z.string().min(1),
  issuedAt: z.string().date(),
  dueAt: z.string().date(),
  notes: z.string().trim().max(500).optional().transform((value) => value || null),
});

export async function listLibraryDashboard(schoolId: string) {
  const [categories, books, loans] = await Promise.all([
    prisma.libraryCategory.findMany({ where: { schoolId, active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.libraryBook.findMany({
      where: { schoolId, active: true }, orderBy: { title: "asc" }, take: 250,
      select: { id: true, accessionNo: true, isbn: true, title: true, author: true, publisher: true, edition: true, shelf: true, category: { select: { name: true } }, copies: { select: { id: true, barcode: true, status: true } } },
    }),
    prisma.libraryLoan.findMany({
      where: { schoolId }, orderBy: { createdAt: "desc" }, take: 150,
      select: {
        id: true, borrowerType: true, issuedAt: true, dueAt: true, returnedAt: true, renewedCount: true, fineAmount: true, notes: true,
        copy: { select: { barcode: true, book: { select: { title: true, author: true } } } },
        studentEnrollment: { select: { student: { select: { fullName: true, admissionNo: true } }, class: { select: { name: true } }, section: { select: { name: true } } } },
        teacher: { select: { fullName: true, employeeId: true } },
      },
    }),
  ]);
  return { categories, books, loans };
}

export async function createLibraryCategory(schoolId: string, value: unknown) {
  const input = categorySchema.parse(value);
  return prisma.libraryCategory.create({ data: { schoolId, name: input.name } });
}

export async function createLibraryBook(schoolId: string, value: unknown) {
  const input = bookSchema.parse(value);
  if (input.categoryId) {
    const category = await prisma.libraryCategory.findFirst({ where: { id: input.categoryId, schoolId, active: true }, select: { id: true } });
    if (!category) throw new Error("Select a valid library category.");
  }
  return prisma.$transaction(async (tx) => {
    const book = await tx.libraryBook.create({ data: { schoolId, accessionNo: input.accessionNo, isbn: input.isbn, title: input.title, author: input.author, publisher: input.publisher, edition: input.edition, shelf: input.shelf, categoryId: input.categoryId } });
    await tx.libraryBookCopy.createMany({ data: Array.from({ length: input.copies }, (_, index) => ({ schoolId, bookId: book.id, barcode: `${input.accessionNo}-${String(index + 1).padStart(3, "0")}` })) });
    return book;
  });
}

export async function issueLibraryBook(schoolId: string, value: unknown) {
  const input = issueSchema.parse(value);
  const issuedAt = new Date(`${input.issuedAt}T00:00:00.000Z`);
  const dueAt = new Date(`${input.dueAt}T00:00:00.000Z`);
  if (dueAt < issuedAt) throw new Error("Due date must be on or after the issue date.");
  const copy = await prisma.libraryBookCopy.findFirst({ where: { schoolId, bookId: input.bookId, status: "AVAILABLE", book: { active: true } }, orderBy: { barcode: "asc" }, select: { id: true } });
  if (!copy) throw new Error("No available copy remains for this book.");
  const studentEnrollment = input.borrowerType === "STUDENT" ? await prisma.studentEnrollment.findFirst({ where: { schoolId, studentId: input.borrowerId, academicYearId: input.academicYearId, active: true }, select: { id: true } }) : null;
  const teacher = input.borrowerType === "TEACHER" ? await prisma.teacher.findFirst({ where: { schoolId, id: input.borrowerId, active: true }, select: { id: true } }) : null;
  if (input.borrowerType === "STUDENT" && !studentEnrollment) throw new Error("Select an actively enrolled student.");
  if (input.borrowerType === "TEACHER" && !teacher) throw new Error("Select an active teacher.");
  return prisma.$transaction(async (tx) => {
    const claimed = await tx.libraryBookCopy.updateMany({ where: { id: copy.id, schoolId, status: "AVAILABLE" }, data: { status: "ISSUED" } });
    if (claimed.count !== 1) throw new Error("That copy was just issued. Please try again.");
    return tx.libraryLoan.create({ data: { schoolId, copyId: copy.id, borrowerType: input.borrowerType, studentEnrollmentId: studentEnrollment?.id, teacherId: teacher?.id, issuedAt, dueAt, notes: input.notes } });
  });
}

export async function returnLibraryBook(schoolId: string, value: unknown) {
  const input = z.object({ loanId: z.string().min(1), fineAmount: z.coerce.number().min(0).max(1_000_000).default(0) }).parse(value);
  const loan = await prisma.libraryLoan.findFirst({ where: { id: input.loanId, schoolId, returnedAt: null }, select: { id: true, copyId: true } });
  if (!loan) throw new Error("Active loan not found.");
  return prisma.$transaction([prisma.libraryLoan.update({ where: { id: loan.id }, data: { returnedAt: new Date(), fineAmount: input.fineAmount } }), prisma.libraryBookCopy.update({ where: { id: loan.copyId }, data: { status: "AVAILABLE" } })]);
}

export async function renewLibraryLoan(schoolId: string, value: unknown) {
  const { loanId } = z.object({ loanId: z.string().min(1) }).parse(value);
  const loan = await prisma.libraryLoan.findFirst({ where: { id: loanId, schoolId, returnedAt: null }, select: { id: true, dueAt: true, renewedCount: true } });
  if (!loan) throw new Error("Active loan not found.");
  if (loan.renewedCount >= 2) throw new Error("This loan has reached its renewal limit.");
  const dueAt = new Date(loan.dueAt); dueAt.setUTCDate(dueAt.getUTCDate() + 14);
  return prisma.libraryLoan.update({ where: { id: loan.id }, data: { dueAt, renewedCount: { increment: 1 } } });
}
