package com.schooldb.mobile

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.schooldb.mobile.ui.SchoolDbApp
import com.schooldb.mobile.ui.theme.SchoolDbTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            SchoolDbTheme {
                SchoolDbApp()
            }
        }
    }
}
