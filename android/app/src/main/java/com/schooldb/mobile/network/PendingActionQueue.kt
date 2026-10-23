package com.schooldb.mobile.network

import android.content.Context
import androidx.core.content.edit
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.clerk.api.Clerk
import java.io.IOException
import java.util.UUID
import java.util.concurrent.TimeUnit
import org.json.JSONArray
import org.json.JSONObject

/** Persistent, account-scoped queue for safe teacher writes made during a connection failure. */
object PendingActionQueue {
    private const val PREFERENCES = "schooldb_pending_actions"
    private const val ACTIONS = "actions"
    private const val WORK_NAME = "schooldb-pending-actions-v1"
    private val lock = Any()
    private var applicationContext: Context? = null

    fun initialize(context: Context) {
        applicationContext = context.applicationContext
        enqueueSync()
    }

    fun enqueue(method: String, path: String, body: JSONObject) {
        val context = applicationContext ?: return
        val userId = Clerk.activeUser?.id?.takeIf(String::isNotBlank) ?: return
        val schoolSlug = runCatching { SchoolContext.schoolSlug() }.getOrNull() ?: return
        synchronized(lock) {
            val actions = read(context)
            actions.put(
                JSONObject()
                    .put("id", UUID.randomUUID().toString())
                    .put("method", method)
                    .put("path", path)
                    .put("body", body)
                    .put("userId", userId)
                    .put("schoolSlug", schoolSlug)
                    .put("createdAt", System.currentTimeMillis()),
            )
            write(context, actions)
        }
        enqueueSync()
    }

    internal fun next(context: Context, userId: String, schoolSlug: String): JSONObject? = synchronized(lock) {
        val actions = read(context)
        (0 until actions.length())
            .map(actions::getJSONObject)
            .firstOrNull {
                it.optString("userId") == userId && it.optString("schoolSlug") == schoolSlug
            }
    }

    internal fun remove(context: Context, id: String) = synchronized(lock) {
        val source = read(context)
        val kept = JSONArray()
        repeat(source.length()) { index ->
            source.getJSONObject(index).takeIf { it.optString("id") != id }?.let(kept::put)
        }
        write(context, kept)
    }

    internal fun count(context: Context): Int = synchronized(lock) { read(context).length() }

    private fun read(context: Context): JSONArray {
        val raw = context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
            .getString(ACTIONS, "[]") ?: "[]"
        return runCatching { JSONArray(raw) }.getOrDefault(JSONArray())
    }

    private fun write(context: Context, actions: JSONArray) {
        context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE).edit {
            putString(ACTIONS, actions.toString())
        }
    }

    private fun enqueueSync() {
        val context = applicationContext ?: return
        val request = OneTimeWorkRequestBuilder<PendingActionWorker>()
            .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
            .build()
        WorkManager.getInstance(context).enqueueUniqueWork(
            WORK_NAME,
            ExistingWorkPolicy.KEEP,
            request,
        )
    }
}

class PendingActionWorker(context: Context, parameters: WorkerParameters) :
    CoroutineWorker(context, parameters) {
    override suspend fun doWork(): Result {
        val userId = Clerk.activeUser?.id?.takeIf(String::isNotBlank) ?: return Result.success()
        val schoolSlug = runCatching { SchoolContext.schoolSlug() }.getOrNull() ?: return Result.success()
        val api = AuthenticatedApiClient()
        repeat(50) {
            val action = PendingActionQueue.next(applicationContext, userId, schoolSlug)
                ?: return Result.success()
            try {
                api.replay(
                    method = action.getString("method"),
                    path = action.getString("path"),
                    body = action.getJSONObject("body"),
                )
                PendingActionQueue.remove(applicationContext, action.getString("id"))
            } catch (error: Exception) {
                val retryable = error is IOException || (error is ApiException && error.isRetryable)
                if (retryable) return Result.retry()
                PendingActionQueue.remove(applicationContext, action.getString("id"))
            }
        }
        return if (PendingActionQueue.count(applicationContext) > 0) Result.retry() else Result.success()
    }
}
