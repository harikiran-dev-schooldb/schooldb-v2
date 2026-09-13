package com.schooldb.mobile.teacher

data class TeacherStudent(
    val studentId: String,
    val enrollmentId: String,
    val admissionNo: String,
    val fullName: String,
    val rollNo: Int?,
    val imageUrl: String?,
    val status: String,
)

data class TeacherStudentGroup(
    val academicYearId: String,
    val classId: String,
    val sectionId: String,
    val className: String,
    val sectionName: String,
    val students: List<TeacherStudent>,
)
