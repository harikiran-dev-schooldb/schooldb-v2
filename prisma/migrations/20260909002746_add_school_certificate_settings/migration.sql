-- CreateTable
CREATE TABLE "SchoolCertificateSetting" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "headerSubtitle" TEXT NOT NULL DEFAULT 'SchoolDB · Official record',
    "bonafideContent" TEXT NOT NULL,
    "studyContent" TEXT NOT NULL,
    "transferContent" TEXT NOT NULL,
    "footerNote" TEXT,
    "signatoryLabel" TEXT NOT NULL DEFAULT 'Principal / Head of School',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolCertificateSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SchoolCertificateSetting_schoolId_key" ON "SchoolCertificateSetting"("schoolId");

-- CreateIndex
CREATE INDEX "SchoolCertificateSetting_schoolId_idx" ON "SchoolCertificateSetting"("schoolId");

-- AddForeignKey
ALTER TABLE "SchoolCertificateSetting" ADD CONSTRAINT "SchoolCertificateSetting_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
