package com.schooldb.support.notifications

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.pm.PackageManager
import android.content.Intent
import android.os.Build
import androidx.core.content.ContextCompat
import androidx.core.content.edit
import androidx.core.net.toUri
import androidx.core.app.NotificationCompat
import com.clerk.api.Clerk
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.schooldb.support.MainActivity
import com.schooldb.support.tickets.SupportRepository
import java.util.UUID
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class SupportMessagingService : FirebaseMessagingService() {
    @Suppress("OVERRIDE_DEPRECATION", "DEPRECATION")
    override fun onNewToken(token: String) {
        super.onNewToken(token)
        SupportPushSync.enqueue(this, replace = true)
    }

    override fun onRegistered(installationId: String) {
        val pushPreferences = getSharedPreferences("support_push", MODE_PRIVATE)
        pushPreferences.edit { putString("pending_fcm_token", installationId) }
        SupportPushSync.enqueue(this)
    }

    override fun onUnregistered(installationId: String) {
        getSharedPreferences("support_push", MODE_PRIVATE).edit {
            remove("pending_fcm_token")
        }
    }

    override fun onMessageReceived(message: RemoteMessage) {
        // Explicit logout clears the school preference. Ignore any stale FCM delivery
        // that arrives before Firebase rotates/deletes the previous token.
        val school = getSharedPreferences("support_session", MODE_PRIVATE)
            .getString("school", null)?.takeIf(String::isNotBlank) ?: return

        val messageSchool = message.data["schoolSlug"]
        if (messageSchool != school) return

        val title = message.data["title"] ?: message.notification?.title ?: "School Support"
        val body = message.data["body"] ?: message.notification?.body ?: "A support ticket was updated."
        val ticketId = message.data["ticketId"]?.takeIf(String::isNotBlank) ?: return
        val ticketNo = message.data["ticketNo"]?.takeIf(String::isNotBlank) ?: "Support ticket"
        val urgent = message.data["priority"]?.uppercase() == "URGENT"
        updates.value = school to (updates.value.second + 1)
        getSharedPreferences("support_push", MODE_PRIVATE).edit {
            putLong("updated_at", System.currentTimeMillis())
        }

        val manager = getSystemService(NotificationManager::class.java)
        createChannel(this)

        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra("ticketId", ticketId)
            putExtra("schoolSlug", school)
            data = "school-support://ticket/$school/$ticketId".toUri()
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            ticketId.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val channelId = if (urgent) URGENT_CHANNEL_ID else CHANNEL_ID
        val notification = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(com.schooldb.support.R.drawable.ic_support_notification)
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setGroup("support-$school")
            .setGroupAlertBehavior(NotificationCompat.GROUP_ALERT_CHILDREN)
            .setContentTitle(title)
            .setContentText(body)
            .setSubText(ticketNo)
            .setStyle(NotificationCompat.BigTextStyle()
                .setBigContentTitle(title)
                .bigText(body)
                .setSummaryText(ticketNo))
            .setColor(android.graphics.Color.rgb(79, 70, 229))
            .setAutoCancel(true)
            .setOnlyAlertOnce(true)
            .setShowWhen(true)
            .setContentIntent(pendingIntent)
            .addAction(0, "Open ticket", pendingIntent)
            .setPriority(if (urgent) NotificationCompat.PRIORITY_HIGH else NotificationCompat.PRIORITY_DEFAULT)
            .build()

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
        ) {
            manager.notify("$school:$ticketId", 0, notification)
        }
    }

    companion object {
        const val CHANNEL_ID = "support_updates_v2"
        const val URGENT_CHANNEL_ID = "support_urgent_v2"
        val updates = kotlinx.coroutines.flow.MutableStateFlow("" to 0L)

        fun createChannel(context: android.content.Context) {
            context.getSystemService(NotificationManager::class.java).createNotificationChannels(
                listOf(
                    NotificationChannel(CHANNEL_ID, "Support updates", NotificationManager.IMPORTANCE_DEFAULT).apply {
                        description = "Ticket assignments, replies and status updates"
                        enableVibration(true)
                        setShowBadge(true)
                    },
                    NotificationChannel(URGENT_CHANNEL_ID, "Urgent support alerts", NotificationManager.IMPORTANCE_HIGH).apply {
                        description = "Time-sensitive support ticket updates"
                        enableVibration(true)
                        setShowBadge(true)
                    },
                )
            )
        }
    }
}
