package com.schooldb.mobile.teacher

import com.schooldb.mobile.network.AuthenticatedApiClient
import org.json.JSONObject

class HomeworkRepository(
    private val api: AuthenticatedApiClient = AuthenticatedApiClient(),
) {
    suspend fun load(): Pair<List<HomeworkAllocation>, List<HomeworkItem>> {
        val data = api.get("api/v1/mobile/teacher/homework")
        val allocationsJson = data.getJSONArray("allocations")
        val allocations = buildList {
            repeat(allocationsJson.length()) { index ->
                val item = allocationsJson.getJSONObject(index)
                add(
                    HomeworkAllocation(
                        id = item.getString("id"),
                        className = item.getJSONObject("class").getString("name"),
                        sectionName = item.getJSONObject("section").getString("name"),
                        subjectName = item.getJSONObject("subject").getString("name"),
                    ),
                )
            }
        }
        val itemsJson = data.getJSONArray("items")
        val items = buildList {
            repeat(itemsJson.length()) { index ->
                val item = itemsJson.getJSONObject(index)
                add(
                    HomeworkItem(
                        id = item.getString("id"),
                        allocationId = item.optString("allocationId").takeIf { it.isNotBlank() },
                        title = item.getString("title"),
                        description = item.optString("description"),
                        assignedDate = item.getString("assignedDate").take(10),
                        dueDate = item.optString("dueDate").takeIf { it.isNotBlank() }?.take(10),
                        active = item.optBoolean("active"),
                        className = item.getJSONObject("class").getString("name"),
                        sectionName = item.optJSONObject("section")?.optString("name").orEmpty(),
                        subjectName = item.optJSONObject("subject")?.optString("name").orEmpty(),
                    ),
                )
            }
        }
        return allocations to items
    }

    suspend fun save(
        homeworkId: String?,
        allocationId: String,
        title: String,
        description: String,
        dueDate: String,
    ) {
        val body = JSONObject()
                .put("allocationId", allocationId)
                .put("title", title)
                .put("description", description)
                .put("dueDate", dueDate)
        if (homeworkId == null) {
            api.post("api/v1/mobile/teacher/homework", body)
        } else {
            api.put("api/v1/mobile/teacher/homework/$homeworkId", body)
        }
    }
}
