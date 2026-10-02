package com.schooldb.support

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Dashboard
import androidx.compose.material.icons.outlined.ConfirmationNumber
import androidx.compose.material.icons.outlined.BarChart
import androidx.compose.material.icons.outlined.Person
import androidx.compose.ui.semantics.Role
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

internal val Ink = Color(0xFF0F172A)
internal val Muted = Color(0xFF64748B)
internal val Canvas = Color(0xFFF5F7FC)
internal val Indigo = SchoolBrand.primary
internal val Line = Color(0xFFE0E7FF)
internal val Navy = Color(0xFF312E81)
internal val Violet = SchoolBrand.secondary
internal val SchoolGreen = Color(0xFF008B83)
internal val SchoolGold = SchoolBrand.accent
internal val SchoolRed = SchoolBrand.danger

private val SupportColors = lightColorScheme(
    primary = Indigo,
    onPrimary = Color.White,
    primaryContainer = Color(0xFFEEF2FF),
    secondary = Violet,
    secondaryContainer = Color(0xFFEDE8FF),
    tertiary = SchoolGreen,
    background = Canvas,
    onBackground = Ink,
    surface = Color.White,
    onSurface = Ink,
    surfaceVariant = Color(0xFFF0F3F7),
    onSurfaceVariant = Muted,
    outline = Line,
    outlineVariant = Color(0xFFEDF0F4),
    error = Color(0xFFC33D47),
)

private val SupportTypography = Typography(
    headlineLarge = TextStyle(fontSize = 31.sp, lineHeight = 38.sp, fontWeight = FontWeight.Bold, letterSpacing = (-0.4).sp),
    headlineMedium = TextStyle(fontSize = 27.sp, lineHeight = 34.sp, fontWeight = FontWeight.Bold, letterSpacing = (-0.25).sp),
    headlineSmall = TextStyle(fontSize = 23.sp, lineHeight = 30.sp, fontWeight = FontWeight.Bold),
    titleLarge = TextStyle(fontSize = 20.sp, lineHeight = 27.sp, fontWeight = FontWeight.SemiBold),
    titleMedium = TextStyle(fontSize = 16.sp, lineHeight = 23.sp, fontWeight = FontWeight.SemiBold),
    bodyLarge = TextStyle(fontSize = 16.sp, lineHeight = 24.sp),
    bodyMedium = TextStyle(fontSize = 14.sp, lineHeight = 21.sp),
    bodySmall = TextStyle(fontSize = 12.sp, lineHeight = 18.sp),
    labelLarge = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold),
    labelMedium = TextStyle(fontSize = 12.sp, lineHeight = 17.sp, fontWeight = FontWeight.SemiBold),
    labelSmall = TextStyle(fontSize = 11.sp, lineHeight = 15.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.7.sp),
)

private val SupportShapes = Shapes(
    extraSmall = RoundedCornerShape(14.dp),
    small = RoundedCornerShape(16.dp),
    medium = RoundedCornerShape(20.dp),
    large = RoundedCornerShape(28.dp),
    extraLarge = RoundedCornerShape(36.dp),
)

@Composable
internal fun SupportTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = SupportColors,
        typography = SupportTypography,
        shapes = SupportShapes,
        content = content,
    )
}

@Composable
internal fun BrandMark(modifier: Modifier = Modifier) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(25.dp),
        color = Color.White,
        border = BorderStroke(1.dp, Line.copy(alpha = 0.85f)),
        shadowElevation = 0.dp,
    ) {
        Image(
            painter = painterResource(SchoolBrand.logoRes),
            contentDescription = SchoolBrand.schoolName + " logo",
            modifier = Modifier.fillMaxSize().padding(3.dp),
            contentScale = ContentScale.Fit,
        )
    }
}

@Composable
internal fun SurfaceCard(modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    Surface(modifier, shape = MaterialTheme.shapes.large, color = Color.White,
        border = BorderStroke(1.dp, Line.copy(alpha = 0.82f)), shadowElevation = 2.dp) {
        Column(Modifier.padding(20.dp), content = content)
    }
}

@Composable
internal fun SectionTitle(title: String, subtitle: String? = null, modifier: Modifier = Modifier) {
    Column(modifier, verticalArrangement = Arrangement.spacedBy(3.dp)) {
        Text(title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = Ink)
        if (subtitle != null) Text(subtitle, style = MaterialTheme.typography.bodyMedium, color = Muted)
    }
}

