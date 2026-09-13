package com.schooldb.mobile

import android.app.Application
import com.clerk.api.Clerk
import com.schooldb.mobile.preferences.AppPreferences

class SchoolDbApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        AppPreferences.initialize(this)
        if (BuildConfig.CLERK_PUBLISHABLE_KEY.isNotBlank()) {
            Clerk.initialize(this, publishableKey = BuildConfig.CLERK_PUBLISHABLE_KEY)
        }
    }
}
