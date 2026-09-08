-- CreateEnum
CREATE TYPE "IdCardOrientation" AS ENUM ('PORTRAIT', 'LANDSCAPE');

-- CreateTable
CREATE TABLE "SchoolIdCardSetting" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "orientation" "IdCardOrientation" NOT NULL DEFAULT 'PORTRAIT',
    "widthMm" DECIMAL(6,2) NOT NULL DEFAULT 54.00,
    "heightMm" DECIMAL(6,2) NOT NULL DEFAULT 85.60,
    "showBack" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolIdCardSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SchoolIdCardSetting_schoolId_key" ON "SchoolIdCardSetting"("schoolId");

-- CreateIndex
CREATE INDEX "SchoolIdCardSetting_schoolId_idx" ON "SchoolIdCardSetting"("schoolId");

-- AddForeignKey
ALTER TABLE "SchoolIdCardSetting" ADD CONSTRAINT "SchoolIdCardSetting_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
