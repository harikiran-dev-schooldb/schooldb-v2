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

data class FamilyNotification(
    val id: String,
    val title: String,
    val body: String,
    val category: String,
    val priority: String,
    val targetLabel: String,
    val publishedAt: String,
    val read: Boolean,
)

data class FamilyAttendanceRecord(
    val id: String,
    val date: String,
    val sessionType: String,
    val subjectName: String?,
    val status: String,
    val remarks: String?,
)

data class FamilyAttendanceDetails(
    val total: Int,
    val present: Int,
    val absent: Int,
    val late: Int,
    val leave: Int,
    val percentage: Double,
    val records: List<FamilyAttendanceRecord>,
)

data class FamilyHomeworkDetails(
    val id: String,
    val title: String,
    val description: String?,
    val subjectName: String,
    val assignedDate: String,
    val dueDate: String?,
)

data class FamilyFeeInstallment(
    val id: String,
    val planName: String,
    val categoryName: String,
    val name: String,
    val dueDate: String,
    val payableAmount: Double,
    val paidAmount: Double,
    val outstanding: Double,
    val status: String,
)

data class FamilyFeePayment(
    val id: String,
    val receiptNo: String?,
    val paymentDate: String,
    val amount: Double,
    val paymentMode: String,
)

data class FamilyFeeDetails(
    val payable: Double,
    val paid: Double,
    val outstanding: Double,
    val installments: List<FamilyFeeInstallment>,
    val payments: List<FamilyFeePayment>,
)

data class FamilyResult(
    val id: String,
    val name: String,
    val startDate: String,
    val endDate: String,
    val obtained: Double,
    val maximum: Double,
    val percentage: Double,
    val status: String,
)

data class FamilyTimetableEntry(
    val id: String,
    val day: String,
    val periodName: String,
    val displayOrder: Int,
    val startTime: String,
    val endTime: String,
    val subjectName: String,
    val teacherName: String,
)

data class FamilyLeaveRequest(
    val id: String,
    val startDate: String,
    val endDate: String,
    val reason: String,
    val status: String,
    val decisionNote: String?,
    val createdAt: String,
)

data class FamilyCalendarEvent(
    val id: String,
    val title: String,
    val description: String?,
    val category: String,
    val startDate: String,
    val endDate: String,
    val targetLabel: String,
)

data class FamilyTransportStop(
    val id: String,
    val name: String,
    val sequence: Int?,
    val pickupTime: String?,
    val dropTime: String?,
    val monthlyFee: Double?,
)

data class FamilyTransportVehicle(
    val registrationNo: String,
    val name: String?,
    val type: String,
    val driverName: String,
    val driverPhone: String,
    val attendantName: String?,
    val attendantPhone: String?,
)

data class FamilyTransportAssignment(
    val pickupEnabled: Boolean,
    val dropEnabled: Boolean,
    val startDate: String,
    val notes: String?,
    val routeCode: String,
    val routeName: String,
    val routePickupStart: String?,
    val routeDropStart: String?,
    val stop: FamilyTransportStop,
    val vehicle: FamilyTransportVehicle?,
    val stops: List<FamilyTransportStop>,
)

data class FamilyStudentDetails(
    val attendance: FamilyAttendanceDetails?,
    val homework: List<FamilyHomeworkDetails>,
    val fees: FamilyFeeDetails,
    val results: List<FamilyResult>,
    val timetable: List<FamilyTimetableEntry>,
    val leaveRequests: List<FamilyLeaveRequest>,
    val calendarEvents: List<FamilyCalendarEvent>,
    val transport: FamilyTransportAssignment?,
)

data class FamilyUiState(
    val dashboard: FamilyDashboard? = null,
    val selectedStudentId: String? = null,
    val loading: Boolean = true,
    val error: String? = null,
    val details: FamilyStudentDetails? = null,
    val detailsLoading: Boolean = false,
    val detailsError: String? = null,
    val leaveSaving: Boolean = false,
    val leaveMessage: String? = null,
    val notifications: List<FamilyNotification> = emptyList(),
    val unreadNotificationCount: Int = 0,
    val notificationsLoading: Boolean = false,
    val notificationsError: String? = null,
)
