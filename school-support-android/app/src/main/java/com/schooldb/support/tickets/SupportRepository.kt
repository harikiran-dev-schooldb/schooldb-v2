package com.schooldb.support.tickets

import com.clerk.api.Clerk
import com.clerk.api.network.serialization.errorMessage
import com.clerk.api.network.serialization.onFailure
import com.clerk.api.network.serialization.onSuccess
import com.clerk.api.signin.SignIn
import com.schooldb.support.BuildConfig
import java.net.HttpURLConnection
import java.net.URL
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject

data class TicketDetail(
    val id: String,
    val ticketNo: String,
    val subject: String,
    val description: String,
    val status: String,
    val priority: String,
    val type: String,
    val studentName: String?,
    val studentClassName: String?,
    val studentSectionName: String?,
    val assignedToName: String?,
    val messages: List<TicketMessage>,
    val activities: List<TicketActivity>,
)

data class TicketMessage(val body: String, val author: String)
data class TicketActivity(val action: String, val detail: String, val actor: String, val createdAt: String)
data class StaffOption(val id: String, val name: String, val role: String)
data class AdminAccount(val id: String, val userId: String, val fullName: String,
    val phone: String, val role: String, val isActive: Boolean)
data class AdminAccounts(val accounts: List<AdminAccount>, val actorUserId: String)
data class TicketList(val tickets: List<TicketSummary>, val isAdmin: Boolean,
    val canManageAdmins: Boolean,
    val open: Int, val inProgress: Int, val urgent: Int, val resolved: Int,
    val page: Int, val total: Int, val totalPages: Int, val hasMore: Boolean)

data class AttentionAnalytics(
    val open: Int, val active: Int, val urgent: Int, val unassigned: Int,
    val waitingOverTwoDays: Int, val newToday: Int,
)
data class MonthAnalytics(
    val total: Int, val resolved: Int, val pending: Int,
    val resolutionRate: Double, val averageResolutionHours: Double?,
)
data class CategoryAnalytics(val type: String, val count: Int)
data class StaffWorkload(val userId: String, val name: String, val active: Int)
data class SupportAnalytics(
    val attention: AttentionAnalytics,
    val month: MonthAnalytics,
    val byType: List<CategoryAnalytics>,
    val staffWorkload: List<StaffWorkload>,
)

class SupportRepository {
    suspend fun sendCode(school: String, phone: String) = withContext(Dispatchers.IO) {
        request("POST", "api/v1/public/auth/send-otp", null,
            JSONObject().put("schoolSlug", school).put("phone", phone))
    }

    suspend fun verifyCode(school: String, phone: String, code: String): JSONObject = withContext(Dispatchers.IO) {
        request("POST", "api/v1/public/auth/verify-otp", null,
            JSONObject().put("action", "VERIFY").put("schoolSlug", school).put("phone", phone).put("otp", code))
    }

    suspend fun selectAccount(school: String, challengeId: String, accountId: String): JSONObject = withContext(Dispatchers.IO) {
        request("POST", "api/v1/public/auth/verify-otp", null,
            JSONObject().put("action", "SELECT").put("schoolSlug", school).put("challengeId", challengeId).put("accountId", accountId))
    }

    suspend fun activate(ticket: String) {
        if (BuildConfig.CLERK_PUBLISHABLE_KEY.isBlank()) error("Configure CLERK_PUBLISHABLE_KEY before signing in.")
        Clerk.isInitialized.first { it }
        if (Clerk.activeSession != null) signOut()
        var sessionId: String? = null
        var failure: String? = null
        Clerk.auth.signInWithTicket(ticket).onSuccess { signIn ->
            if (signIn.status == SignIn.Status.COMPLETE) sessionId = signIn.createdSessionId
        }.onFailure { failure = it.errorMessage }
        val id = sessionId ?: error(failure ?: "Sign-in could not be completed.")
        var active = false
        Clerk.auth.setActive(sessionId = id).onSuccess { active = true }.onFailure { failure = it.errorMessage }
        if (!active) error(failure ?: "Could not activate the session.")
    }

    suspend fun registerPushDevice(
        school: String,
        installationId: String,
        fcmToken: String,
        appVersion: String = BuildConfig.VERSION_NAME,
    ) = withContext(Dispatchers.IO) {
        request(
            "POST",
            "api/v1/support/devices",
            school,
            JSONObject()
                .put("installationId", installationId)
                .put("fcmToken", fcmToken)
                .put("appVersion", appVersion),
        )
    }

    suspend fun signOut() {
        var succeeded = false
        var failure: String? = null
        Clerk.auth.signOut().onSuccess { succeeded = true }.onFailure { failure = it.errorMessage }
        if (!succeeded) error(failure ?: "Could not sign out.")
    }

