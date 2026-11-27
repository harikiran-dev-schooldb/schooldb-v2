package com.schooldb.support

import com.schooldb.support.tickets.SupportAnalytics

// Escape CSV delimiters and neutralize spreadsheet formula prefixes.
internal fun supportCsvCell(value: String): String {
    val trimmed = value.trimStart()
    val safe = if (trimmed.firstOrNull() in listOf('=', '+', '-', '@', '\t', '\r')) "'" + value else value
    return "\"" + safe.replace("\"", "\"\"") + "\""
}

internal fun supportMonthlyCsv(school: String, analytics: SupportAnalytics): String {
    val rows = mutableListOf(
        listOf("Section", "Metric", "Value"),
        listOf("Report", "School", school),
        listOf("Report", "Period", "Month to date"),
        listOf("Monthly", "Created", analytics.month.total.toString()),
        listOf("Monthly", "Resolved from month's requests", analytics.month.resolved.toString()),
        listOf("Monthly", "Pending from month's requests", analytics.month.pending.toString()),
        listOf("Monthly", "Resolution rate (%)", analytics.month.resolutionRate.toString()),
        listOf("Monthly", "Average response hours", analytics.month.averageResponseHours?.toString().orEmpty()),
        listOf("Monthly", "Average resolution hours", analytics.month.averageResolutionHours?.toString().orEmpty()),
        listOf("Current", "Urgent", analytics.attention.urgent.toString()),
        listOf("Current", "Unassigned", analytics.attention.unassigned.toString()),
        listOf("Current", "Waiting over 2 days", analytics.attention.waitingOverTwoDays.toString()),
    )
    analytics.byType.forEach { rows.add(listOf("Category", it.type, it.count.toString())) }
    analytics.dailyTrend.forEach { day ->
        rows.add(listOf("Daily created", day.date, day.created.toString()))
        rows.add(listOf("Daily resolved", day.date, day.resolved.toString()))
    }
    return rows.joinToString("\r\n", postfix = "\r\n") { row -> row.joinToString(",") { supportCsvCell(it) } }
}
