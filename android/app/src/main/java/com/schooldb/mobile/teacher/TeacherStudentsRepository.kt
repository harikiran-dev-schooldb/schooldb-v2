package com.schooldb.mobile.teacher

import com.schooldb.mobile.network.AuthenticatedApiClient
import java.net.URLEncoder
import java.nio.charset.StandardCharsets

class TeacherStudentsRepository(
    private val api: AuthenticatedApiClient = AuthenticatedApiClient(),
) {
    suspend fun students(option: TeacherClassOption): List<TeacherStudent> {
        fun encode(value: String) =
            URLEncoder.encode(value, StandardCharsets.UTF_8.toString())

        val data = api.get(
            "api/v1/mobile/teacher/students" +
                "?academicYearId=${encode(option.academicYearId)}" +
                "&classId=${encode(option.classId)}" +
                "&sectionId=${encode(option.sectionId)}",
        )

        val rows = data.getJSONArray("students")
        return buildList {
            repeat(rows.length()) { index ->
                val item = rows.getJSONObject(index)
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
    }
}
