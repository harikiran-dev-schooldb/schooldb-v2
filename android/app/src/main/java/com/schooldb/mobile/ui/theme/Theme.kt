package com.schooldb.mobile.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

private val RoyalBlue = Color(0xFF3154D9)
private val ElectricViolet = Color(0xFF7557E8)
private val Midnight = Color(0xFF10172A)
private val Ink = Color(0xFF172033)
private val Mist = Color(0xFFF5F7FC)
private val Ice = Color(0xFFE8EEFF)

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
    surfaceVariant = Color(0xFFF0F3FA),
    onSurfaceVariant = Color(0xFF5C667A),
    outline = Color(0xFFCBD2E1),
    outlineVariant = Color(0xFFE2E7F1),
    error = Color(0xFFCF2D3A),
)

private val DarkColors = darkColorScheme(
    primary = Color(0xFFAEC1FF),
    onPrimary = Color(0xFF09266F),
    primaryContainer = Color(0xFF263D91),
    onPrimaryContainer = Color(0xFFE2E8FF),
    secondary = Color(0xFFC9B8FF),
    onSecondary = Color(0xFF332169),
    secondaryContainer = Color(0xFF49368A),
    onSecondaryContainer = Color(0xFFECE5FF),
    tertiary = Color(0xFF72D8CF),
    background = Color(0xFF0B1020),
    onBackground = Color(0xFFE8EBF4),
    surface = Midnight,
    onSurface = Color(0xFFE8EBF4),
    surfaceVariant = Color(0xFF20283A),
    onSurfaceVariant = Color(0xFFBDC5D8),
    outline = Color(0xFF596278),
    outlineVariant = Color(0xFF323B50),
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
