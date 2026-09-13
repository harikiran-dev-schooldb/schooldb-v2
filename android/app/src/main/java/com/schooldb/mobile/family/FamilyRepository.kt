package com.schooldb.mobile.family

import com.schooldb.mobile.network.AuthenticatedApiClient
import org.json.JSONArray

class FamilyRepository(
    private val api: AuthenticatedApiClient = AuthenticatedApiClient(),
) {
    suspend fun dashboard(): FamilyDashboard {
        val data = api.get("api/v1/mobile/family/dashboard")
        val studentsJson = data.optJSONArray("students") ?: JSONArray()
        val students = buildList {
            repeat(studentsJson.length()) { index ->
                val item = studentsJson.getJSONObject(index)
                val enrollment = item.optJSONObject("enrollment")
                val attendance = item.getJSONObject("attendance")
                val homeworkJson = item.optJSONArray("recentHomework") ?: JSONArray()
                val homework = buildList {
                    repeat(homeworkJson.length()) { homeworkIndex ->
                        val row = homeworkJson.getJSONObject(homeworkIndex)
                        add(
                            FamilyHomework(
                                id = row.getString("id"),
                                title = row.optString("title", "Homework"),
                                subjectName = row.optString("subjectName", "General"),
                                dueDate = row.optString("dueDate"),
                            ),
                        )
                    }
                }

                add(
                    FamilyStudent(
                        id = item.getString("id"),
                        fullName = item.optString("fullName", "Student"),
                        admissionNo = item.optString("admissionNo"),
                        relationship = item.optString("relationship", "Student"),
                        className = enrollment?.optString("className")?.takeIf(String::isNotBlank),
                        sectionName = enrollment?.optString("sectionName")?.takeIf(String::isNotBlank),
                        academicYearName = enrollment?.optString("academicYearName")?.takeIf(String::isNotBlank),
                        rollNo = enrollment?.takeUnless { it.isNull("rollNo") }?.optInt("rollNo"),
                        attendanceAttended = attendance.optInt("attended"),
                        attendanceTotal = attendance.optInt("total"),
                        attendancePercentage = attendance.takeUnless { it.isNull("percentage") }
                            ?.optDouble("percentage"),
                        pendingHomeworkCount = item.optInt("pendingHomeworkCount"),
                        recentHomework = homework,
                        outstandingFee = item.optDouble("outstandingFee"),
                        completedResultCount = item.optInt("completedResultCount"),
                    ),
                )
            }
        }

        return FamilyDashboard(
            role = data.optString("role", "PARENT"),
            userName = data.optString("userName", "SchoolDB user"),
            schoolName = data.optString("schoolName", "SchoolDB"),
            students = students,
        )
    }
}
