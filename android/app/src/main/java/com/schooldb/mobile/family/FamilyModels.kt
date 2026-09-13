package com.schooldb.mobile.family

data class FamilyHomework(
    val id: String,
    val title: String,
    val subjectName: String,
    val dueDate: String,
)

data class FamilyStudent(
    val id: String,
    val fullName: String,
    val admissionNo: String,
    val relationship: String,
    val className: String?,
    val sectionName: String?,
    val academicYearName: String?,
    val rollNo: Int?,
    val attendanceAttended: Int,
    val attendanceTotal: Int,
    val attendancePercentage: Double?,
    val pendingHomeworkCount: Int,
    val recentHomework: List<FamilyHomework>,
    val outstandingFee: Double,
    val completedResultCount: Int,
)

data class FamilyDashboard(
    val role: String,
    val userName: String,
    val schoolName: String,
    val students: List<FamilyStudent>,
)

data class FamilyUiState(
    val dashboard: FamilyDashboard? = null,
    val selectedStudentId: String? = null,
    val loading: Boolean = true,
    val error: String? = null,
)
