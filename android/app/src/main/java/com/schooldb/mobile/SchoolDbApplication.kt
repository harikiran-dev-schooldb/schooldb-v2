package com.schooldb.mobile

import android.app.Application
import com.clerk.api.Clerk

class SchoolDbApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        if (BuildConfig.CLERK_PUBLISHABLE_KEY.isNotBlank()) {
            Clerk.initialize(this, publishableKey = BuildConfig.CLERK_PUBLISHABLE_KEY)
        }
    }
}
