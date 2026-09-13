package com.schooldb.mobile.preferences

import android.content.Context
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

enum class ThemePreference {
    SYSTEM,
    LIGHT,
    DARK,
}

enum class StartTabPreference {
    HOME,
    ATTENDANCE,
}

data class AppPreferenceState(
    val theme: ThemePreference = ThemePreference.SYSTEM,
    val showNoticeBadges: Boolean = true,
    val startTab: StartTabPreference = StartTabPreference.HOME,
)

object AppPreferences {
    private const val FILE_NAME = "schooldb_preferences"
    private const val KEY_THEME = "theme"
    private const val KEY_NOTICE_BADGES = "show_notice_badges"
    private const val KEY_START_TAB = "start_tab"

    private lateinit var context: Context
    private val mutableState = MutableStateFlow(AppPreferenceState())
    val state: StateFlow<AppPreferenceState> = mutableState.asStateFlow()

    fun initialize(applicationContext: Context) {
        context = applicationContext.applicationContext
        mutableState.value = read()
    }

    fun setTheme(value: ThemePreference) {
        preferences().edit().putString(KEY_THEME, value.name).apply()
        mutableState.value = mutableState.value.copy(theme = value)
    }

    fun setNoticeBadges(value: Boolean) {
        preferences().edit().putBoolean(KEY_NOTICE_BADGES, value).apply()
        mutableState.value = mutableState.value.copy(showNoticeBadges = value)
    }

    fun setStartTab(value: StartTabPreference) {
        preferences().edit().putString(KEY_START_TAB, value.name).apply()
        mutableState.value = mutableState.value.copy(startTab = value)
    }

    fun reset() {
        preferences().edit().clear().apply()
        mutableState.value = AppPreferenceState()
    }

    private fun read(): AppPreferenceState {
        val values = preferences()
        return AppPreferenceState(
            theme = values.getString(KEY_THEME, null)
                ?.let { runCatching { ThemePreference.valueOf(it) }.getOrNull() }
                ?: ThemePreference.SYSTEM,
            showNoticeBadges = values.getBoolean(KEY_NOTICE_BADGES, true),
            startTab = values.getString(KEY_START_TAB, null)
                ?.let { runCatching { StartTabPreference.valueOf(it) }.getOrNull() }
                ?: StartTabPreference.HOME,
        )
    }

    private fun preferences() =
        context.getSharedPreferences(FILE_NAME, Context.MODE_PRIVATE)
}
