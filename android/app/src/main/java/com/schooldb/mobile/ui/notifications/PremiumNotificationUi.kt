package com.schooldb.mobile.ui.notifications

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.composables.icons.lucide.Bell
import com.composables.icons.lucide.CalendarCheck
import com.composables.icons.lucide.ClipboardCheck
import com.composables.icons.lucide.GraduationCap
import com.composables.icons.lucide.Lucide
import java.time.Instant
import java.time.LocalDate
import java.time.OffsetDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

enum class NotificationFilter(val label: String) {
    ALL("All"),
    UNREAD("Unread"),
    IMPORTANT("Important"),
}

data class PremiumNotificationData(
    val id: String,
    val title: String,
    val body: String,
    val category: String,
    val priority: String,
    val target: String,
    val publishedAt: String,
    val read: Boolean,
)

fun PremiumNotificationData.matches(filter: NotificationFilter) = when (filter) {
    NotificationFilter.ALL -> true
    NotificationFilter.UNREAD -> !read
    NotificationFilter.IMPORTANT -> priority == "URGENT" || category in setOf(
        "LEAVE_REQUEST", "ATTENDANCE", "FEES", "EXAM", "RESULTS",
    )
}

private data class CategoryStyle(val icon: ImageVector, val light: Color, val dark: Color)

private fun categoryStyle(category: String) = when {
    category.contains("LEAVE") -> CategoryStyle(Lucide.CalendarCheck, Color(0xFF7557E8), Color(0xFFC5B7FF))
    category.contains("ATTENDANCE") -> CategoryStyle(Lucide.ClipboardCheck, Color(0xFF008B83), Color(0xFF72D8CF))
    category.contains("EXAM") || category.contains("RESULT") ->
        CategoryStyle(Lucide.GraduationCap, Color(0xFF3154D9), Color(0xFF8DB8FF))
    else -> CategoryStyle(Lucide.Bell, Color(0xFFD97706), Color(0xFFFFC36B))
}

@Composable
fun PremiumNotificationFilters(
    selected: NotificationFilter,
    unreadCount: Int,
    onSelect: (NotificationFilter) -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        NotificationFilter.entries.forEach { filter ->
            FilterChip(
                selected = selected == filter,
                onClick = { onSelect(filter) },
                label = {
                    Text(
                        if (filter == NotificationFilter.UNREAD && unreadCount > 0) {
                            "${filter.label}  $unreadCount"
                        } else filter.label,
                    )
                },
                shape = RoundedCornerShape(50),
            )
        }
    }
}

