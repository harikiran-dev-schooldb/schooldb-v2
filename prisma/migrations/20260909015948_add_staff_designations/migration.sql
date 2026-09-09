-- AlterTable
ALTER TABLE "Membership" ADD COLUMN     "designation" TEXT;

-- CreateIndex
CREATE INDEX "Membership_schoolId_isActive_role_idx" ON "Membership"("schoolId", "isActive", "role");
