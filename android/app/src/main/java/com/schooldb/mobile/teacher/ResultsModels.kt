package com.schooldb.mobile.teacher

data class ResultSchedule(
    val id: String,
    val sectionId: String,
    val examName: String,
    val examStatus: String,
    val className: String,
    val sectionName: String,
    val subjectName: String,
    val examDate: String,
    val maxMarks: Double,
    val passMarks: Double?,
    val editable: Boolean,
) {
    val classLabel: String get() = "$className · $sectionName"
}

data class ResultStudent(
    val enrollmentId: String,
    val fullName: String,
    val admissionNo: String,
    val rollNo: Int?,
    val marks: String,
    val status: String,
)

data class ResultSheet(
    val schedule: ResultSchedule,
    val students: List<ResultStudent>,
)

data class ResultsUiState(
    val schedules: List<ResultSchedule> = emptyList(),
    val sheet: ResultSheet? = null,
    val loading: Boolean = true,
    val saving: Boolean = false,
    val message: String? = null,
    val error: String? = null,
)
