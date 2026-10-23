package com.schooldb.support.tickets

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

data class PendingSupportReply(
    val key: String,
    val school: String,
    val ticketId: String,
    val body: String,
    val isInternal: Boolean,
)

class SupportReplyOutbox(context: Context) {
    private val preferences = context.getSharedPreferences("support_reply_outbox", Context.MODE_PRIVATE)

    fun draft(school: String, ticketId: String): String =
        preferences.getString("draft:$school:$ticketId", "").orEmpty()

    fun setDraft(school: String, ticketId: String, body: String) {
        preferences.edit().apply {
            if (body.isBlank()) remove("draft:$school:$ticketId") else putString("draft:$school:$ticketId", body)
        }.apply()
    }

    fun enqueue(school: String, ticketId: String, body: String, isInternal: Boolean) {
        val items = pending().toMutableList()
        val key = "$school:$ticketId:${System.currentTimeMillis()}"
        items += PendingSupportReply(key, school, ticketId, body, isInternal)
        save(items)
        setDraft(school, ticketId, "")
    }

    fun pending(): List<PendingSupportReply> = runCatching {
        val array = JSONArray(preferences.getString("pending", "[]"))
        (0 until array.length()).map { index ->
            val item = array.getJSONObject(index)
            PendingSupportReply(
                item.getString("key"), item.getString("school"), item.getString("ticketId"),
                item.getString("body"), item.optBoolean("isInternal"),
            )
        }
    }.getOrDefault(emptyList())

    fun remove(key: String) = save(pending().filterNot { it.key == key })

    private fun save(items: List<PendingSupportReply>) {
        val array = JSONArray()
        items.forEach { item ->
            array.put(JSONObject().put("key", item.key).put("school", item.school)
                .put("ticketId", item.ticketId).put("body", item.body).put("isInternal", item.isInternal))
        }
        preferences.edit().putString("pending", array.toString()).apply()
    }
}
