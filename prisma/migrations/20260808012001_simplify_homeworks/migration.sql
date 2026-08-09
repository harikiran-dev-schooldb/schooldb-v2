-- DropForeignKey
ALTER TABLE "Homework" DROP CONSTRAINT "Homework_sectionId_fkey";

-- AlterTable
ALTER TABLE "Homework" ALTER COLUMN "sectionId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Homework" ADD CONSTRAINT "Homework_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;
