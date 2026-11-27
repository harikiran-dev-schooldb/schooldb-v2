package com.schooldb.support

import com.schooldb.support.tickets.TicketStatus
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

internal fun validNextStatuses(current: TicketStatus): List<TicketStatus> = when (current) {
    TicketStatus.OPEN -> listOf(TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED, TicketStatus.CLOSED)
    TicketStatus.ASSIGNED -> listOf(TicketStatus.OPEN, TicketStatus.IN_PROGRESS, TicketStatus.WAITING, TicketStatus.RESOLVED, TicketStatus.CLOSED)
    TicketStatus.IN_PROGRESS -> listOf(TicketStatus.ASSIGNED, TicketStatus.WAITING, TicketStatus.RESOLVED, TicketStatus.CLOSED)
    TicketStatus.WAITING -> listOf(TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED, TicketStatus.CLOSED)
    TicketStatus.RESOLVED -> listOf(TicketStatus.REOPENED, TicketStatus.CLOSED)
    TicketStatus.CLOSED -> listOf(TicketStatus.REOPENED)
    TicketStatus.REOPENED -> listOf(TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS, TicketStatus.WAITING, TicketStatus.RESOLVED, TicketStatus.CLOSED)
}

internal fun displayAccountRole(role: String, designation: String?): String {
    if (role == "SCHOOL_ADMIN" && !designation.isNullOrBlank()) return designation
    return role.replace('_', ' ').lowercase().replaceFirstChar(Char::uppercase)
}

private val supportTimestampFormatter = DateTimeFormatter.ofPattern("dd MMM yyyy, h:mm a", Locale.ENGLISH)
    .withZone(ZoneId.of("Asia/Kolkata"))

internal fun formatSupportTimestamp(value: String): String = runCatching {
    supportTimestampFormatter.format(Instant.parse(value))
}.getOrDefault(value)

internal data class GuidedAction(val title: String, val description: String, val nextStatus: TicketStatus? = null, val assign: Boolean = false)

internal fun guidedAction(status: TicketStatus, assigned: Boolean): GuidedAction = when (status) {
    TicketStatus.OPEN, TicketStatus.REOPENED -> if (!assigned)
        GuidedAction("Assign owner", "Choose who will handle the request.", assign = true)
    else GuidedAction("Start work", "Begin investigating the request.", TicketStatus.IN_PROGRESS)
    TicketStatus.ASSIGNED -> GuidedAction("Start work", "Begin investigating the request.", TicketStatus.IN_PROGRESS)
    TicketStatus.IN_PROGRESS -> GuidedAction("Resolve ticket", "Confirm the issue has been addressed.", TicketStatus.RESOLVED)
    TicketStatus.WAITING -> GuidedAction("Resume work", "Continue after receiving the required information.", TicketStatus.IN_PROGRESS)
    TicketStatus.RESOLVED -> GuidedAction("Close ticket", "Close after confirming the resolution with the requester.", TicketStatus.CLOSED)
    TicketStatus.CLOSED -> GuidedAction("Reopen ticket", "Use this only if the issue requires further action.", TicketStatus.REOPENED)
}

internal fun preferredSupportRoles(type: String): Set<String> = when (type) {
    "FEES" -> setOf("ACCOUNTANT")
    "ACADEMIC", "STUDENT" -> setOf("TEACHER")
    "ADMINISTRATION", "STAFF", "GENERAL" -> setOf("SCHOOL_ADMIN", "RECEPTIONIST")
    else -> emptySet()
}

internal fun rankStaff(type: String, staff: List<com.schooldb.support.tickets.StaffOption>): List<com.schooldb.support.tickets.StaffOption> {
    val preferred = preferredSupportRoles(type)
    return staff.sortedWith(compareBy<com.schooldb.support.tickets.StaffOption> { if (it.role in preferred) 0 else 1 }
        .thenBy { it.activeTickets ?: Int.MAX_VALUE }.thenBy { it.name.lowercase() })
}
