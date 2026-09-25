package com.schooldb.mobile.notifications

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
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
    const val CHANNEL_ID = "school_updates"
    private const val PREFERENCES = "schooldb_push"
    private const val PERMISSION_ASKED = "permission_asked"
    private const val INSTALLATION_ID = "installation_id"
    private const val TAG = "SchoolDbPush"
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var appContext: Context? = null

    fun isConfigured() = BuildConfig.FIREBASE_CONFIGURED

    fun initialize(context: Context) {
        appContext = context.applicationContext
        createChannel(context)
    }

    private fun createChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "School updates",
                NotificationManager.IMPORTANCE_HIGH,
            ).apply {
                description = "Announcements, attendance, homework, fees, and school alerts"
                enableVibration(true)
                setShowBadge(true)
            }
            context.getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }
    }

    fun shouldRequestPermission(context: Context): Boolean =
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED &&
            !context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE).getBoolean(PERMISSION_ASKED, false)

    fun markPermissionRequested(context: Context) {
        context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE).edit().putBoolean(PERMISSION_ASKED, true).apply()
    }

    fun registerCurrentDevice() {
        if (!isConfigured()) return
        val savedInstallationId = appContext
            ?.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
            ?.getString(INSTALLATION_ID, null)
        if (!savedInstallationId.isNullOrBlank()) {
            registerInstallation(savedInstallationId)
        }
        FirebaseMessaging.getInstance().register()
            .addOnFailureListener { error ->
                Log.e(TAG, "Firebase device registration failed", error)
            }
    }

    fun registerInstallation(installationId: String) {
        if (!isConfigured() || installationId.isBlank()) return
        appContext?.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
            ?.edit()
            ?.putString(INSTALLATION_ID, installationId)
            ?.apply()
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
        val installationId = appContext
            ?.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
            ?.getString(INSTALLATION_ID, null)
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
    override fun onRegistered(installationId: String) {
        PushNotificationManager.registerInstallation(installationId)
    }

    override fun onMessageReceived(message: RemoteMessage) {
        val title = message.notification?.title ?: message.data["title"] ?: "SchoolDB update"
        val body = message.notification?.body ?: message.data["body"] ?: return
        val category = message.data["category"]
            ?.replace('_', ' ')
            ?.lowercase()
            ?.replaceFirstChar(Char::uppercase)
            ?: "School update"
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra("announcementId", message.data["announcementId"])
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            message.data["announcementId"]?.hashCode() ?: 0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val notification = NotificationCompat.Builder(this, PushNotificationManager.CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_schooldb)
            .setContentTitle(title)
            .setContentText(body)
            .setSubText(category)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setColor(android.graphics.Color.rgb(49, 84, 217))
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
            .setGroup("schooldb_updates")
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .addAction(0, "View", pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .build()
        if (
            Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
        ) {
            NotificationManagerCompat.from(this).notify(message.messageId?.hashCode() ?: System.currentTimeMillis().toInt(), notification)
        }
    }
}
