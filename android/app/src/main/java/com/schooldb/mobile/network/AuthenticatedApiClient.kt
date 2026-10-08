package com.schooldb.mobile.network

import com.clerk.api.Clerk
import com.clerk.api.network.serialization.errorMessage
import com.clerk.api.network.serialization.onFailure
import com.clerk.api.network.serialization.onSuccess
import com.schooldb.mobile.BuildConfig
import java.net.HttpURLConnection
import java.net.URL
import java.io.IOException
import java.util.UUID
import kotlinx.coroutines.delay
import org.json.JSONObject

class AuthenticatedApiClient(
    private val baseUrl: String = BuildConfig.API_BASE_URL,
) {
    companion object {
        private const val CONNECT_TIMEOUT_MILLIS = 10_000
        private const val READ_TIMEOUT_MILLIS = 25_000
        private const val GET_ATTEMPTS = 2
        private const val RETRY_DELAY_MILLIS = 250L
    }

    suspend fun get(
        path: String,
        cacheTtlMillis: Long = 0L,
        forceRefresh: Boolean = false,
        useStaleCacheOnFailure: Boolean = cacheTtlMillis > 0L,
    ): JSONObject {
        if (cacheTtlMillis <= 0L && !useStaleCacheOnFailure) return request("GET", path)
        val userId = Clerk.activeUser?.id
            ?: throw ApiException("Your session expired. Please sign in again.")
        val cacheKey = apiCacheKey(userId, SchoolContext.schoolSlug(), path)
        if (!forceRefresh && cacheTtlMillis > 0L) {
            ApiResponseCache.read(cacheKey, cacheTtlMillis)?.let { return it }
        }
        return try {
            retryingGet(path).also { ApiResponseCache.write(cacheKey, it) }
        } catch (error: Exception) {
            val canUseOfflineCopy = error is IOException ||
                (error is ApiException && error.isRetryable)
            if (useStaleCacheOnFailure && canUseOfflineCopy) {
                ApiResponseCache.readStale(cacheKey) ?: throw error
            } else {
                throw error
            }
        }
    }

    suspend fun post(path: String, body: JSONObject): JSONObject = request("POST", path, body)

    suspend fun put(path: String, body: JSONObject): JSONObject = request("PUT", path, body)

    suspend fun delete(path: String, body: JSONObject): JSONObject = request("DELETE", path, body)

    private suspend fun retryingGet(path: String): JSONObject {
        var lastFailure: Exception? = null
        repeat(GET_ATTEMPTS) { attempt ->
            try {
                return request("GET", path)
            } catch (error: Exception) {
                val retryable = error is IOException ||
                    (error is ApiException && error.isRetryable)
                if (!retryable || attempt == GET_ATTEMPTS - 1) throw error
                lastFailure = error
                delay(RETRY_DELAY_MILLIS * (attempt + 1))
            }
        }
        throw lastFailure ?: IOException("SchoolDB request failed.")
    }

    private suspend fun request(method: String, path: String, body: JSONObject? = null): JSONObject {
        val token = sessionToken()
        val connection = URL(baseUrl + path.trimStart('/')).openConnection() as HttpURLConnection
        return try {
            connection.requestMethod = method
            connection.instanceFollowRedirects = false
            connection.connectTimeout = CONNECT_TIMEOUT_MILLIS
            connection.readTimeout = READ_TIMEOUT_MILLIS
            connection.useCaches = false
            connection.setRequestProperty("Accept", "application/json")
            connection.setRequestProperty("Authorization", "Bearer $token")
            connection.setRequestProperty("x-school-slug", SchoolContext.schoolSlug())
            connection.setRequestProperty("X-Request-Id", UUID.randomUUID().toString())
            connection.setRequestProperty("X-SchoolDB-Client", "android/${BuildConfig.VERSION_NAME}")
            if (body != null) {
                val bytes = body.toString().toByteArray(Charsets.UTF_8)
                connection.doOutput = true
                connection.setRequestProperty("Content-Type", "application/json")
                connection.setFixedLengthStreamingMode(bytes.size)
                connection.outputStream.use { it.write(bytes) }
            }

            val status = connection.responseCode
            if (status in 300..399 && connection.getHeaderField("Location")?.contains("/login") == true) {
                throw ApiException("Your session expired. Please sign in again.", 401)
            }
            val stream = if (status in 200..299) connection.inputStream else connection.errorStream
            val payload = stream?.bufferedReader()?.use { it.readText() }.orEmpty()
            ApiResponseParser.parse(
                payload = payload,
                status = status,
                contentType = connection.contentType,
            )
        } finally {
            connection.disconnect()
        }
    }

    private suspend fun sessionToken(): String {
        var token: String? = null
        var failure: String? = null
        Clerk.auth
            .getToken()
            .onSuccess { token = it }
            .onFailure { failure = it.errorMessage }
        return token?.takeIf(String::isNotBlank)
            ?: throw ApiException(failure ?: "Your session expired. Please sign in again.")
    }
}

class ApiException(
    message: String,
    val statusCode: Int? = null,
) : Exception(message) {
    val isRetryable: Boolean
        get() = statusCode == 408 || statusCode == 429 || statusCode in 500..599
}

internal fun apiCacheKey(userId: String, schoolSlug: String, path: String): String =
    "$userId|$schoolSlug|${path.trimStart('/')}"
