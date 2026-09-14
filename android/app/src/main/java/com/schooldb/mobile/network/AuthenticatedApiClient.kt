package com.schooldb.mobile.network

import com.clerk.api.Clerk
import com.clerk.api.network.serialization.errorMessage
import com.clerk.api.network.serialization.onFailure
import com.clerk.api.network.serialization.onSuccess
import com.clerk.api.session.GetTokenOptions
import com.schooldb.mobile.BuildConfig
import java.net.HttpURLConnection
import java.net.URL
import org.json.JSONObject

class AuthenticatedApiClient(
    private val baseUrl: String = BuildConfig.API_BASE_URL,
) {
    suspend fun get(path: String): JSONObject = request("GET", path)

    suspend fun post(path: String, body: JSONObject): JSONObject = request("POST", path, body)

    suspend fun put(path: String, body: JSONObject): JSONObject = request("PUT", path, body)

    suspend fun delete(path: String, body: JSONObject): JSONObject = request("DELETE", path, body)

    private suspend fun request(method: String, path: String, body: JSONObject? = null): JSONObject {
        val token = sessionToken()
        val connection = URL(baseUrl + path.trimStart('/')).openConnection() as HttpURLConnection
        return try {
            connection.requestMethod = method
            connection.connectTimeout = 15_000
            connection.readTimeout = 45_000
            connection.setRequestProperty("Accept", "application/json")
            connection.setRequestProperty("Authorization", "Bearer $token")
            connection.setRequestProperty("x-school-slug", SchoolContext.schoolSlug())
            if (body != null) {
                connection.doOutput = true
                connection.setRequestProperty("Content-Type", "application/json")
                connection.outputStream.bufferedWriter().use { it.write(body.toString()) }
            }

            val status = connection.responseCode
            val stream = if (status in 200..299) connection.inputStream else connection.errorStream
            val payload = stream?.bufferedReader()?.use { it.readText() }.orEmpty()
            val json = if (payload.isBlank()) JSONObject() else JSONObject(payload)
            if (status !in 200..299) {
                val message = json.optString("message")
                    .ifBlank { json.optString("error") }
                    .ifBlank { "SchoolDB request failed (HTTP $status)." }
                throw ApiException(message)
            }
            json.getJSONObject("data")
        } finally {
            connection.disconnect()
        }
    }

    private suspend fun sessionToken(): String {
        var token: String? = null
        var failure: String? = null
        Clerk.auth
            .getToken(GetTokenOptions())
            .onSuccess { token = it }
            .onFailure { failure = it.errorMessage }
        return token?.takeIf(String::isNotBlank)
            ?: throw ApiException(failure ?: "Your session expired. Please sign in again.")
    }
}

class ApiException(message: String) : Exception(message)
