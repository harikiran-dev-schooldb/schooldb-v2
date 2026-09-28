CREATE INDEX "Teacher_schoolId_clerkId_active_idx"
ON "Teacher"("schoolId", "clerkId", "active");

CREATE INDEX "TeacherAllocation_schoolId_teacherId_active_idx"
ON "TeacherAllocation"("schoolId", "teacherId", "active");
