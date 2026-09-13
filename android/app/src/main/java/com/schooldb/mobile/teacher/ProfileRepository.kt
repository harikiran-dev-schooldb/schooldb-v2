package com.schooldb.mobile.teacher

import com.schooldb.mobile.network.AuthenticatedApiClient
import org.json.JSONObject

class ProfileRepository(
    private val api: AuthenticatedApiClient = AuthenticatedApiClient(),
) {
    suspend fun load(): TeacherProfile {
        val data = api.get("api/v1/mobile/teacher/profile")
        val teacher = data.getJSONObject("teacher")
        val summary = data.getJSONObject("summary")
        val rows = data.getJSONArray("allocations")
        val allocations = buildList {
            repeat(rows.length()) { index ->
                val row = rows.getJSONObject(index)
                add(
                    ProfileAllocation(
                        className = row.getString("className"),
                        sectionName = row.getString("sectionName"),
                        subjectName = row.getString("subjectName"),
                    ),
                )
            }
        }
        return TeacherProfile(
            schoolName = data.getString("schoolName"),
            employeeId = teacher.getString("employeeId"),
            fullName = teacher.getString("fullName"),
            gender = teacher.getString("gender"),
            dob = teacher.optionalString("dob")?.take(10),
            joiningDate = teacher.optionalString("joiningDate")?.take(10),
            phone = teacher.optionalString("phone"),
            alternatePhone = teacher.optionalString("alternatePhone"),
            email = teacher.optionalString("email"),
            qualification = teacher.optionalString("qualification"),
            designation = teacher.optionalString("designation"),
            experience = if (teacher.isNull("experience")) null else teacher.getInt("experience"),
            bloodGroup = teacher.optionalString("bloodGroup"),
            imageUrl = teacher.optionalString("imageUrl"),
            address = teacher.optionalString("address"),
            city = teacher.optionalString("city"),
            district = teacher.optionalString("district"),
            state = teacher.optionalString("state"),
            pincode = teacher.optionalString("pincode"),
            classCount = summary.optInt("classCount"),
            subjectCount = summary.optInt("subjectCount"),
            allocations = allocations,
        )
    }

    private fun JSONObject.optionalString(key: String): String? =
        if (isNull(key)) null else optString(key).takeIf { it.isNotBlank() }
}
