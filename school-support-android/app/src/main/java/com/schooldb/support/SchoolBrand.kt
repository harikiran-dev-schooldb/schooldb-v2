package com.schooldb.support

import androidx.annotation.DrawableRes
import androidx.compose.ui.graphics.Color

/**
 * Single source of truth for school-specific presentation.
 *
 * Keep support features school-agnostic. A school build should only need to change
 * the BuildConfig brand fields and the brand_logo drawable.
 */
internal object SchoolBrand {
    val schoolName: String get() = BuildConfig.BRAND_SCHOOL_NAME
    val shortName: String get() = BuildConfig.BRAND_SHORT_NAME
    val location: String get() = BuildConfig.BRAND_LOCATION
    val supportLabel: String get() = BuildConfig.BRAND_SUPPORT_LABEL
    val defaultSchoolSlug: String get() = BuildConfig.DEFAULT_SCHOOL_SLUG

    @DrawableRes
    val logoRes: Int = R.drawable.kotak_school_logo

    val primary = Color(BuildConfig.BRAND_PRIMARY_COLOR.toULong())
    val secondary = Color(BuildConfig.BRAND_SECONDARY_COLOR.toULong())
    val accent = Color(BuildConfig.BRAND_ACCENT_COLOR.toULong())
    val danger = Color(BuildConfig.BRAND_DANGER_COLOR.toULong())

    val authEyebrow: String get() = "$schoolName  /  SUPPORT"
    val footer: String get() = listOf(schoolName, location).filter { it.isNotBlank() }.joinToString(" · ")
}
