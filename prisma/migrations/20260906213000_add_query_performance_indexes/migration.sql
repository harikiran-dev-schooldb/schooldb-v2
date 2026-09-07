-- Targeted indexes for the application's most frequent tenant-scoped list,
-- history, and bulk conflict queries.
CREATE INDEX "Student_schoolId_status_createdAt_idx"
ON "Student"("schoolId", "status", "createdAt");

CREATE INDEX "Section_classId_active_displayOrder_idx"
ON "Section"("classId", "active", "displayOrder");

CREATE INDEX "StudentEnrollment_schoolId_academicYearId_active_idx"
ON "StudentEnrollment"("schoolId", "academicYearId", "active");

CREATE INDEX "Teacher_schoolId_active_fullName_idx"
ON "Teacher"("schoolId", "active", "fullName");

CREATE INDEX "TeacherAllocation_schoolId_active_academicYearId_idx"
ON "TeacherAllocation"("schoolId", "active", "academicYearId");

CREATE INDEX "Timetable_schoolId_academicYearId_day_periodId_idx"
ON "Timetable"("schoolId", "academicYearId", "day", "periodId");

CREATE INDEX "Homework_schoolId_active_assignedDate_idx"
ON "Homework"("schoolId", "active", "assignedDate");

CREATE INDEX "FeePayment_schoolId_status_paymentDate_idx"
ON "FeePayment"("schoolId", "status", "paymentDate");

CREATE INDEX "StudentActivity_studentId_createdAt_idx"
ON "StudentActivity"("studentId", "createdAt");
