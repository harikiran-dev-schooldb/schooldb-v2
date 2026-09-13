package com.schooldb.mobile.auth

import com.schooldb.mobile.BuildConfig
import java.net.HttpURLConnection
import java.net.URL
import org.json.JSONObject

class AuthRepository(
    private val baseUrl: String = BuildConfig.API_BASE_URL,
) {
    fun sendOtp(schoolSlug: String, phone: String) {
        post(
            path = "api/v1/public/auth/send-otp",
            body = JSONObject()
                .put("schoolSlug", schoolSlug)
                .put("phone", phone),
        )
    }

    fun verifyOtp(schoolSlug: String, phone: String, otp: String): VerifyResult {
        val response = post(
            path = "api/v1/public/auth/verify-otp",
            body = JSONObject()
                .put("action", "VERIFY")
                .put("schoolSlug", schoolSlug)
                .put("phone", phone)
                .put("otp", otp),
        )
        return response.toVerifyResult()
    }

    fun selectAccount(schoolSlug: String, challengeId: String, accountId: String): VerifyResult {
        val response = post(
            path = "api/v1/public/auth/verify-otp",
            body = JSONObject()
                .put("action", "SELECT")
                .put("schoolSlug", schoolSlug)
                .put("challengeId", challengeId)
                .put("accountId", accountId),
        )
        return response.toVerifyResult()
    }

    private fun post(path: String, body: JSONObject): JSONObject {
        val connection = URL(baseUrl + path).openConnection() as HttpURLConnection
        return try {
            connection.requestMethod = "POST"
            connection.connectTimeout = 15_000
            connection.readTimeout = 45_000
            connection.doOutput = true
            connection.setRequestProperty("Content-Type", "application/json")
            connection.outputStream.bufferedWriter().use { it.write(body.toString()) }

            val status = connection.responseCode
            val stream = if (status in 200..299) connection.inputStream else connection.errorStream
            val payload = stream?.bufferedReader()?.use { it.readText() }.orEmpty()
            val json = if (payload.isBlank()) JSONObject() else JSONObject(payload)
            if (status !in 200..299) {
                throw AuthException(json.optString("error", "Something went wrong. Please try again."))
            }
            json
        } finally {
            connection.disconnect()
        }
    }

    private fun JSONObject.toVerifyResult(): VerifyResult {
        if (optBoolean("requiresAccountSelection")) {
            val items = getJSONArray("accounts")
            val accounts = buildList {
                repeat(items.length()) { index ->
                    val account = items.getJSONObject(index)
                    add(
                        SchoolAccount(
                            id = account.getString("id"),
                            name = account.optString("name", "SchoolDB user"),
                            role = account.optString("role", "Member"),
                        ),
                    )
                }
            }
            return VerifyResult.ChooseAccount(
                challengeId = getString("challengeId"),
                accounts = accounts,
            )
        }
        val token = optString("token")
        if (token.isBlank()) throw AuthException("The server did not return a sign-in token.")
        return VerifyResult.SignedIn(token)
    }
}

class AuthException(message: String) : Exception(message)
