package com.schooldb.mobile.teacher

import com.schooldb.mobile.network.AuthenticatedApiClient
import java.net.URLEncoder
import java.nio.charset.StandardCharsets
import org.json.JSONArray
import org.json.JSONObject

class ResultsRepository(
    private val api: AuthenticatedApiClient = AuthenticatedApiClient(),
) {
    suspend fun loadSchedules(): List<ResultSchedule> {
        val data = api.get("api/v1/mobile/teacher/results")
        val rows = data.getJSONArray("schedules")
        return buildList {
            repeat(rows.length()) { index ->
                add(rows.getJSONObject(index).toSchedule())
            }
        }
    }

    suspend fun loadMarks(schedule: ResultSchedule): ResultSheet {
        val section = URLEncoder.encode(schedule.sectionId, StandardCharsets.UTF_8.toString())
        val data = api.get("api/v1/mobile/teacher/results/${schedule.id}?sectionId=$section")
        val rows = data.getJSONArray("students")
        val students = buildList {
            repeat(rows.length()) { index ->
                val row = rows.getJSONObject(index)
                val student = row.getJSONObject("student")
                val mark = row.getJSONObject("mark")
                val marksValue = if (mark.isNull("marksObtained")) {
                    ""
                } else {
                    mark.getDouble("marksObtained").displayNumber()
                }
                add(
                    ResultStudent(
                        enrollmentId = row.getString("studentEnrollmentId"),
                        fullName = student.getString("fullName"),
                        admissionNo = student.getString("admissionNo"),
                        rollNo = if (row.isNull("rollNo")) null else row.getInt("rollNo"),
                        marks = marksValue,
                        status = mark.optString("status", "PRESENT"),
                    ),
                )
            }
        }
        return ResultSheet(schedule, students)
    }

    suspend fun save(sheet: ResultSheet) {
        val marks = JSONArray()
        sheet.students.forEach { student ->
            marks.put(
                JSONObject()
                    .put("studentEnrollmentId", student.enrollmentId)
                    .put("status", student.status)
                    .put(
                        "marksObtained",
                        if (student.status == "PRESENT" && student.marks.isNotBlank()) {
                            student.marks.toDouble()
                        } else {
                            JSONObject.NULL
                        },
                    ),
            )
        }
        val section = URLEncoder.encode(sheet.schedule.sectionId, StandardCharsets.UTF_8.toString())
        api.put(
            "api/v1/mobile/teacher/results/${sheet.schedule.id}?sectionId=$section",
            JSONObject().put("marks", marks),
        )
    }

    private fun JSONObject.toSchedule() = ResultSchedule(
        id = getString("id"),
        sectionId = getString("sectionId"),
        examName = getString("examName"),
        examStatus = getString("examStatus"),
        className = getString("className"),
        sectionName = getString("sectionName"),
        subjectName = getString("subjectName"),
        examDate = getString("examDate").take(10),
        maxMarks = getDouble("maxMarks"),
        passMarks = if (isNull("passMarks")) null else getDouble("passMarks"),
        editable = optBoolean("editable"),
    )
}

internal fun Double.displayNumber(): String =
    if (this % 1.0 == 0.0) toInt().toString() else toString()