@Composable
internal fun Pill(label: String, tint: Color, modifier: Modifier = Modifier) {
    Row(modifier.background(tint.copy(alpha = 0.11f), CircleShape).padding(horizontal = 11.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(6.dp).background(tint, CircleShape))
        Spacer(Modifier.width(7.dp))
        Text(label, color = tint, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.SemiBold)
    }
}

internal fun statusTint(status: String): Color = when (status) {
    "RESOLVED", "CLOSED" -> Color(0xFF15976C)
    "IN_PROGRESS", "ASSIGNED" -> Color(0xFF365FC7)
    "WAITING" -> Color(0xFFBA7B1B)
    else -> Indigo
}

internal fun priorityTint(priority: String): Color = when (priority) {
    "URGENT" -> Color(0xFFCB4E48)
    "HIGH" -> Color(0xFFC97A2F)
    else -> Muted
}

/** Matches the main Android app's rounded, light gradient page headers. */
@Composable
internal fun SupportHeaderSurface(content: @Composable BoxScope.() -> Unit) {
    val shape = RoundedCornerShape(bottomStart = 28.dp, bottomEnd = 28.dp)
    Box(Modifier.fillMaxWidth().shadow(12.dp, shape,
        ambientColor = Ink.copy(alpha = .06f), spotColor = Ink.copy(alpha = .08f))
        .clip(shape).background(Brush.linearGradient(listOf(Color.White, Color(0xFFF1F3FF), Color(0xFFF5F3FF))))
        .border(1.dp, Line, shape)) {
        Box(Modifier.matchParentSize()) {
            Box(Modifier.size(150.dp).align(Alignment.TopEnd).background(Indigo.copy(alpha = .05f), CircleShape))
        }
        content()
    }
}

@Composable
internal fun SupportPageHeading(title: String, subtitle: String, eyebrow: String = "SCHOOL SUPPORT") {
    Column(Modifier.fillMaxWidth().padding(top = 12.dp, bottom = 4.dp)) {
        Text(eyebrow, color = Indigo, style = MaterialTheme.typography.labelSmall)
        Spacer(Modifier.height(6.dp))
        Text(title, color = Ink, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.ExtraBold)
        Spacer(Modifier.height(6.dp))
        Text(subtitle, color = Muted, style = MaterialTheme.typography.bodyMedium)
    }
}

@Composable
internal fun SupportEmptyState(title: String, message: String, icon: ImageVector = Icons.Outlined.ConfirmationNumber) {
    SurfaceCard(Modifier.fillMaxWidth()) {
        Column(Modifier.fillMaxWidth().padding(vertical = 16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Surface(shape = RoundedCornerShape(20.dp), color = Indigo.copy(alpha = .08f)) {
                Icon(icon, null, Modifier.padding(16.dp).size(28.dp), tint = Indigo)
            }
            Spacer(Modifier.height(16.dp))
            Text(title, style = MaterialTheme.typography.titleMedium, color = Ink)
            Spacer(Modifier.height(6.dp))
            Text(message, style = MaterialTheme.typography.bodyMedium, color = Muted,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center)
        }
    }
}

@Composable
internal fun SupportNavigationDock(selected: String, onSelect: (String) -> Unit) {
    val shape = RoundedCornerShape(31.dp)
    Surface(Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 7.dp)
        .shadow(18.dp, shape, ambientColor = Ink.copy(alpha = .10f), spotColor = Ink.copy(alpha = .14f)),
        shape = shape, color = Color.Transparent, border = BorderStroke(1.dp, Color.White)) {
        Row(Modifier.background(Brush.linearGradient(listOf(Color.White, Color(0xFFF4F6FF), Color.White)))
            .padding(5.dp)) {
            listOf("Overview" to Icons.Outlined.Dashboard, "Tickets" to Icons.Outlined.ConfirmationNumber,
                "Analytics" to Icons.Outlined.BarChart, "Profile" to Icons.Outlined.Person).forEach { (tab, icon) ->
                val active = selected == tab
                Column(Modifier.weight(1f).clip(RoundedCornerShape(25.dp))
                    .background(if (active) Color(0xFFE1E9FF) else Color.Transparent)
                    .selectable(selected = active, role = Role.Tab, onClick = { onSelect(tab) })
                    .padding(vertical = 12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(icon, null, Modifier.size(22.dp), tint = if (active) Color(0xFF3154D9) else Muted)
                    Spacer(Modifier.height(4.dp))
                    Text(tab, style = MaterialTheme.typography.labelMedium,
                        color = if (active) Ink else Muted, fontWeight = if (active) FontWeight.Bold else FontWeight.Medium)
                }
            }
        }
    }
}
