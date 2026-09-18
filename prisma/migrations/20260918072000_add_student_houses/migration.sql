CREATE TABLE "House" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT,
  "color" TEXT,
  "description" TEXT,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "House_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudentHouse" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "academicYearId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "studentEnrollmentId" TEXT NOT NULL,
  "houseId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudentHouse_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "House_schoolId_name_key" ON "House"("schoolId", "name");
CREATE UNIQUE INDEX "House_schoolId_code_key" ON "House"("schoolId", "code");
CREATE INDEX "House_schoolId_active_displayOrder_idx" ON "House"("schoolId", "active", "displayOrder");
CREATE UNIQUE INDEX "StudentHouse_studentEnrollmentId_key" ON "StudentHouse"("studentEnrollmentId");
CREATE UNIQUE INDEX "StudentHouse_academicYearId_studentId_key" ON "StudentHouse"("academicYearId", "studentId");
CREATE INDEX "StudentHouse_schoolId_academicYearId_houseId_idx" ON "StudentHouse"("schoolId", "academicYearId", "houseId");
CREATE INDEX "StudentHouse_schoolId_studentId_idx" ON "StudentHouse"("schoolId", "studentId");

ALTER TABLE "House" ADD CONSTRAINT "House_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentHouse" ADD CONSTRAINT "StudentHouse_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentHouse" ADD CONSTRAINT "StudentHouse_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentHouse" ADD CONSTRAINT "StudentHouse_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentHouse" ADD CONSTRAINT "StudentHouse_studentEnrollmentId_fkey" FOREIGN KEY ("studentEnrollmentId") REFERENCES "StudentEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentHouse" ADD CONSTRAINT "StudentHouse_houseId_fkey" FOREIGN KEY ("houseId") REFERENCES "House"("id") ON DELETE CASCADE ON UPDATE CASCADE;
