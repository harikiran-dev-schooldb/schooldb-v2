package com.schooldb.mobile.teacher

data class TeacherProfile(
    val schoolName: String,
    val employeeId: String,
    val fullName: String,
    val gender: String,
    val dob: String?,
    val joiningDate: String?,
    val phone: String?,
    val alternatePhone: String?,
    val email: String?,
    val qualification: String?,
    val designation: String?,
    val experience: Int?,
    val bloodGroup: String?,
    val imageUrl: String?,
    val address: String?,
    val city: String?,
    val district: String?,
    val state: String?,
    val pincode: String?,
    val classCount: Int,
    val subjectCount: Int,
    val allocations: List<ProfileAllocation>,
)

data class ProfileAllocation(
    val className: String,
    val sectionName: String,
    val subjectName: String,
)

data class ProfileUiState(
    val profile: TeacherProfile? = null,
    val loading: Boolean = true,
    val error: String? = null,
)
