package com.schooldb.mobile.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

private val RoyalBlue = Color(0xFF4F46E5)
private val ElectricViolet = Color(0xFF7C3AED)
private val Ink = Color(0xFF0F172A)
private val Mist = Color(0xFFF5F7FC)
private val Ice = Color(0xFFEEF2FF)

private val LightColors = lightColorScheme(
    primary = RoyalBlue,
    onPrimary = Color.White,
    primaryContainer = Ice,
    onPrimaryContainer = Color(0xFF172D84),
    secondary = ElectricViolet,
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFEDE8FF),
    onSecondaryContainer = Color(0xFF34216E),
    tertiary = Color(0xFF008B83),
    background = Mist,
    onBackground = Ink,
    surface = Color.White,
    onSurface = Ink,
    surfaceContainerLowest = Color.White,
    surfaceContainerLow = Color(0xFFFBFCFF),
    surfaceContainer = Color(0xFFF8FAFF),
    surfaceContainerHigh = Color.White,
    surfaceContainerHighest = Color(0xFFF1F4FA),
    surfaceVariant = Color(0xFFF0F3FA),
    onSurfaceVariant = Color(0xFF64748B),
    outline = Color(0xFFCBD2E1),
    outlineVariant = Color(0xFFE0E7FF),
    error = Color(0xFFCF2D3A),
)

private val DarkColors = darkColorScheme(
    primary = Color(0xFFA9B4FF),
    onPrimary = Color(0xFF17205F),
    primaryContainer = Color(0xFF27336F),
    onPrimaryContainer = Color(0xFFE0E5FF),
    secondary = Color(0xFFD4BBFF),
    onSecondary = Color(0xFF38205F),
    secondaryContainer = Color(0xFF4A2D78),
    onSecondaryContainer = Color(0xFFF0E5FF),
    tertiary = Color(0xFF6EDBD1),
    background = Color(0xFF070B14),
    onBackground = Color(0xFFE7EBF5),
    surface = Color(0xFF0D1420),
    onSurface = Color(0xFFE7EBF5),
    surfaceContainerLowest = Color(0xFF080D16),
    surfaceContainerLow = Color(0xFF0D1420),
    surfaceContainer = Color(0xFF121B29),
    surfaceContainerHigh = Color(0xFF172231),
    surfaceContainerHighest = Color(0xFF1D2939),
    surfaceVariant = Color(0xFF172231),
    onSurfaceVariant = Color(0xFFA8B4C7),
    outline = Color(0xFF536078),
    outlineVariant = Color(0xFF273349),
    error = Color(0xFFFFB4AB),
)

private val PremiumTypography = Typography(
    displaySmall = TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.Bold,
        fontSize = 36.sp, lineHeight = 42.sp, letterSpacing = (-0.6).sp),
    headlineLarge = TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.Bold,
        fontSize = 31.sp, lineHeight = 38.sp, letterSpacing = (-0.4).sp),
    headlineMedium = TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.Bold,
        fontSize = 27.sp, lineHeight = 34.sp, letterSpacing = (-0.25).sp),
    headlineSmall = TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.Bold,
        fontSize = 23.sp, lineHeight = 30.sp),
    titleLarge = TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.SemiBold,
        fontSize = 20.sp, lineHeight = 27.sp),
    titleMedium = TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.SemiBold,
        fontSize = 16.sp, lineHeight = 23.sp, letterSpacing = 0.sp),
    titleSmall = TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.SemiBold,
        fontSize = 14.sp, lineHeight = 20.sp),
    bodyLarge = TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.Normal,
        fontSize = 16.sp, lineHeight = 24.sp),
    bodyMedium = TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.Normal,
        fontSize = 14.sp, lineHeight = 21.sp),
    bodySmall = TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.Normal,
        fontSize = 12.sp, lineHeight = 18.sp),
    labelLarge = TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.SemiBold,
        fontSize = 14.sp, lineHeight = 20.sp),
    labelMedium = TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.SemiBold,
        fontSize = 12.sp, lineHeight = 17.sp, letterSpacing = 0.15.sp),
)

private val PremiumShapes = Shapes(
    extraSmall = RoundedCornerShape(14.dp),
    small = RoundedCornerShape(16.dp),
    medium = RoundedCornerShape(20.dp),
    large = RoundedCornerShape(28.dp),
    extraLarge = RoundedCornerShape(36.dp),
)

@Composable
fun SchoolDbTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColors else LightColors,
        typography = PremiumTypography,
        shapes = PremiumShapes,
        content = content,
    )
}
