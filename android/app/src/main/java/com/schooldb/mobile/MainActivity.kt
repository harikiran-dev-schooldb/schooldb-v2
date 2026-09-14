package com.schooldb.mobile

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.schooldb.mobile.preferences.AppPreferences
import com.schooldb.mobile.preferences.ThemePreference
import com.schooldb.mobile.ui.SchoolDbApp
import com.schooldb.mobile.ui.theme.SchoolDbTheme

class MainActivity : ComponentActivity() {
    private val openNotificationId = mutableStateOf<String?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        openNotificationId.value = intent.getStringExtra("announcementId")
        enableEdgeToEdge()
        setContent {
            val preferences by AppPreferences.state.collectAsStateWithLifecycle()
            val darkTheme = when (preferences.theme) {
                ThemePreference.SYSTEM -> isSystemInDarkTheme()
                ThemePreference.LIGHT -> false
                ThemePreference.DARK -> true
            }
            SchoolDbTheme(darkTheme = darkTheme) {
                SchoolDbApp(
                    openNotificationId = openNotificationId.value,
                    onNotificationOpened = { openNotificationId.value = null },
                )
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        openNotificationId.value = intent.getStringExtra("announcementId")
    }
}
