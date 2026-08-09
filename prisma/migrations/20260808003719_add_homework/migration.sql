-- CreateTable
CREATE TABLE "Homework" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assignedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Homework_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Homework_schoolId_idx" ON "Homework"("schoolId");

-- CreateIndex
CREATE INDEX "Homework_academicYearId_idx" ON "Homework"("academicYearId");

-- CreateIndex
CREATE INDEX "Homework_teacherId_idx" ON "Homework"("teacherId");

-- CreateIndex
CREATE INDEX "Homework_subjectId_idx" ON "Homework"("subjectId");

-- CreateIndex
CREATE INDEX "Homework_classId_idx" ON "Homework"("classId");

-- CreateIndex
CREATE INDEX "Homework_sectionId_idx" ON "Homework"("sectionId");

-- CreateIndex
CREATE INDEX "Homework_schoolId_academicYearId_idx" ON "Homework"("schoolId", "academicYearId");

-- CreateIndex
CREATE INDEX "Homework_schoolId_dueDate_idx" ON "Homework"("schoolId", "dueDate");

-- AddForeignKey
ALTER TABLE "Homework" ADD CONSTRAINT "Homework_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Homework" ADD CONSTRAINT "Homework_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Homework" ADD CONSTRAINT "Homework_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Homework" ADD CONSTRAINT "Homework_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Homework" ADD CONSTRAINT "Homework_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Homework" ADD CONSTRAINT "Homework_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;
