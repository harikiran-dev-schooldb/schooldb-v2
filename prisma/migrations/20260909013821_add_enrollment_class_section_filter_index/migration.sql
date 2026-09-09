-- CreateIndex
CREATE INDEX "StudentEnrollment_schoolId_active_classId_sectionId_idx" ON "StudentEnrollment"("schoolId", "active", "classId", "sectionId");
