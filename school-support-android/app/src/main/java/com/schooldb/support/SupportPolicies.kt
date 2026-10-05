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