    suspend fun tickets(school: String, filter: String? = null, query: String = "", page: Int = 1): TicketList = withContext(Dispatchers.IO) {
        val params = mutableListOf<String>()
        if (!filter.isNullOrBlank() && filter != "ALL") params += "filter=" + java.net.URLEncoder.encode(filter, "UTF-8")
        if (query.isNotBlank()) params += "q=" + java.net.URLEncoder.encode(query.trim(), "UTF-8")
        params += "page=" + page
        params += "pageSize=25"
        val path = "api/v1/support/tickets?" + params.joinToString("&")
        val data = request("GET", path, school).getJSONObject("data")
        val items = data.getJSONArray("tickets")
        TicketList((0 until items.length()).map { index ->
            val item = items.getJSONObject(index)
            TicketSummary(
                id = item.getString("id"), ticketNo = item.getString("ticketNo"),
                subject = item.getString("subject"), type = TicketType.valueOf(item.getString("type")),
                priority = TicketPriority.valueOf(item.getString("priority")),
                status = TicketStatus.valueOf(item.getString("status")),
                studentName = item.optJSONObject("student")?.optString("fullName")?.takeIf(String::isNotBlank),
            )
        }, data.optBoolean("isAdmin"), data.optBoolean("canManageAdmins"), data.getJSONObject("summary").optInt("open"),
            data.getJSONObject("summary").optInt("inProgress"),
            data.getJSONObject("summary").optInt("urgent"),
            data.getJSONObject("summary").optInt("resolved"),
            data.getJSONObject("pagination").optInt("page", 1),
            data.getJSONObject("pagination").optInt("total"),
            data.getJSONObject("pagination").optInt("totalPages", 1),
            data.getJSONObject("pagination").optBoolean("hasMore"))
    }

    suspend fun detail(school: String, id: String): TicketDetail = withContext(Dispatchers.IO) {
        val item = request("GET", "api/v1/support/tickets/$id", school).getJSONObject("data")
        val messages = item.getJSONArray("messages")
        val activities = item.optJSONArray("activities") ?: JSONArray()
        TicketDetail(
            id = item.getString("id"), ticketNo = item.getString("ticketNo"),
            subject = item.getString("subject"), description = item.getString("description"),
            status = item.getString("status"), priority = item.getString("priority"),
            type = item.getString("type"),
            studentName = item.optJSONObject("student")?.optString("fullName")?.takeIf(String::isNotBlank),
            studentClassName = item.optJSONObject("student")?.optJSONArray("enrollments")
                ?.optJSONObject(0)?.optJSONObject("class")?.optString("name")?.takeIf(String::isNotBlank),
            studentSectionName = item.optJSONObject("student")?.optJSONArray("enrollments")
                ?.optJSONObject(0)?.optJSONObject("section")?.optString("name")?.takeIf(String::isNotBlank),
            assignedToName = item.optJSONObject("assignedTo")?.let { person ->
                listOf(person.optString("firstName"), person.optString("lastName"))
                    .filter { it.isNotBlank() }.joinToString(" ")
            }?.takeIf(String::isNotBlank),
            messages = (0 until messages.length()).map { index ->
                val message = messages.getJSONObject(index)
                val author = message.getJSONObject("author")
                TicketMessage(message.getString("body"),
                    listOf(author.optString("firstName"), author.optString("lastName")).filter { it.isNotBlank() }.joinToString(" ").ifBlank { "Staff" })
            },
            activities = (0 until activities.length()).map { index ->
                val activity = activities.getJSONObject(index)
                val actor = activity.getJSONObject("actor")
                TicketActivity(
                    action = activity.optString("action"),
                    detail = activity.optString("detail"),
                    actor = listOf(actor.optString("firstName"), actor.optString("lastName"))
                        .filter { it.isNotBlank() }.joinToString(" ").ifBlank { "Staff" },
                    createdAt = activity.optString("createdAt"),
                )
            },
        )
    }

    suspend fun searchStudents(school: String, query: String): List<StudentOption> = withContext(Dispatchers.IO) {
        val encoded = java.net.URLEncoder.encode(query, "UTF-8")
        val items = request("GET", "api/v1/support/students?q=$encoded", school).getJSONArray("data")
        (0 until items.length()).map { index ->
            val item = items.getJSONObject(index)
            StudentOption(item.getString("id"), item.getString("admissionNo"), item.getString("fullName"),
                item.optString("academicYearName").takeUnless { it.isBlank() || it == "null" },
                item.optString("className").takeUnless { it.isBlank() || it == "null" },
                item.optString("sectionName").takeUnless { it.isBlank() || it == "null" })
        }
    }

    suspend fun create(school: String, subject: String, description: String, type: TicketType,
        priority: TicketPriority, studentId: String?): String = withContext(Dispatchers.IO) {
        val body = JSONObject().put("subject", subject).put("description", description)
            .put("type", type.name).put("priority", priority.name).put("studentId", studentId)
        request("POST", "api/v1/support/tickets", school, body).getJSONObject("data").getString("id")
    }

    suspend fun reply(school: String, id: String, body: String) = withContext(Dispatchers.IO) {
        request("POST", "api/v1/support/tickets/$id/messages", school, JSONObject().put("body", body))
    }

