package com.schooldb.mobile.teacher

import com.schooldb.mobile.network.AuthenticatedApiClient
import java.time.LocalDate
import org.json.JSONArray
import org.json.JSONObject

class TeacherRepository(
    private val api: AuthenticatedApiClient = AuthenticatedApiClient(),
) {
    suspend fun context(): MobileContext {
        val data = api.get("api/v1/mobile/context")
        return MobileContext(
            userName = data.optString("userName", "SchoolDB user"),
            schoolName = data.optString("schoolName", "SchoolDB"),
            schoolSlug = data.optString("schoolSlug"),
            role = data.optString("role", "UNKNOWN"),
        )
    }

    suspend fun dashboard(): TeacherDashboard {
        val data = api.get("api/v1/mobile/teacher/dashboard")
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
            periods = periods,
            dailyTargets = dailyTargets,
            studentGroups = studentGroups,
            upcoming = upcoming,
        )
    }

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
            title = "Daily attendance",
            subtitle = "${target.className} · Section ${target.sectionName}",
            students = students,
        )
    }

    suspend fun saveAttendance(sheet: AttendanceSheet) {
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
                .put("attendance", rows),
        )
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
                .put("attendanceDate", LocalDate.now().toString()),
        )
        return data.getString("id")
    }

    private suspend fun createDailySession(target: DailyAttendanceTarget): String {
        val data = api.post(
            "api/v1/attendance/session",
            JSONObject()
                .put("sessionType", "DAILY")
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
        attendanceSessionId = optString("attendanceSessionId").takeIf { it.isNotBlank() },
        attendanceCount = optInt("attendanceCount"),
        attendanceLocked = optBoolean("attendanceLocked"),
    )

    private fun JSONArray.toTeachingPeriods() = buildList {
        repeat(length()) { index -> add(getJSONObject(index).toTeachingPeriod()) }
    }
}
