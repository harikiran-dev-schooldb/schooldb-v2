package com.schooldb.support.tickets

import android.content.Context
import java.util.UUID
import org.json.JSONArray
import org.json.JSONObject

data class PendingSupportReply(
    val key: String,
    val userId: String,
    val school: String,
    val ticketId: String,
    val body: String,
    val isInternal: Boolean,
)

class SupportReplyOutbox(context: Context) {
    private val preferences = context.getSharedPreferences("support_reply_outbox", Context.MODE_PRIVATE)

    fun draft(userId: String, school: String, ticketId: String): String =
        preferences.getString(supportReplyDraftKey(userId, school, ticketId), "").orEmpty()

    fun setDraft(userId: String, school: String, ticketId: String, body: String) {
        val key = supportReplyDraftKey(userId, school, ticketId)
        preferences.edit().apply {
            if (body.isBlank()) remove(key) else putString(key, body)
        }.apply()
    }

    fun enqueue(userId: String, school: String, ticketId: String, body: String, isInternal: Boolean) {
        require(userId.isNotBlank()) { "A signed-in user is required to queue a reply." }
        val items = pending().toMutableList()
        val key = "${supportReplyOwnerKey(userId, school)}:$ticketId:${UUID.randomUUID()}"
        items += PendingSupportReply(key, userId, school, ticketId, body, isInternal)
        save(items)
        setDraft(userId, school, ticketId, "")
    }

    fun pending(): List<PendingSupportReply> = runCatching {
        val array = JSONArray(preferences.getString("pending", "[]"))
        (0 until array.length()).map { index ->
            val item = array.getJSONObject(index)
            PendingSupportReply(
                item.getString("key"), item.getString("userId"), item.getString("school"), item.getString("ticketId"),
                item.getString("body"), item.optBoolean("isInternal"),
            )
        }
    }.getOrDefault(emptyList())

    fun remove(key: String) = save(pending().filterNot { it.key == key })

    private fun save(items: List<PendingSupportReply>) {
        val array = JSONArray()
        items.forEach { item ->
            array.put(JSONObject().put("key", item.key).put("userId", item.userId).put("school", item.school)
                .put("ticketId", item.ticketId).put("body", item.body).put("isInternal", item.isInternal))
        }
        preferences.edit().putString("pending", array.toString()).apply()
    }
}

internal fun supportReplyOwnerKey(userId: String, school: String) =
    "${userId.trim().lowercase()}:${school.trim().lowercase()}"

internal fun supportReplyDraftKey(userId: String, school: String, ticketId: String) =
    "draft:v2:${supportReplyOwnerKey(userId, school)}:${ticketId.trim()}"
