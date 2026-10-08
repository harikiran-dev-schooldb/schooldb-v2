package com.schooldb.mobile.network

import android.content.Context
import java.io.File
import java.security.MessageDigest
import org.json.JSONObject

object ApiResponseCache {
    private const val DIRECTORY_NAME = "schooldb_api_cache_v2"
    private const val MAX_STALE_AGE_MILLIS = 24 * 60 * 60 * 1000L
    private const val MAX_CACHE_BYTES = 12L * 1024 * 1024
    private const val MAX_CACHE_ENTRIES = 96
    private lateinit var directory: File

    fun initialize(applicationContext: Context) {
        directory = File(applicationContext.applicationContext.cacheDir, DIRECTORY_NAME)
        directory.mkdirs()
    }

    fun read(key: String, maxAgeMillis: Long): JSONObject? = readEntry(key, maxAgeMillis)

    fun readStale(key: String): JSONObject? = readEntry(key, MAX_STALE_AGE_MILLIS)

    fun write(key: String, value: JSONObject) {
        val target = entryFile(key)
        val temporary = File(target.parentFile, "${target.name}.tmp")
        val envelope = JSONObject()
            .put("savedAt", System.currentTimeMillis())
            .put("payload", value)
            .toString()
        runCatching {
            directory.mkdirs()
            temporary.writeText(envelope, Charsets.UTF_8)
            if (!temporary.renameTo(target)) {
                target.writeText(envelope, Charsets.UTF_8)
                temporary.delete()
            }
            target.setLastModified(System.currentTimeMillis())
            prune()
        }
    }

    fun clear() {
        if (!::directory.isInitialized) return
        directory.listFiles()?.forEach(File::delete)
    }

    private fun readEntry(key: String, maxAgeMillis: Long): JSONObject? {
        if (!::directory.isInitialized) return null
        val file = entryFile(key)
        if (!file.isFile) return null
        val envelope = runCatching { JSONObject(file.readText(Charsets.UTF_8)) }
            .getOrElse {
                file.delete()
                return null
            }
        val savedAt = envelope.optLong("savedAt")
        if (savedAt == 0L || System.currentTimeMillis() - savedAt > maxAgeMillis) {
            file.delete()
            return null
        }
        file.setLastModified(System.currentTimeMillis())
        return envelope.optJSONObject("payload")
    }

    private fun entryFile(key: String) = File(directory, "${digest(key)}.json")

    private fun prune() {
        val files = directory.listFiles()
            ?.filter { it.isFile && it.extension == "json" }
            ?.sortedByDescending(File::lastModified)
            ?: return
        var retainedBytes = 0L
        var retainedEntries = 0
        files.forEach { file ->
            val canKeep = retainedEntries < MAX_CACHE_ENTRIES &&
                retainedBytes + file.length() <= MAX_CACHE_BYTES
            if (canKeep) {
                retainedEntries += 1
                retainedBytes += file.length()
            } else {
                file.delete()
            }
        }
    }

    private fun digest(value: String): String = MessageDigest.getInstance("SHA-256")
        .digest(value.toByteArray())
        .joinToString("") { "%02x".format(it) }
}
