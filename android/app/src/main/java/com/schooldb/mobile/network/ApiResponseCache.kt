package com.schooldb.mobile.network

import android.content.Context
import java.security.MessageDigest
import org.json.JSONObject

object ApiResponseCache {
    private const val FILE_NAME = "schooldb_api_cache"
    private const val MAX_STALE_AGE_MILLIS = 24 * 60 * 60 * 1000L
    private lateinit var context: Context

    fun initialize(applicationContext: Context) {
        context = applicationContext.applicationContext
    }

    fun read(key: String, maxAgeMillis: Long): JSONObject? = readEntry(key, maxAgeMillis)

    fun readStale(key: String): JSONObject? = readEntry(key, MAX_STALE_AGE_MILLIS)

    fun write(key: String, value: JSONObject) {
        preferences().edit()
            .putString(valueKey(key), value.toString())
            .putLong(timeKey(key), System.currentTimeMillis())
            .apply()
    }

    private fun readEntry(key: String, maxAgeMillis: Long): JSONObject? {
        if (!::context.isInitialized) return null
        val values = preferences()
        val savedAt = values.getLong(timeKey(key), 0L)
        if (savedAt == 0L || System.currentTimeMillis() - savedAt > maxAgeMillis) return null
        return values.getString(valueKey(key), null)?.let { runCatching { JSONObject(it) }.getOrNull() }
    }

    private fun preferences() = context.getSharedPreferences(FILE_NAME, Context.MODE_PRIVATE)

    private fun valueKey(key: String) = "value_${digest(key)}"
    private fun timeKey(key: String) = "time_${digest(key)}"

    private fun digest(value: String): String = MessageDigest.getInstance("SHA-256")
        .digest(value.toByteArray())
        .joinToString("") { "%02x".format(it) }
}
