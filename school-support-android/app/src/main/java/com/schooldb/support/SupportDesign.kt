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
import androidx.compose.material.icons.outlined.Notifications
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
internal val Canvas = Color(0xFFF5F7FB)
internal val Indigo = SchoolBrand.primary
internal val Line = Color(0xFFDDE3EE)
internal val Navy = Color(0xFF312E81)
internal val Violet = SchoolBrand.secondary
internal val SchoolGreen = Color(0xFF008B83)
internal val SchoolGold = SchoolBrand.accent
internal val SchoolRed = SchoolBrand.danger

private val SupportLightColors = lightColorScheme(
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
    surfaceContainerLowest = Color.White,
    surfaceContainerLow = Color(0xFFFBFCFF),
    surfaceContainer = Color(0xFFF8FAFF),
    surfaceContainerHigh = Color.White,
    surfaceContainerHighest = Color(0xFFF1F4FA),
    surfaceVariant = Color(0xFFF0F3F7),
    onSurfaceVariant = Muted,
    outline = Line,
    outlineVariant = Color(0xFFEDF0F4),
    error = Color(0xFFC33D47),
)

private val SupportDarkColors = darkColorScheme(
    primary = Color(0xFFA9B4FF),
    onPrimary = Color(0xFF17205F),
    primaryContainer = Color(0xFF27336F),
    secondary = Color(0xFFD4BBFF),
    secondaryContainer = Color(0xFF4A2D78),
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
    large = RoundedCornerShape(20.dp),
    extraLarge = RoundedCornerShape(36.dp),
)

@Composable
internal fun SupportTheme(
    darkTheme: Boolean = false,
    content: @Composable () -> Unit,
) {
    MaterialTheme(
        colorScheme = if (darkTheme) SupportDarkColors else SupportLightColors,
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
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
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
    Surface(modifier, shape = MaterialTheme.shapes.large, color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant), shadowElevation = 0.dp) {
        Column(Modifier.padding(16.dp), content = content)
    }
}

@Composable
internal fun SectionTitle(title: String, subtitle: String?, modifier: Modifier = Modifier) {
    Column(modifier, verticalArrangement = Arrangement.spacedBy(3.dp)) {
        Text(title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
        if (subtitle != null) Text(subtitle, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
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
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = MaterialTheme.colorScheme.surface,
        shadowElevation = 0.dp,
    ) {
        Column {
            Box(Modifier.fillMaxWidth(), content = content)
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
        }
    }
}

@Composable
internal fun SupportHeaderAction(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    content: @Composable BoxScope.() -> Unit,
) {
    Surface(
        onClick = onClick,
        modifier = modifier.size(42.dp),
        shape = CircleShape,
        color = Color.White.copy(alpha = .88f),
        border = BorderStroke(1.dp, Color(0xFFD8E0FF)),
        shadowElevation = 2.dp,
    ) {
        Box(contentAlignment = Alignment.Center, content = content)
    }
}

@Composable
internal fun SupportPageHeading(title: String, subtitle: String, eyebrow: String = "SCHOOL SUPPORT") {
    Column(Modifier.fillMaxWidth().padding(top = 12.dp, bottom = 4.dp)) {
        Text(eyebrow, color = Indigo, style = MaterialTheme.typography.labelSmall)
        Spacer(Modifier.height(6.dp))
        Text(title, color = MaterialTheme.colorScheme.onBackground, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.ExtraBold)
        Spacer(Modifier.height(6.dp))
        Text(subtitle, color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodyMedium)
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
            Text(title, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
            Spacer(Modifier.height(6.dp))
            Text(message, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center)
        }
    }
}

@Composable
internal fun SupportNavigationDock(selected: String, admin: Boolean, unread: Int, onSelect: (String) -> Unit) {
    Column {
        HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
        NavigationBar(
            containerColor = MaterialTheme.colorScheme.surface,
            tonalElevation = 0.dp,
            windowInsets = WindowInsets(0, 0, 0, 0),
        ) {
            listOf(
                "Overview" to Icons.Outlined.Dashboard,
                "Tickets" to Icons.Outlined.ConfirmationNumber,
                if (admin) "Analytics" to Icons.Outlined.BarChart else "Updates" to Icons.Outlined.Notifications,
                "Profile" to Icons.Outlined.Person,
            ).forEach { (tab, icon) ->
                NavigationBarItem(
                    selected = selected == tab,
                    onClick = { onSelect(tab) },
                    icon = {
                        BadgedBox(badge = { if (tab == "Updates" && unread > 0) Badge { Text(if (unread > 99) "99+" else unread.toString()) } }) {
                            Icon(icon, contentDescription = null)
                        }
                    },
                    label = { Text(if (tab == "Overview") "Home" else tab, maxLines = 1) },
                    alwaysShowLabel = true,
                    colors = NavigationBarItemDefaults.colors(
                        indicatorColor = MaterialTheme.colorScheme.primaryContainer,
                        selectedIconColor = MaterialTheme.colorScheme.primary,
                        selectedTextColor = MaterialTheme.colorScheme.primary,
                        unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                        unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant,
                    ),
                )
            }
        }
    }
}
