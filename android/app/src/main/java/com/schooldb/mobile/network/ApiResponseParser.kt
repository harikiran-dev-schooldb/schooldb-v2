package com.schooldb.mobile.network

import org.json.JSONObject

/** Converts the API envelope into data without leaking HTML or JSON parser errors to the UI. */
internal object ApiResponseParser {
    fun parse(payload: String, status: Int, contentType: String?): JSONObject {
        if (payload.isBlank()) {
            if (status in 200..299) return JSONObject()
            throw ApiException(httpMessage(status), status)
        }

        val json = runCatching { JSONObject(payload) }.getOrElse {
            val looksLikeHtml = contentType?.contains("text/html", ignoreCase = true) == true ||
                payload.trimStart().startsWith("<")
            val message = when {
                status == 401 || status == 403 -> "Your session expired. Please sign in again."
                looksLikeHtml -> "SchoolDB is temporarily unavailable. Please try again."
                else -> "SchoolDB returned an invalid response. Please try again."
            }
            throw ApiException(message, status)
        }

        if (status !in 200..299) {
            val message = json.optString("message")
                .ifBlank { json.optString("error") }
                .ifBlank { httpMessage(status) }
            throw ApiException(message, status)
        }

        return json.optJSONObject("data")
            ?: throw ApiException(
                "SchoolDB returned an incomplete response. Please try again.",
                status,
            )
    }

    private fun httpMessage(status: Int) = when (status) {
        401, 403 -> "Your session expired. Please sign in again."
        404 -> "The requested SchoolDB record was not found."
        in 500..599 -> "SchoolDB is temporarily unavailable. Please try again."
        else -> "SchoolDB request failed (HTTP $status)."
    }
}