@Composable
fun PremiumNotificationCard(
    item: PremiumNotificationData,
    expanded: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val style = categoryStyle(item.category)
    val dark = MaterialTheme.colorScheme.background.red < .2f
    val accent = if (dark) style.dark else style.light
    val urgent = item.priority == "URGENT"
    val container = when {
        urgent && !item.read -> MaterialTheme.colorScheme.error.copy(alpha = if (dark) .13f else .07f)
        !item.read -> MaterialTheme.colorScheme.primary.copy(alpha = if (dark) .13f else .065f)
        else -> MaterialTheme.colorScheme.surface
    }

    Surface(
        onClick = onClick,
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(22.dp),
        color = container,
        border = BorderStroke(
            1.dp,
            when {
                urgent && !item.read -> MaterialTheme.colorScheme.error.copy(alpha = .28f)
                !item.read -> MaterialTheme.colorScheme.primary.copy(alpha = .24f)
                else -> MaterialTheme.colorScheme.outlineVariant.copy(alpha = .72f)
            },
        ),
        tonalElevation = if (item.read) 0.dp else 1.dp,
    ) {
        Box {
            if (!item.read) {
                Box(
                    Modifier.matchParentSize().clip(RoundedCornerShape(22.dp)).background(
                        Brush.linearGradient(listOf(accent.copy(alpha = .08f), Color.Transparent)),
                    ),
                )
            }
            Row(
                Modifier.fillMaxWidth().padding(horizontal = 15.dp, vertical = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(13.dp),
            ) {
                Box(
                    Modifier.size(42.dp).background(accent.copy(alpha = if (dark) .16f else .10f), CircleShape),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(style.icon, contentDescription = null, tint = accent, modifier = Modifier.size(21.dp))
                }
                Column(Modifier.weight(1f)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            item.title,
                            modifier = Modifier.weight(1f),
                            color = MaterialTheme.colorScheme.onSurface,
                            fontSize = 15.sp,
                            lineHeight = 20.sp,
                            fontWeight = if (item.read) FontWeight.SemiBold else FontWeight.Bold,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis,
                        )
                        if (!item.read) {
                            Spacer(Modifier.width(9.dp))
                            Box(Modifier.size(8.dp).background(if (urgent) MaterialTheme.colorScheme.error else accent, CircleShape))
                        }
                    }
                    Spacer(Modifier.height(5.dp))
                    Text(
                        item.body,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontSize = 13.sp,
                        lineHeight = 19.sp,
                        maxLines = if (expanded) Int.MAX_VALUE else 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Spacer(Modifier.height(10.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            item.category.notificationLabel(),
                            color = accent,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = .3.sp,
                        )
                        Text("  •  ${notificationTime(item.publishedAt)}", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 10.sp)
                        if (urgent) {
                            Text("  •  URGENT", color = MaterialTheme.colorScheme.error, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                    if (expanded && item.target.isNotBlank()) {
                        Text(
                            "For ${item.target}",
                            modifier = Modifier.padding(top = 5.dp),
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            fontSize = 10.sp,
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun NotificationDayHeading(label: String, modifier: Modifier = Modifier) {
    Text(
        label.uppercase(Locale.ROOT),
        modifier = modifier.padding(start = 3.dp, top = 7.dp, bottom = 1.dp),
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        fontSize = 10.sp,
        fontWeight = FontWeight.Bold,
        letterSpacing = 1.1.sp,
    )
}

@Composable
fun PremiumNotificationEmpty(filter: NotificationFilter, modifier: Modifier = Modifier) {
    Column(
        modifier.fillMaxWidth().padding(vertical = 58.dp, horizontal = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Surface(shape = CircleShape, color = MaterialTheme.colorScheme.surfaceVariant, modifier = Modifier.size(62.dp)) {
            Box(contentAlignment = Alignment.Center) {
                Icon(Lucide.Bell, contentDescription = null, modifier = Modifier.size(27.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        Spacer(Modifier.height(15.dp))
        Text(
            if (filter == NotificationFilter.UNREAD) "You’re all caught up" else "No notifications here",
            fontWeight = FontWeight.Bold,
            fontSize = 17.sp,
        )
        Text(
            if (filter == NotificationFilter.ALL) "School updates will appear here." else "Try another notification filter.",
            modifier = Modifier.padding(top = 4.dp),
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            fontSize = 13.sp,
        )
    }
}

fun notificationDay(publishedAt: String): String {
    val date = notificationInstant(publishedAt).atZone(ZoneId.systemDefault()).toLocalDate()
    val today = LocalDate.now()
    return when (date) {
        today -> "Today"
        today.minusDays(1) -> "Yesterday"
        else -> date.format(DateTimeFormatter.ofPattern("EEEE, d MMM", Locale.getDefault()))
    }
}

private fun notificationTime(publishedAt: String): String {
    val value = notificationInstant(publishedAt).atZone(ZoneId.systemDefault())
    return if (value.toLocalDate() == LocalDate.now()) {
        value.format(DateTimeFormatter.ofPattern("h:mm a", Locale.getDefault()))
    } else {
        value.format(DateTimeFormatter.ofPattern("d MMM", Locale.getDefault()))
    }
}

private fun notificationInstant(value: String): Instant = runCatching {
    Instant.parse(value)
}.recoverCatching {
    OffsetDateTime.parse(value).toInstant()
}.getOrDefault(Instant.EPOCH)

private fun String.notificationLabel() = replace('_', ' ').lowercase(Locale.getDefault())
    .split(' ').joinToString(" ") { it.replaceFirstChar(Char::uppercase) }
