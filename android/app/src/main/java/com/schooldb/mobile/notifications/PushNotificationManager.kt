package com.schooldb.mobile.notifications

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.core.content.edit
import com.google.firebase.messaging.FirebaseMessaging
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.schooldb.mobile.BuildConfig
import com.schooldb.mobile.MainActivity
import com.schooldb.mobile.R
import com.schooldb.mobile.network.AuthenticatedApiClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import org.json.JSONObject

object PushNotificationManager {
    const val CHANNEL_ID = "school_updates_v2"
    const val URGENT_CHANNEL_ID = "school_urgent_v2"
    private const val PREFERENCES = "schooldb_push"
    private const val PERMISSION_ASKED = "permission_asked"
    private const val INSTALLATION_ID = "installation_id"
    private const val TAG = "SchoolDbPush"
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var sharedPreferences: SharedPreferences? = null

    fun isConfigured() = BuildConfig.FIREBASE_CONFIGURED

    fun initialize(context: Context) {
        sharedPreferences = context.applicationContext
            .getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
        createChannels(context)
    }

    private fun createChannels(context: Context) {
        val updates = NotificationChannel(
            CHANNEL_ID, "School updates", NotificationManager.IMPORTANCE_DEFAULT,
        ).apply {
            description = "Announcements, attendance, homework, fees, and everyday school updates"
            enableVibration(true)
            setShowBadge(true)
        }
        val urgent = NotificationChannel(
            URGENT_CHANNEL_ID, "Urgent school alerts", NotificationManager.IMPORTANCE_HIGH,
        ).apply {
            description = "Time-sensitive and urgent updates from your school"
            enableVibration(true)
            setShowBadge(true)
        }
        context.getSystemService(NotificationManager::class.java)
            .createNotificationChannels(listOf(updates, urgent))
    }

    fun shouldRequestPermission(context: Context): Boolean =
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED &&
            !context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE).getBoolean(PERMISSION_ASKED, false)

    fun markPermissionRequested(context: Context) {
        context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE).edit {
            putBoolean(PERMISSION_ASKED, true)
        }
    }

    fun permissionWasRequested(context: Context): Boolean =
        context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
            .getBoolean(PERMISSION_ASKED, false)

    fun registerCurrentDevice() {
        if (!isConfigured()) return
        FirebaseMessaging.getInstance().register()
            .addOnSuccessListener {
                Log.i(TAG, "Firebase device registration succeeded")
            }
            .addOnFailureListener { error ->
                Log.e(TAG, "Firebase device registration failed", error)
            }
    }

    fun registerInstallation(installationId: String) {
        if (!isConfigured() || installationId.isBlank()) return
        sharedPreferences?.edit { putString(INSTALLATION_ID, installationId) }
        scope.launch {
            runCatching {
                AuthenticatedApiClient().post(
                    "api/v1/mobile/push/devices",
                    JSONObject()
                        .put("installationId", installationId)
                        .put("appVersion", BuildConfig.VERSION_NAME),
                )
            }.onSuccess {
                Log.i(TAG, "SchoolDB device registration succeeded")
            }.onFailure { error ->
                Log.e(TAG, "SchoolDB device registration failed", error)
            }
        }
    }

    suspend fun unregisterCurrentDevice() {
        if (!isConfigured()) return
        val installationId = sharedPreferences?.getString(INSTALLATION_ID, null)
            ?: return
        runCatching {
            AuthenticatedApiClient().delete(
                "api/v1/mobile/push/devices",
                JSONObject().put("installationId", installationId),
            )
        }
    }
}

class SchoolDbMessagingService : FirebaseMessagingService() {
    @Suppress("DEPRECATION")
    @Deprecated("Required by Firebase for legacy token rotation callbacks")
    override fun onNewToken(token: String) {
        // FCM still emits this callback for token rotation. Registration uses
        // the installation ID delivered by onRegistered.
        PushNotificationManager.registerCurrentDevice()
    }

    override fun onRegistered(installationId: String) {
        PushNotificationManager.registerInstallation(installationId)
    }

    override fun onMessageReceived(message: RemoteMessage) {
        val title = message.data["title"] ?: message.notification?.title ?: "SchoolDB update"
        val body = message.data["body"] ?: message.notification?.body ?: return
        val categoryKey = message.data["category"]?.uppercase() ?: "SCHOOL"
        val category = notificationCategoryLabel(categoryKey)
        val urgent = message.data["priority"]?.uppercase() == "URGENT"
        val announcementId = message.data["announcementId"]
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra("announcementId", announcementId)
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            announcementId?.hashCode() ?: 0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val channelId = if (urgent) PushNotificationManager.URGENT_CHANNEL_ID else PushNotificationManager.CHANNEL_ID
        val notification = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(R.drawable.ic_schooldb)
            .setContentTitle(title)
            .setContentText(body)
            .setSubText(category)
            .setStyle(NotificationCompat.BigTextStyle()
                .setBigContentTitle(title)
                .bigText(body)
                .setSummaryText(category))
            .setColor(notificationAccent(categoryKey))
            .setCategory(notificationSystemCategory(categoryKey))
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
            .setGroup("schooldb_updates")
            .setGroupAlertBehavior(NotificationCompat.GROUP_ALERT_CHILDREN)
            .setAutoCancel(true)
            .setOnlyAlertOnce(true)
            .setShowWhen(true)
            .setContentIntent(pendingIntent)
            .addAction(0, "Open SchoolDB", pendingIntent)
            .setPriority(if (urgent) NotificationCompat.PRIORITY_HIGH else NotificationCompat.PRIORITY_DEFAULT)
            .build()
        if (
            Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
        ) {
            val tag = announcementId ?: message.messageId ?: "schooldb-${System.currentTimeMillis()}"
            NotificationManagerCompat.from(this).notify(tag, 0, notification)
        }
    }

    private fun notificationCategoryLabel(category: String) = when (category) {
        "LEAVE_REQUEST" -> "Leave request"
        "ATTENDANCE", "ATTENDANCE_SUMMARY" -> "Attendance"
        "HOMEWORK" -> "Homework"
        "FEES" -> "Fees & payments"
        "EXAM" -> "Exams & results"
        "BIRTHDAY" -> "Birthday"
        "SUPPORT" -> "School support"
        else -> category.replace('_', ' ').lowercase().replaceFirstChar(Char::uppercase)
    }

    private fun notificationAccent(category: String) = when (category) {
        "ATTENDANCE", "ATTENDANCE_SUMMARY" -> android.graphics.Color.rgb(5, 150, 105)
        "FEES" -> android.graphics.Color.rgb(217, 119, 6)
        "LEAVE_REQUEST" -> android.graphics.Color.rgb(124, 58, 237)
        "HOMEWORK" -> android.graphics.Color.rgb(37, 99, 235)
        "EXAM" -> android.graphics.Color.rgb(219, 39, 119)
        "BIRTHDAY" -> android.graphics.Color.rgb(234, 88, 12)
        else -> android.graphics.Color.rgb(79, 70, 229)
    }

    private fun notificationSystemCategory(category: String) = when (category) {
        "ATTENDANCE", "ATTENDANCE_SUMMARY", "FEES" -> NotificationCompat.CATEGORY_STATUS
        "HOMEWORK", "EXAM", "BIRTHDAY" -> NotificationCompat.CATEGORY_EVENT
        else -> NotificationCompat.CATEGORY_MESSAGE
    }
}
