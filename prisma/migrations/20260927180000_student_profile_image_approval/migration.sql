CREATE TABLE "StudentProfileImageRequest" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "originalName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentProfileImageRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudentProfileImageRequest_studentId_key"
ON "StudentProfileImageRequest"("studentId");

CREATE INDEX "StudentProfileImageRequest_schoolId_createdAt_idx"
ON "StudentProfileImageRequest"("schoolId", "createdAt");

CREATE INDEX "StudentProfileImageRequest_requestedByUserId_idx"
ON "StudentProfileImageRequest"("requestedByUserId");

ALTER TABLE "StudentProfileImageRequest"
ADD CONSTRAINT "StudentProfileImageRequest_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudentProfileImageRequest"
ADD CONSTRAINT "StudentProfileImageRequest_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudentProfileImageRequest"
ADD CONSTRAINT "StudentProfileImageRequest_requestedByUserId_fkey"
FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
