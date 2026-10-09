package com.schooldb.mobile.teacher

import com.schooldb.mobile.network.AuthenticatedApiClient
import org.json.JSONArray
import org.json.JSONObject

class TeacherRepository(
    private val api: AuthenticatedApiClient = AuthenticatedApiClient(),
) {
    companion object {
        private const val DASHBOARD_CACHE_MILLIS = 2 * 60 * 1000L
        private const val CONTEXT_CACHE_MILLIS = 60 * 1000L
    }

    suspend fun context(forceRefresh: Boolean = false): MobileContext {
        val data = api.get(
            "api/v1/mobile/context?access=v1",
            cacheTtlMillis = CONTEXT_CACHE_MILLIS,
            forceRefresh = forceRefresh,
            useStaleCacheOnFailure = true,
        )
        val access = data.optJSONObject("teacherAccess")
        return MobileContext(
            userName = data.optString("userName", "SchoolDB user"),
            schoolName = data.optString("schoolName", "SchoolDB"),
            schoolSlug = data.optString("schoolSlug"),
            role = data.optString("role", "UNKNOWN"),
            canUnlockAttendance = data.optJSONObject("permissions")
                ?.optBoolean("canUnlockAttendance") == true,
            teacherAccess = access?.toTeacherAccess() ?: TeacherAccess.legacyEnabled(),
        )
    }

    suspend fun dashboard(forceRefresh: Boolean = false): TeacherDashboard {
        val data = api.get(
            "api/v1/mobile/teacher/dashboard",
            cacheTtlMillis = DASHBOARD_CACHE_MILLIS,
            forceRefresh = forceRefresh,
            useStaleCacheOnFailure = true,
        )
        val periods = data.getJSONArray("periods").toTeachingPeriods()
        val upcoming = data.optJSONObject("upcoming")?.let { item ->
            UpcomingClasses(
                date = item.getString("date"),
                day = item.getString("day"),
                periods = item.getJSONArray("periods").toTeachingPeriods(),
            )
        }
        val date = data.getString("date")
        val dailyTargetsJson = data.optJSONArray("dailyTargets") ?: JSONArray()
        val dailyTargets = buildList {
            repeat(dailyTargetsJson.length()) { index ->
                val item = dailyTargetsJson.getJSONObject(index)
                add(
                    DailyAttendanceTarget(
                        academicYearId = item.getString("academicYearId"),
                        classId = item.getString("classId"),
                        sectionId = item.getString("sectionId"),
                        className = item.getString("className"),
                        sectionName = item.getString("sectionName"),
                        date = date,
                        sessionType = item.optString("attendanceSessionType", "DAILY"),
                        attendanceSessionId = item.optString("attendanceSessionId").takeIf { it.isNotBlank() },
                        attendanceCount = item.optInt("attendanceCount"),
                        attendanceLocked = item.optBoolean("attendanceLocked"),
                    ),
                )
            }
        }

        val studentGroupsJson = data.optJSONArray("studentGroups") ?: JSONArray()
        val studentGroups = buildList {
            repeat(studentGroupsJson.length()) { groupIndex ->
                val group = studentGroupsJson.getJSONObject(groupIndex)
                val studentsJson = group.optJSONArray("students") ?: JSONArray()
                val students = buildList {
                    repeat(studentsJson.length()) { studentIndex ->
                        val item = studentsJson.getJSONObject(studentIndex)
                        add(
                            TeacherStudent(
                                studentId = item.getString("studentId"),
                                enrollmentId = item.getString("enrollmentId"),
                                admissionNo = item.optString("admissionNo"),
                                fullName = item.optString("fullName", "Student"),
                                rollNo = if (item.isNull("rollNo")) null else item.optInt("rollNo"),
                                imageUrl = item.optString("imageUrl").takeIf { it.isNotBlank() },
                                status = item.optString("status", "ACTIVE"),
                                mobileNumber = item.optString("mobileNumber").takeIf { it.isNotBlank() },
                                dateOfBirth = item.optString("dateOfBirth").takeIf { it.isNotBlank() },
                                parentName = item.optString("parentName").takeIf { it.isNotBlank() },
                            ),
                        )
                    }
                }

                add(
                    TeacherStudentGroup(
                        academicYearId = group.getString("academicYearId"),
                        classId = group.getString("classId"),
                        sectionId = group.getString("sectionId"),
                        className = group.getString("className"),
                        sectionName = group.getString("sectionName"),
                        students = students,
                    ),
                )
            }
        }

        return TeacherDashboard(
            teacherName = data.optString("teacherName", "Teacher"),
            schoolName = data.optString("schoolName", "SchoolDB"),
            date = date,
            day = data.getString("day"),
            academicYearName = data.optString("academicYearName").takeIf { it.isNotBlank() },
            attendanceMode = data.optString("attendanceMode").takeIf { it.isNotBlank() },
            teacherAccess = data.optJSONObject("teacherAccess")?.toTeacherAccess(),
            periods = periods,
            dailyTargets = dailyTargets,
            studentGroups = studentGroups,
            upcoming = upcoming,
        )
    }

    private fun JSONObject.toTeacherAccess() = TeacherAccess(
        students = optBoolean("students"),
        fees = optBoolean("fees"),
        results = optBoolean("results"),
        timetable = optBoolean("timetable"),
        attendance = optBoolean("attendance"),
        homework = optBoolean("homework"),
        exams = optBoolean("exams"),
        marksEntry = optBoolean("marksEntry"),
    )

    suspend fun openAttendance(period: TeachingPeriod): AttendanceSheet {
        val sessionId = period.attendanceSessionId ?: createSession(period)
        val data = api.get("api/v1/attendance/session/$sessionId")
        val studentsJson = data.getJSONArray("students")
        val students = buildList {
            repeat(studentsJson.length()) { index ->
                val item = studentsJson.getJSONObject(index)
                add(
                    StudentAttendance(
                        studentId = item.getString("studentId"),
                        rollNo = item.optInt("rollNo"),
                        admissionNo = item.optString("admissionNo"),
                        fullName = item.getString("fullName"),
                        status = runCatching {
                            AttendanceStatus.valueOf(item.optString("status", "PRESENT"))
                        }.getOrDefault(AttendanceStatus.PRESENT),
                    ),
                )
            }
        }
        return AttendanceSheet(
            sessionId = sessionId,
            title = period.subjectName,
            subtitle = "${period.className} · Section ${period.sectionName}",
            students = students,
        )
    }

    suspend fun openDailyAttendance(target: DailyAttendanceTarget): AttendanceSheet {
        val sessionId = target.attendanceSessionId ?: createDailySession(target)
        val data = api.get("api/v1/attendance/session/$sessionId")
        val studentsJson = data.getJSONArray("students")
        val students = buildList {
            repeat(studentsJson.length()) { index ->
                val item = studentsJson.getJSONObject(index)
                add(
                    StudentAttendance(
                        studentId = item.getString("studentId"),
                        rollNo = item.optInt("rollNo"),
                        admissionNo = item.optString("admissionNo"),
                        fullName = item.getString("fullName"),
                        status = runCatching {
                            AttendanceStatus.valueOf(item.optString("status", "PRESENT"))
                        }.getOrDefault(AttendanceStatus.PRESENT),
                    ),
                )
            }
        }
        return AttendanceSheet(
            sessionId = sessionId,
            title = when (target.sessionType) {
                "MORNING" -> "Morning attendance"
                "AFTERNOON" -> "Afternoon attendance"
                else -> "Daily attendance"
            },
            subtitle = "${target.className} · Section ${target.sectionName}",
            students = students,
        )
    }

    suspend fun saveAttendance(sheet: AttendanceSheet, finalize: Boolean = false) {
        val rows = JSONArray()
        sheet.students.forEach { student ->
            rows.put(
                JSONObject()
                    .put("studentId", student.studentId)
                    .put("status", student.status.name),
            )
        }
        api.post(
            "api/v1/attendance",
            JSONObject()
                .put("sessionId", sheet.sessionId)
                .put("finalize", finalize)
                .put("attendance", rows),
        )
    }

    suspend fun saveAndLockAttendance(sheet: AttendanceSheet) {
        saveAttendance(sheet, finalize = true)
    }

    private suspend fun createSession(period: TeachingPeriod): String {
        val data = api.post(
            "api/v1/attendance/session",
            JSONObject()
                .put("sessionType", "PERIOD")
                .put("timetableId", period.timetableId)
                .put("academicYearId", period.academicYearId)
                .put("classId", period.classId)
                .put("sectionId", period.sectionId)
                .put("attendanceDate", period.date),
        )
        return data.getString("id")
    }

    private suspend fun createDailySession(target: DailyAttendanceTarget): String {
        val data = api.post(
            "api/v1/attendance/session",
            JSONObject()
                .put("sessionType", target.sessionType)
                .put("academicYearId", target.academicYearId)
                .put("classId", target.classId)
                .put("sectionId", target.sectionId)
                .put("attendanceDate", target.date),
        )
        return data.getString("id")
    }

    private fun JSONObject.toTeachingPeriod() = TeachingPeriod(
        timetableId = getString("timetableId"),
        academicYearId = getString("academicYearId"),
        classId = getString("classId"),
        sectionId = getString("sectionId"),
        periodName = getString("periodName"),
        startTime = getString("startTime"),
        endTime = getString("endTime"),
        subjectName = getString("subjectName"),
        className = getString("className"),
        sectionName = getString("sectionName"),
        date = getString("date"),
        attendanceSessionId = optString("attendanceSessionId").takeIf { it.isNotBlank() },
        attendanceCount = optInt("attendanceCount"),
        attendanceLocked = optBoolean("attendanceLocked"),
    )

    private fun JSONArray.toTeachingPeriods() = buildList {
        repeat(length()) { index -> add(getJSONObject(index).toTeachingPeriod()) }
    }
}
