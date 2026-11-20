CREATE TYPE "StudentFollowUpSource" AS ENUM ('EXAM_FAILURE', 'LOW_ATTENDANCE');
CREATE TYPE "StudentFollowUpStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED');

CREATE TABLE "StudentFollowUp" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "examId" TEXT,
    "source" "StudentFollowUpSource" NOT NULL,
    "status" "StudentFollowUpStatus" NOT NULL DEFAULT 'OPEN',
    "nextAction" VARCHAR(500) NOT NULL,
    "dueDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StudentFollowUp_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StudentFollowUp_schoolId_dueDate_idx" ON "StudentFollowUp"("schoolId", "dueDate");
CREATE INDEX "StudentFollowUp_schoolId_teacherId_status_dueDate_idx" ON "StudentFollowUp"("schoolId", "teacherId", "status", "dueDate");
CREATE INDEX "StudentFollowUp_enrollmentId_source_examId_idx" ON "StudentFollowUp"("enrollmentId", "source", "examId");

ALTER TABLE "StudentFollowUp" ADD CONSTRAINT "StudentFollowUp_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentFollowUp" ADD CONSTRAINT "StudentFollowUp_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "StudentEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentFollowUp" ADD CONSTRAINT "StudentFollowUp_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "StudentFollowUp" ADD CONSTRAINT "StudentFollowUp_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE SET NULL ON UPDATE CASCADE;
