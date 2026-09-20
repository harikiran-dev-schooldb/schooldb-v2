package com.schooldb.support.notifications

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.pm.PackageManager
import android.content.Intent
import android.os.Build
import androidx.core.content.ContextCompat
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
    override fun onNewToken(token: String) {
        val pushPreferences = getSharedPreferences("support_push", MODE_PRIVATE)
        pushPreferences.edit().putString("pending_fcm_token", token).apply()
        val school = getSharedPreferences("support_session", MODE_PRIVATE)
            .getString("school", null)?.takeIf(String::isNotBlank) ?: return
        if (Clerk.activeSession == null) return
        val installationId = pushPreferences.getString("installation_id", null)
            ?: UUID.randomUUID().toString().also {
                pushPreferences.edit().putString("installation_id", it).apply()
            }
        CoroutineScope(Dispatchers.IO).launch {
            runCatching { SupportRepository().registerPushDevice(school, installationId, token) }
                .onSuccess {
                    if (pushPreferences.getString("pending_fcm_token", null) == token) {
                        pushPreferences.edit().remove("pending_fcm_token").apply()
                    }
                }
        }
    }

    override fun onMessageReceived(message: RemoteMessage) {
        val title = message.notification?.title ?: "School Support"
        val body = message.notification?.body ?: "A support ticket was updated."
        val ticketId = message.data["ticketId"]

        val manager = getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(
            NotificationChannel(
                CHANNEL_ID,
                "Support tickets",
                NotificationManager.IMPORTANCE_HIGH,
            ).apply {
                description = "Ticket assignments, replies and status updates"
            },
        )

        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            ticketId?.let { putExtra("ticketId", it) }
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            ticketId?.hashCode() ?: 0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .build()

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
        ) {
            manager.notify(message.messageId?.hashCode() ?: System.currentTimeMillis().toInt(), notification)
        }
    }

    companion object {
        const val CHANNEL_ID = "support_tickets"
    }
}
