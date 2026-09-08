-- CreateEnum
CREATE TYPE "LibraryCopyStatus" AS ENUM ('AVAILABLE', 'ISSUED', 'LOST', 'DAMAGED');

-- CreateEnum
CREATE TYPE "LibraryBorrowerType" AS ENUM ('STUDENT', 'TEACHER');

-- CreateTable
CREATE TABLE "LibraryCategory" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LibraryCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LibraryBook" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "categoryId" TEXT,
    "accessionNo" TEXT NOT NULL,
    "isbn" TEXT,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "publisher" TEXT,
    "edition" TEXT,
    "shelf" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LibraryBook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LibraryBookCopy" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "barcode" TEXT NOT NULL,
    "status" "LibraryCopyStatus" NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LibraryBookCopy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LibraryLoan" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "copyId" TEXT NOT NULL,
    "borrowerType" "LibraryBorrowerType" NOT NULL,
    "studentEnrollmentId" TEXT,
    "teacherId" TEXT,
    "issuedAt" DATE NOT NULL,
    "dueAt" DATE NOT NULL,
    "returnedAt" DATE,
    "renewedCount" INTEGER NOT NULL DEFAULT 0,
    "fineAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LibraryLoan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LibraryCategory_schoolId_active_idx" ON "LibraryCategory"("schoolId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "LibraryCategory_schoolId_name_key" ON "LibraryCategory"("schoolId", "name");

-- CreateIndex
CREATE INDEX "LibraryBook_schoolId_active_title_idx" ON "LibraryBook"("schoolId", "active", "title");

-- CreateIndex
CREATE INDEX "LibraryBook_categoryId_idx" ON "LibraryBook"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "LibraryBook_schoolId_accessionNo_key" ON "LibraryBook"("schoolId", "accessionNo");

-- CreateIndex
CREATE INDEX "LibraryBookCopy_bookId_status_idx" ON "LibraryBookCopy"("bookId", "status");

-- CreateIndex
CREATE INDEX "LibraryBookCopy_schoolId_status_idx" ON "LibraryBookCopy"("schoolId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "LibraryBookCopy_schoolId_barcode_key" ON "LibraryBookCopy"("schoolId", "barcode");

-- CreateIndex
CREATE INDEX "LibraryLoan_schoolId_returnedAt_dueAt_idx" ON "LibraryLoan"("schoolId", "returnedAt", "dueAt");

-- CreateIndex
CREATE INDEX "LibraryLoan_copyId_returnedAt_idx" ON "LibraryLoan"("copyId", "returnedAt");

-- CreateIndex
CREATE INDEX "LibraryLoan_studentEnrollmentId_returnedAt_idx" ON "LibraryLoan"("studentEnrollmentId", "returnedAt");

-- CreateIndex
CREATE INDEX "LibraryLoan_teacherId_returnedAt_idx" ON "LibraryLoan"("teacherId", "returnedAt");

-- AddForeignKey
ALTER TABLE "LibraryCategory" ADD CONSTRAINT "LibraryCategory_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LibraryBook" ADD CONSTRAINT "LibraryBook_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LibraryBook" ADD CONSTRAINT "LibraryBook_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "LibraryCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LibraryBookCopy" ADD CONSTRAINT "LibraryBookCopy_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LibraryBookCopy" ADD CONSTRAINT "LibraryBookCopy_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "LibraryBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LibraryLoan" ADD CONSTRAINT "LibraryLoan_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LibraryLoan" ADD CONSTRAINT "LibraryLoan_copyId_fkey" FOREIGN KEY ("copyId") REFERENCES "LibraryBookCopy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LibraryLoan" ADD CONSTRAINT "LibraryLoan_studentEnrollmentId_fkey" FOREIGN KEY ("studentEnrollmentId") REFERENCES "StudentEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LibraryLoan" ADD CONSTRAINT "LibraryLoan_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
