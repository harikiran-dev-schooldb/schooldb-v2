package com.schooldb.support.tickets

enum class TicketType { STUDENT, STAFF, ACADEMIC, MAINTENANCE, IT, ADMINISTRATION, FEES, TRANSPORT, GENERAL }
enum class TicketPriority { LOW, NORMAL, HIGH, URGENT }
enum class TicketStatus { OPEN, ASSIGNED, IN_PROGRESS, WAITING, RESOLVED, CLOSED, REOPENED }

fun ticketTypeOrDefault(value: String): TicketType =
    TicketType.entries.firstOrNull { it.name == value } ?: TicketType.GENERAL

fun ticketPriorityOrDefault(value: String): TicketPriority =
    TicketPriority.entries.firstOrNull { it.name == value } ?: TicketPriority.NORMAL

fun ticketStatusOrDefault(value: String): TicketStatus =
    TicketStatus.entries.firstOrNull { it.name == value } ?: TicketStatus.OPEN

data class StudentOption(
    val id: String,
    val admissionNo: String,
    val fullName: String,
    val academicYearName: String?,
    val syllabusName: String?,
    val branchName: String?,
    val className: String?,
    val sectionName: String?,
)

data class TicketSummary(
    val id: String,
    val ticketNo: String,
    val subject: String,
    val type: TicketType,
    val priority: TicketPriority,
    val status: TicketStatus,
    val source: String = "STAFF",
    val student: StudentOption? = null,
    val studentName: String? = null,
)

data class PendingAttachment(
    val name: String,
    val mimeType: String,
    val bytes: ByteArray,
)

data class TicketDraft(
    val subject: String = "",
    val description: String = "",
    val type: TicketType = TicketType.GENERAL,
    val priority: TicketPriority = TicketPriority.NORMAL,
    val selectedStudent: StudentOption? = null,
    val attachment: PendingAttachment? = null,
)

data class AccountSwitchChoice(
    val id: String,
    val name: String,
    val role: String,
    val detail: String,
    val current: Boolean,
)

data class TicketAttachment(
    val id: String,
    val name: String,
    val mimeType: String,
    val sizeBytes: Int,
)

data class TicketDiagnostics(
    val appVersion: String?,
    val appBuild: String?,
    val deviceModel: String?,
    val manufacturer: String?,
    val androidVersion: String?,
)

data class SupportAccountProfile(
    val userName: String,
    val schoolName: String,
    val schoolSlug: String,
    val role: String,
    val designation: String?,
    val phone: String?,
    val email: String?,
)
