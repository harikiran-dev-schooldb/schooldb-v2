-- CreateTable
CREATE TABLE "TeacherAllocation" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeacherAllocation_schoolId_idx" ON "TeacherAllocation"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherAllocation_academicYearId_teacherId_subjectId_classI_key" ON "TeacherAllocation"("academicYearId", "teacherId", "subjectId", "classId", "sectionId");

-- AddForeignKey
ALTER TABLE "TeacherAllocation" ADD CONSTRAINT "TeacherAllocation_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAllocation" ADD CONSTRAINT "TeacherAllocation_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAllocation" ADD CONSTRAINT "TeacherAllocation_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAllocation" ADD CONSTRAINT "TeacherAllocation_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAllocation" ADD CONSTRAINT "TeacherAllocation_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAllocation" ADD CONSTRAINT "TeacherAllocation_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;
