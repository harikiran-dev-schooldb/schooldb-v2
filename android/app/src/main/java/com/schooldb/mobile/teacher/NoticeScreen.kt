package com.schooldb.mobile.teacher

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.composables.icons.lucide.ArrowLeft
import com.composables.icons.lucide.Lucide
import com.composables.icons.lucide.RefreshCw
import com.schooldb.mobile.ui.notifications.NotificationDayHeading
import com.schooldb.mobile.ui.notifications.NotificationFilter
import com.schooldb.mobile.ui.notifications.PremiumNotificationCard
import com.schooldb.mobile.ui.notifications.PremiumNotificationData
import com.schooldb.mobile.ui.notifications.PremiumNotificationEmpty
import com.schooldb.mobile.ui.notifications.PremiumNotificationFilters
import com.schooldb.mobile.ui.notifications.matches
import com.schooldb.mobile.ui.notifications.notificationDay

@Composable
fun NoticeScreen(state: NoticeUiState, viewModel: NoticeViewModel) {
    state.selected?.let { notice ->
        TeacherNoticeDetails(notice, viewModel::close)
        return
    }

    var filter by rememberSaveable { mutableStateOf(NotificationFilter.ALL) }
    val visible = state.items.filter { it.premiumData().matches(filter) }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            Column(Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 12.dp)) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                    Surface(
                        onClick = viewModel::refresh,
                        enabled = !state.loading,
                        modifier = Modifier.size(43.dp),
                        shape = CircleShape,
                        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = .76f),
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(Lucide.RefreshCw, contentDescription = "Refresh notifications", modifier = Modifier.size(20.dp))
                        }
                    }
                }
                Text("Notifications", fontSize = 31.sp, lineHeight = 36.sp, fontWeight = FontWeight.ExtraBold)
                Text(
                    if (state.unreadCount > 0) "${state.unreadCount} unread school updates" else "You are all caught up",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontSize = 13.sp,
                )
            }
        },
    ) { padding ->
        when {
            state.loading && state.items.isEmpty() -> Box(
                Modifier.fillMaxSize().padding(padding),
                contentAlignment = Alignment.Center,
            ) { CircularProgressIndicator() }

            state.error != null && state.items.isEmpty() -> Column(
                Modifier.fillMaxSize().padding(padding).padding(24.dp),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text("Couldn’t load notifications", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(8.dp))
                Text(state.error, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(Modifier.height(16.dp))
                Button(onClick = viewModel::refresh) { Text("Try again") }
            }

            else -> LazyColumn(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentPadding = PaddingValues(horizontal = 18.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                item {
                    PremiumNotificationFilters(filter, state.unreadCount, onSelect = { filter = it })
                }
                if (visible.isEmpty()) {
                    item { PremiumNotificationEmpty(filter) }
                } else {
                    var previousDay: String? = null
                    visible.forEach { notice ->
                        val day = notificationDay(notice.publishedAt)
                        if (day != previousDay) {
                            item(key = "day-$day") { NotificationDayHeading(day) }
                            previousDay = day
                        }
                        item(key = notice.id) {
                            PremiumNotificationCard(
                                item = notice.premiumData(),
                                expanded = false,
                                onClick = { viewModel.open(notice) },
                            )
                        }
                    }
                }
                if (state.loading) item { CircularProgressIndicator(Modifier.size(24.dp)) }
            }
        }
    }
}

@Composable
private fun TeacherNoticeDetails(item: NoticeItem, onBack: () -> Unit) {
    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            Column(Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 12.dp)) {
                Surface(
                    onClick = onBack,
                    modifier = Modifier.size(43.dp),
                    shape = CircleShape,
                    color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = .76f),
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(Lucide.ArrowLeft, contentDescription = "Back", modifier = Modifier.size(21.dp))
                    }
                }
                Spacer(Modifier.height(14.dp))
                Text("Notification", fontSize = 31.sp, lineHeight = 36.sp, fontWeight = FontWeight.ExtraBold)
                Text("School update details", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 13.sp)
            }
        },
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).padding(horizontal = 18.dp, vertical = 12.dp)) {
            PremiumNotificationCard(item.premiumData(), expanded = true, onClick = {})
            Spacer(Modifier.height(14.dp))
            Surface(
                color = MaterialTheme.colorScheme.surface,
                shape = RoundedCornerShape(20.dp),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column(Modifier.padding(17.dp)) {
                    Text("About this update", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    Text(
                        "Sent to ${item.targetLabel}",
                        modifier = Modifier.padding(top = 5.dp),
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontSize = 12.sp,
                    )
                }
            }
        }
    }
}

private fun NoticeItem.premiumData() = PremiumNotificationData(
    id = id,
    title = title,
    body = body,
    category = category,
    priority = priority,
    target = targetLabel,
    publishedAt = publishedAt,
    read = read,
)