    suspend fun updateStatus(school: String, id: String, status: TicketStatus) = withContext(Dispatchers.IO) {
        request("PATCH", "api/v1/support/tickets/$id", school, JSONObject().put("status", status.name))
    }

    suspend fun updatePriority(school: String, id: String, priority: TicketPriority) = withContext(Dispatchers.IO) {
        request("PATCH", "api/v1/support/tickets/$id", school, JSONObject().put("priority", priority.name))
    }

    suspend fun assign(school: String, id: String, userId: String?) = withContext(Dispatchers.IO) {
        request("PATCH", "api/v1/support/tickets/$id", school, JSONObject().put("assignedToId", userId))
    }

    suspend fun analytics(school: String): SupportAnalytics = withContext(Dispatchers.IO) {
        val data = request("GET", "api/v1/support/analytics", school).getJSONObject("data")
        val attention = data.getJSONObject("attention")
        val month = data.getJSONObject("month")
        val categories = data.getJSONArray("byType")
        val workload = data.getJSONArray("staffWorkload")
        SupportAnalytics(
            attention = AttentionAnalytics(
                open = attention.optInt("open"),
                active = attention.optInt("active"),
                urgent = attention.optInt("urgent"),
                unassigned = attention.optInt("unassigned"),
                waitingOverTwoDays = attention.optInt("waitingOverTwoDays"),
                newToday = attention.optInt("newToday"),
            ),
            month = MonthAnalytics(
                total = month.optInt("total"),
                resolved = month.optInt("resolved"),
                pending = month.optInt("pending"),
                resolutionRate = month.optDouble("resolutionRate"),
                averageResolutionHours = if (month.isNull("averageResolutionHours")) null
                    else month.optDouble("averageResolutionHours"),
            ),
            byType = (0 until categories.length()).map { index ->
                val item = categories.getJSONObject(index)
                CategoryAnalytics(item.getString("type"), item.optInt("count"))
            },
            staffWorkload = (0 until workload.length()).map { index ->
                val item = workload.getJSONObject(index)
                StaffWorkload(item.getString("userId"), item.getString("name"), item.optInt("active"))
            },
        )
    }

    suspend fun staff(school: String): List<StaffOption> = withContext(Dispatchers.IO) {
        val items = request("GET", "api/v1/support/staff", school).getJSONArray("data")
        (0 until items.length()).map { index ->
            val item = items.getJSONObject(index)
            StaffOption(item.getString("id"), item.getString("name"), item.getString("role"))
        }
    }

    suspend fun adminAccounts(school: String): AdminAccounts = withContext(Dispatchers.IO) {
        val data = request("GET", "api/v1/support/admin-accounts", school).getJSONObject("data")
        val items = data.getJSONArray("accounts")
        AdminAccounts((0 until items.length()).map { index ->
            val item = items.getJSONObject(index)
            AdminAccount(item.getString("id"), item.getString("userId"), item.getString("fullName"),
                item.optString("phone"), item.getString("role"), item.getBoolean("isActive"))
        }, data.getString("actorUserId"))
    }

    suspend fun saveAdminAccount(school: String, accountId: String?, fullName: String,
        phone: String, role: String, isActive: Boolean) = withContext(Dispatchers.IO) {
        val body = JSONObject().put("fullName", fullName).put("phone", phone)
            .put("role", role).put("isActive", isActive)
        if (accountId == null) request("POST", "api/v1/support/admin-accounts", school, body)
        else request("PATCH", "api/v1/support/admin-accounts/$accountId", school, body)
    }

    private suspend fun token(): String {
        var value: String? = null
        var failure: String? = null
        Clerk.auth.getToken().onSuccess { value = it }.onFailure { failure = it.errorMessage }
        return value?.takeIf(String::isNotBlank) ?: error(failure ?: "Session expired. Sign in again.")
    }

    private suspend fun request(method: String, path: String, school: String?, body: JSONObject? = null): JSONObject {
        val authToken = if (school != null) token() else null
        val connection = URL(BuildConfig.API_BASE_URL + path).openConnection() as HttpURLConnection
        return try {
            connection.requestMethod = method
            connection.connectTimeout = 15_000
            connection.readTimeout = 30_000
            connection.instanceFollowRedirects = false
            connection.setRequestProperty("Accept", "application/json")
            if (school != null) connection.setRequestProperty("x-school-slug", school)
            if (authToken != null) connection.setRequestProperty("Authorization", "Bearer $authToken")
            if (body != null) {
                connection.doOutput = true
                connection.setRequestProperty("Content-Type", "application/json")
                connection.outputStream.bufferedWriter().use { it.write(body.toString()) }
            }
            val status = connection.responseCode
            val payload = (if (status in 200..299) connection.inputStream else connection.errorStream)
                ?.bufferedReader()?.use { it.readText() }.orEmpty()
            val json = if (payload.isBlank()) JSONObject() else JSONObject(payload)
            if (status !in 200..299) error(json.optString("message").ifBlank { json.optString("error") }
                .ifBlank { "Request failed (HTTP $status)." })
            json
        } finally { connection.disconnect() }
    }
}
