-- CreateEnum
CREATE TYPE "CertificateIssueType" AS ENUM ('BONAFIDE', 'STUDY', 'TRANSFER');

-- CreateEnum
CREATE TYPE "CertificateIssueStatus" AS ENUM ('ISSUED', 'CANCELLED');

-- CreateTable
CREATE TABLE "CertificateIssue" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "type" "CertificateIssueType" NOT NULL,
    "status" "CertificateIssueStatus" NOT NULL DEFAULT 'ISSUED',
    "certificateNo" TEXT NOT NULL,
    "purpose" TEXT,
    "issuedByUserId" TEXT NOT NULL,
    "issuedByName" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "printCount" INTEGER NOT NULL DEFAULT 0,
    "lastPrintedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelledByName" TEXT,
    "cancellationNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CertificateIssue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CertificateIssue_certificateNo_key" ON "CertificateIssue"("certificateNo");

-- CreateIndex
CREATE INDEX "CertificateIssue_schoolId_issuedAt_idx" ON "CertificateIssue"("schoolId", "issuedAt");

-- CreateIndex
CREATE INDEX "CertificateIssue_schoolId_status_issuedAt_idx" ON "CertificateIssue"("schoolId", "status", "issuedAt");

-- CreateIndex
CREATE INDEX "CertificateIssue_schoolId_studentId_issuedAt_idx" ON "CertificateIssue"("schoolId", "studentId", "issuedAt");

-- CreateIndex
CREATE INDEX "CertificateIssue_schoolId_type_issuedAt_idx" ON "CertificateIssue"("schoolId", "type", "issuedAt");

-- AddForeignKey
ALTER TABLE "CertificateIssue" ADD CONSTRAINT "CertificateIssue_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificateIssue" ADD CONSTRAINT "CertificateIssue_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
