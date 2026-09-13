package com.schooldb.mobile.teacher

data class MobileContext(
    val userName: String,
    val schoolName: String,
    val schoolSlug: String,
    val role: String,
)

data class TeacherDashboard(
    val teacherName: String,
    val schoolName: String,
    val date: String,
    val day: String,
    val academicYearName: String?,
    val attendanceMode: String?,
    val periods: List<TeachingPeriod>,
    val dailyTargets: List<DailyAttendanceTarget>,
    val studentGroups: List<TeacherStudentGroup>,
    val upcoming: UpcomingClasses?,
)

data class DailyAttendanceTarget(
    val academicYearId: String,
    val classId: String,
    val sectionId: String,
    val className: String,
    val sectionName: String,
    val date: String,
    val attendanceSessionId: String?,
    val attendanceCount: Int,
    val attendanceLocked: Boolean,
)

data class UpcomingClasses(
    val date: String,
    val day: String,
    val periods: List<TeachingPeriod>,
)

data class TeachingPeriod(
    val timetableId: String,
    val academicYearId: String,
    val classId: String,
    val sectionId: String,
    val periodName: String,
    val startTime: String,
    val endTime: String,
    val subjectName: String,
    val className: String,
    val sectionName: String,
    val attendanceSessionId: String?,
    val attendanceCount: Int,
    val attendanceLocked: Boolean,
)

enum class AttendanceStatus { PRESENT, ABSENT, LATE, LEAVE }

data class StudentAttendance(
    val studentId: String,
    val rollNo: Int,
    val admissionNo: String,
    val fullName: String,
    val status: AttendanceStatus,
)

data class AttendanceSheet(
    val sessionId: String,
    val title: String,
    val subtitle: String,
    val students: List<StudentAttendance>,
)

data class TeacherUiState(
    val context: MobileContext? = null,
    val dashboard: TeacherDashboard? = null,
    val attendanceSheet: AttendanceSheet? = null,
    val loading: Boolean = true,
    val saving: Boolean = false,
    val message: String? = null,
    val error: String? = null,
)
