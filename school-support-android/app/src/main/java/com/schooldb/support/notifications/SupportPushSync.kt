package com.schooldb.support.notifications

import android.content.Context
import androidx.work.*
import com.clerk.api.Clerk
import com.google.android.gms.tasks.Tasks
import com.google.firebase.messaging.FirebaseMessaging
import com.schooldb.support.BuildConfig
import com.schooldb.support.tickets.SupportRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.withTimeout
import kotlinx.coroutines.CancellationException
import java.util.UUID
import java.util.concurrent.TimeUnit

/** Persistent retries survive process death and wait until the network is available. */
class SupportPushSync(context: Context, parameters: WorkerParameters) : CoroutineWorker(context, parameters) {
    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        if (!BuildConfig.FIREBASE_CONFIGURED) return@withContext Result.success()
        val push = applicationContext.getSharedPreferences("support_push", 0)
        val session = applicationContext.getSharedPreferences("support_session", 0)
        try {
            if (push.getBoolean("delete_token", false)) {
                Tasks.await(FirebaseMessaging.getInstance().unregister(), 20, TimeUnit.SECONDS)
                push.edit().remove("delete_token").remove("pending_fcm_token").apply()
            }
            withTimeout(15_000) { Clerk.isInitialized.first { it } }
            if (Clerk.activeSession == null) {
                return@withContext if (session.getString("school", null).isNullOrBlank()) Result.success() else Result.retry()
            }
            val pendingSchool = push.getString("pending_unregister_school", null)?.takeIf(String::isNotBlank)
            val pendingInstallationId = push.getString("pending_unregister_installation_id", null)?.takeIf(String::isNotBlank)
            if (pendingSchool != null && pendingInstallationId != null) {
                SupportRepository().unregisterPushDevice(pendingSchool, pendingInstallationId)
                push.edit().remove("pending_unregister_school").remove("pending_unregister_installation_id").apply()
            }
            val school = session.getString("school", null)?.takeIf(String::isNotBlank)
                ?: return@withContext Result.success()
            val installationId = push.getString("installation_id", null) ?: UUID.randomUUID().toString().also {
                push.edit().putString("installation_id", it).apply()
            }
            // Only upload an FID delivered by FCM's successful registration callback.
            // A raw Firebase Installations ID can exist before FCM has registered it for
            // messaging, which can later fail with installation-id-not-registered.
            push.edit().remove("pending_fcm_token").apply()
            Tasks.await(FirebaseMessaging.getInstance().register(), 20, TimeUnit.SECONDS)
            val registeredFid = withTimeout(10_000) {
                while (true) {
                    push.getString("pending_fcm_token", null)
                        ?.takeIf(String::isNotBlank)
                        ?.let { return@withTimeout it }
                    delay(100)
                }
            }
            // Do not register an old account after sign-out or a school change.
            if (session.getString("school", null) != school || push.getBoolean("delete_token", false)) {
                return@withContext Result.retry()
            }
            SupportRepository().registerPushDevice(school, installationId, registeredFid)
            push.edit().remove("pending_fcm_token").apply()
            Result.success()
        } catch (_: kotlinx.coroutines.TimeoutCancellationException) {
            Result.retry()
        } catch (cancelled: CancellationException) {
            throw cancelled
        } catch (_: Exception) {
            Result.retry()
        }
    }

    companion object {
        private const val WORK_NAME = "support-push-sync-v2"

        fun enqueue(context: Context, replace: Boolean = false) {
            if (!BuildConfig.FIREBASE_CONFIGURED) return
            // v1 jobs may be deep in exponential backoff after a Firebase console
            // configuration problem. Cancel that legacy queue once and schedule the
            // corrected registration immediately without clearing app/session data.
            WorkManager.getInstance(context).cancelUniqueWork("support-push-sync")
            val work = OneTimeWorkRequestBuilder<SupportPushSync>()
                .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS).build()
            WorkManager.getInstance(context).enqueueUniqueWork(WORK_NAME,
                if (replace) ExistingWorkPolicy.REPLACE else ExistingWorkPolicy.KEEP, work)
        }
    }
}
