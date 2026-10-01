package com.schooldb.support

import android.app.Application
import com.clerk.api.Clerk

class SupportApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        com.schooldb.support.notifications.SupportMessagingService.createChannel(this)
        if (BuildConfig.CLERK_PUBLISHABLE_KEY.isNotBlank()) {
            Clerk.initialize(this, publishableKey = BuildConfig.CLERK_PUBLISHABLE_KEY)
        }
        com.schooldb.support.notifications.SupportPushSync.enqueue(this)
    }
}
