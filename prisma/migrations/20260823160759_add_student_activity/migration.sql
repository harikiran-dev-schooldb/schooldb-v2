-- CreateEnum
CREATE TYPE "StudentActivityType" AS ENUM ('STUDENT_CREATED', 'PROFILE_UPDATED', 'ENROLLMENT_CREATED', 'ENROLLMENT_CHANGED', 'ATTENDANCE_MARKED', 'FEE_PAYMENT', 'FEE_CONCESSION', 'STATUS_CHANGED', 'PARENT_UPDATED', 'DOCUMENT_UPLOADED', 'DOCUMENT_DELETED');

-- CreateTable
CREATE TABLE "StudentActivity" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "type" "StudentActivityType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "performedByUserId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentActivity_studentId_idx" ON "StudentActivity"("studentId");

-- CreateIndex
CREATE INDEX "StudentActivity_schoolId_idx" ON "StudentActivity"("schoolId");

-- CreateIndex
CREATE INDEX "StudentActivity_studentId_createdAt_idx" ON "StudentActivity"("studentId", "createdAt");

-- CreateIndex
CREATE INDEX "StudentActivity_schoolId_createdAt_idx" ON "StudentActivity"("schoolId", "createdAt");

-- AddForeignKey
ALTER TABLE "StudentActivity" ADD CONSTRAINT "StudentActivity_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentActivity" ADD CONSTRAINT "StudentActivity_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
