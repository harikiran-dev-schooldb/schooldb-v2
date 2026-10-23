package com.schooldb.mobile

import android.content.Intent
import android.os.Bundle
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.mutableStateOf
import com.schooldb.mobile.ui.SchoolDbApp
import com.schooldb.mobile.ui.theme.SchoolDbTheme

class MainActivity : ComponentActivity() {
    private val openNotificationId = mutableStateOf<String?>(null)
    private val openNotificationDestination = mutableStateOf<String?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
        openNotificationId.value = intent.getStringExtra("announcementId")
        openNotificationDestination.value = intent.getStringExtra("destination")
        enableEdgeToEdge()
        setContent {
            SchoolDbTheme {
                SchoolDbApp(
                    openNotificationId = openNotificationId.value,
                    openNotificationDestination = openNotificationDestination.value,
                    onNotificationOpened = {
                        openNotificationId.value = null
                        openNotificationDestination.value = null
                    },
                )
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        openNotificationId.value = intent.getStringExtra("announcementId")
        openNotificationDestination.value = intent.getStringExtra("destination")
    }
}
