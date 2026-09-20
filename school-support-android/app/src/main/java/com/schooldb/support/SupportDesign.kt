package com.schooldb.support

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ConfirmationNumber
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

internal val Ink = Color(0xFF172238)
internal val Muted = Color(0xFF71819A)
internal val Canvas = Color(0xFFF6F8FC)
internal val Indigo = Color(0xFF4E46D4)
internal val Line = Color(0xFFE7ECF5)
internal val Navy = Color(0xFF15244A)
internal val Violet = Color(0xFF6555E8)

private val SupportColors = lightColorScheme(
    primary = Indigo,
    onPrimary = Color.White,
    background = Canvas,
    onBackground = Ink,
    surface = Color.White,
    onSurface = Ink,
    outline = Line,
    error = Color(0xFFC33D47),
)

@Composable
internal fun SupportTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = SupportColors, content = content)
}

@Composable
internal fun BrandMark(modifier: Modifier = Modifier) {
    Box(
        modifier.size(48.dp).background(Brush.linearGradient(listOf(Navy, Indigo)), RoundedCornerShape(16.dp)),
        contentAlignment = Alignment.Center,
    ) {
        Icon(Icons.Outlined.ConfirmationNumber, contentDescription = null, tint = Color.White, modifier = Modifier.size(27.dp))
    }
}

@Composable
internal fun SurfaceCard(modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    Surface(modifier, shape = RoundedCornerShape(22.dp), color = Color.White,
        border = BorderStroke(1.dp, Line), shadowElevation = 3.dp) {
        Column(Modifier.padding(18.dp), content = content)
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
