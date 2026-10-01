package com.schooldb.support

import androidx.annotation.DrawableRes
import androidx.compose.ui.graphics.Color

/** Shared SchoolDB identity. The selected school is runtime session data. */
internal object SchoolBrand {
    const val schoolName = "SchoolDB"
    const val shortName = "SCHOOLDB"
    const val supportLabel = "SCHOOL SUPPORT"

    @DrawableRes
    val logoRes: Int = R.drawable.school_logo

    val primary = Color(0xFF4F46E5)
    val secondary = Color(0xFF7C3AED)
    val accent = Color(0xFFE0A62B)
    val danger = Color(0xFFC7352E)

    const val authEyebrow = "SCHOOLDB  /  SUPPORT"
    const val footer = "One support app for every SchoolDB school"
}
