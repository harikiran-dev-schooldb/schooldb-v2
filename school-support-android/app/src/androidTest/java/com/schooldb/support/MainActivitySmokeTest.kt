package com.schooldb.support

import androidx.compose.ui.test.junit4.v2.createAndroidComposeRule
import androidx.compose.ui.test.onRoot
import androidx.test.ext.junit.runners.AndroidJUnit4
import android.view.WindowManager
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class MainActivitySmokeTest {
    @get:Rule
    val composeRule = createAndroidComposeRule<MainActivity>()

    @Test
    fun applicationRootRenders() {
        composeRule.waitForIdle()
        composeRule.onRoot().fetchSemanticsNode()
    }

    @Test
    fun sensitiveContentIsProtectedFromScreenshots() {
        val flags = composeRule.activity.window.attributes.flags
        assertTrue(flags and WindowManager.LayoutParams.FLAG_SECURE != 0)
    }
}
