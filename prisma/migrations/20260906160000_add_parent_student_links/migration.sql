-- CreateTable
CREATE TABLE "ParentStudentLink" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "parentUserId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "relationship" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParentStudentLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ParentStudentLink_schoolId_parentUserId_studentId_key"
ON "ParentStudentLink"("schoolId", "parentUserId", "studentId");

CREATE INDEX "ParentStudentLink_schoolId_parentUserId_active_idx"
ON "ParentStudentLink"("schoolId", "parentUserId", "active");

CREATE INDEX "ParentStudentLink_schoolId_studentId_active_idx"
ON "ParentStudentLink"("schoolId", "studentId", "active");

ALTER TABLE "ParentStudentLink"
ADD CONSTRAINT "ParentStudentLink_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ParentStudentLink"
ADD CONSTRAINT "ParentStudentLink_parentUserId_fkey"
FOREIGN KEY ("parentUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ParentStudentLink"
ADD CONSTRAINT "ParentStudentLink_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
