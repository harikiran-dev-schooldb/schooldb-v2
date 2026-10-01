package com.schooldb.support.tickets

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

data class CachedTicketList(
    val result: TicketList,
    val savedAt: Long,
)

/** A small, private cache for the first ticket page so the dashboard can open immediately. */
class SupportTicketCache(context: Context) {
    private val preferences = context.applicationContext
        .getSharedPreferences("support_ticket_cache", Context.MODE_PRIVATE)

    fun read(school: String): CachedTicketList? = runCatching {
        val payload = preferences.getString(key(school), null) ?: return null
        val root = JSONObject(payload)
        val savedAt = root.getLong("savedAt")
        if (System.currentTimeMillis() - savedAt > MAX_CACHE_AGE_MS) {
            clear(school)
            return null
        }
        val items = root.getJSONArray("tickets")
        val tickets = (0 until items.length()).map { index ->
            val item = items.getJSONObject(index)
            TicketSummary(
                id = item.getString("id"),
                ticketNo = item.getString("ticketNo"),
                subject = item.getString("subject"),
                type = ticketTypeOrDefault(item.optString("type")),
                priority = ticketPriorityOrDefault(item.optString("priority")),
                status = ticketStatusOrDefault(item.optString("status")),
                source = item.optString("source", "STAFF"),
                studentName = item.optString("studentName").takeIf(String::isNotBlank),
            )
        }
        CachedTicketList(
            result = TicketList(
                tickets = tickets,
                isAdmin = root.optBoolean("isAdmin"),
                canManageAdmins = root.optBoolean("canManageAdmins"),
                open = root.optInt("open"),
                inProgress = root.optInt("inProgress"),
                urgent = root.optInt("urgent"),
                resolved = root.optInt("resolved"),
                page = 1,
                total = root.optInt("total", tickets.size),
                totalPages = root.optInt("totalPages", 1),
                hasMore = root.optInt("totalPages", 1) > 1,
            ),
            savedAt = savedAt,
        )
    }.getOrNull()

    fun write(school: String, result: TicketList) {
        val tickets = JSONArray().apply {
            result.tickets.forEach { ticket ->
                put(JSONObject().apply {
                    put("id", ticket.id)
                    put("ticketNo", ticket.ticketNo)
                    put("subject", ticket.subject)
                    put("type", ticket.type.name)
                    put("priority", ticket.priority.name)
                    put("status", ticket.status.name)
                    put("source", ticket.source)
                    put("studentName", ticket.studentName.orEmpty())
                })
            }
        }
        val payload = JSONObject().apply {
            put("savedAt", System.currentTimeMillis())
            put("tickets", tickets)
            put("isAdmin", result.isAdmin)
            put("canManageAdmins", result.canManageAdmins)
            put("open", result.open)
            put("inProgress", result.inProgress)
            put("urgent", result.urgent)
            put("resolved", result.resolved)
            put("total", result.total)
            put("totalPages", result.totalPages)
        }
        preferences.edit().putString(key(school), payload.toString()).apply()
    }

    fun clear(school: String) {
        preferences.edit().remove(key(school)).apply()
    }

    private fun key(school: String) = "tickets_${school.lowercase()}"

    private companion object {
        const val MAX_CACHE_AGE_MS = 24L * 60L * 60L * 1_000L
    }
}
