package com.schooldb.mobile.teacher

import com.schooldb.mobile.network.AuthenticatedApiClient
import org.json.JSONObject

class NoticeRepository(
    private val api: AuthenticatedApiClient = AuthenticatedApiClient(),
) {
    suspend fun load(): Pair<Int, List<NoticeItem>> {
        val data = api.get("api/v1/mobile/teacher/notices")
        val rows = data.getJSONArray("items")
        val items = buildList {
            repeat(rows.length()) { index ->
                val item = rows.getJSONObject(index)
                add(
                    NoticeItem(
                        id = item.getString("id"),
                        title = item.getString("title"),
                        body = item.getString("body"),
                        category = item.optString("category", "GENERAL"),
                        priority = item.optString("priority", "NORMAL"),
                        targetLabel = item.optString("targetLabel", "School"),
                        publishedAt = item.getString("publishedAt"),
                        read = item.optBoolean("read"),
                    ),
                )
            }
        }
        return data.optInt("unreadCount") to items
    }

    suspend fun markRead(id: String) {
        api.post("api/v1/mobile/teacher/notices", JSONObject().put("id", id))
    }
}
