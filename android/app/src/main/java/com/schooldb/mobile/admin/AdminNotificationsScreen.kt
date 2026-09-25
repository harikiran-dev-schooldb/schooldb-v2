package com.schooldb.mobile.admin

import androidx.activity.compose.BackHandler
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
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
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.draw.clip
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.schooldb.mobile.network.ApiException
import com.schooldb.mobile.network.AuthenticatedApiClient
import com.composables.icons.lucide.ArrowLeft
import com.composables.icons.lucide.Lucide
import com.composables.icons.lucide.Megaphone
import com.composables.icons.lucide.RefreshCw
import com.schooldb.mobile.ui.notifications.NotificationDayHeading
import com.schooldb.mobile.ui.notifications.NotificationFilter
import com.schooldb.mobile.ui.notifications.PremiumNotificationCard
import com.schooldb.mobile.ui.notifications.PremiumNotificationData
import com.schooldb.mobile.ui.notifications.PremiumNotificationEmpty
import com.schooldb.mobile.ui.notifications.PremiumNotificationFilters
import com.schooldb.mobile.ui.notifications.matches
import com.schooldb.mobile.ui.notifications.notificationDay
import java.io.IOException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject

internal data class AdminNotification(
    val id: String,
    val title: String,
    val body: String,
    val category: String,
    val priority: String,
    val target: String,
    val publishedAt: String,
    val read: Boolean,
)

internal data class AdminNotificationsState(
    val items: List<AdminNotification> = emptyList(),
    val loading: Boolean = true,
    val error: String? = null,
)

internal class AdminNotificationsViewModel : ViewModel() {
    private val api = AuthenticatedApiClient()
    private val mutableState = MutableStateFlow(AdminNotificationsState())
    val state = mutableState.asStateFlow()

    fun load(forceRefresh: Boolean = false) {
        if (mutableState.value.loading && mutableState.value.items.isNotEmpty()) return
        mutableState.value = mutableState.value.copy(loading = true, error = null)
        viewModelScope.launch {
            try {
                val data = withContext(Dispatchers.IO) {
                    api.get("api/v1/mobile/admin/notifications", cacheTtlMillis = 120_000L,
                        forceRefresh = forceRefresh)
                }
                val rows = data.getJSONArray("items")
                mutableState.value = AdminNotificationsState(
                    items = (0 until rows.length()).map { index ->
                        rows.getJSONObject(index).let { item ->
                            AdminNotification(
                                id = item.getString("id"),
                                title = item.optString("title"),
                                body = item.optString("body"),
                                category = item.optString("category"),
                                priority = item.optString("priority"),
                                target = item.optString("targetLabel"),
                                publishedAt = item.optString("publishedAt"),
                                read = item.optBoolean("read"),
                            )
                        }
                    },
                    loading = false,
                )
            } catch (error: Exception) {
                mutableState.value = mutableState.value.copy(loading = false, error = message(error))
            }
        }
    }

    fun markRead(item: AdminNotification) {
        if (item.read) return
        mutableState.value = mutableState.value.copy(
            items = mutableState.value.items.map { if (it.id == item.id) it.copy(read = true) else it },
        )
        viewModelScope.launch {
            try {
                withContext(Dispatchers.IO) {
                    api.post("api/v1/mobile/admin/notifications", JSONObject().put("id", item.id))
                }
            } catch (error: Exception) {
                mutableState.value = mutableState.value.copy(
                    items = mutableState.value.items.map { if (it.id == item.id) it.copy(read = false) else it },
                    error = message(error),
                )
            }
        }
    }

    private fun message(error: Exception) = when (error) {
        is ApiException -> error.message
        is IOException -> "Could not reach SchoolDB. Check your connection."
        else -> "Could not load announcements."
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminNotificationsScreen(onBack: () -> Unit) {
    val viewModel: AdminNotificationsViewModel = viewModel()
    val state by viewModel.state.collectAsStateWithLifecycle()
    var filter by rememberSaveable { mutableStateOf(NotificationFilter.ALL) }
    var expandedId by rememberSaveable { mutableStateOf<String?>(null) }
    val visibleItems = state.items.filter { item ->
        PremiumNotificationData(
            item.id, item.title, item.body, item.category, item.priority,
            item.target, item.publishedAt, item.read,
        ).matches(filter)
    }
    BackHandler(onBack = onBack)
    LaunchedEffect(Unit) { viewModel.load() }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            Column(Modifier.fillMaxWidth().statusBarsPadding().padding(horizontal = 18.dp, vertical = 10.dp)) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Surface(onClick = onBack, shape = CircleShape,
                        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.78f)) {
                        Box(Modifier.padding(11.dp), contentAlignment = Alignment.Center) {
                            Icon(Lucide.ArrowLeft, contentDescription = "Back")
                        }
                    }
                    Surface(onClick = { viewModel.load(forceRefresh = true) }, enabled = !state.loading,
                        shape = CircleShape,
                        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.78f)) {
                        Box(Modifier.padding(11.dp), contentAlignment = Alignment.Center) {
                            Icon(Lucide.RefreshCw, contentDescription = "Refresh announcements")
                        }
                    }
                }
                Spacer(Modifier.height(14.dp))
                Text("Notifications", fontSize = 32.sp, lineHeight = 36.sp,
                    letterSpacing = (-0.5).sp, fontWeight = FontWeight.ExtraBold)
                Text("${state.items.count { !it.read }} unread",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        },
    ) { padding ->
        PullToRefreshBox(
            isRefreshing = state.loading && state.items.isNotEmpty(),
            onRefresh = { viewModel.load(forceRefresh = true) },
            modifier = Modifier.fillMaxSize().padding(padding),
        ) {
        if (state.loading && state.items.isEmpty()) {
            AdminNotificationsSkeleton()
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(18.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                item {
                    PremiumNotificationFilters(
                        selected = filter,
                        unreadCount = state.items.count { !it.read },
                        onSelect = { filter = it },
                    )
                }
                if (visibleItems.isEmpty()) item {
                    PremiumNotificationEmpty(filter)
                }
                var previousDay: String? = null
                visibleItems.forEach { notification ->
                    val day = notificationDay(notification.publishedAt)
                    if (day != previousDay) {
                        item(key = "day-$day") { NotificationDayHeading(day) }
                        previousDay = day
                    }
                    item(key = notification.id) {
                        PremiumNotificationCard(
                            item = PremiumNotificationData(
                                notification.id, notification.title, notification.body, notification.category, notification.priority,
                                notification.target, notification.publishedAt, notification.read,
                            ),
                            expanded = expandedId == notification.id,
                            onClick = {
                                expandedId = if (expandedId == notification.id) null else notification.id
                                viewModel.markRead(notification)
                            },
                        )
                    }
                }
                if (state.loading) item { CircularProgressIndicator() }
                state.error?.let { message -> item {
                    Text(message, color = MaterialTheme.colorScheme.error)
                } }
            }
        }
        }
    }
}

@Composable
private fun AdminNotificationsSkeleton(modifier: Modifier = Modifier) {
    val transition = rememberInfiniteTransition(label = "notifications-skeleton")
    val pulse by transition.animateFloat(
        initialValue = 0.42f,
        targetValue = 0.82f,
        animationSpec = infiniteRepeatable(tween(850), repeatMode = RepeatMode.Reverse),
        label = "notifications-skeleton-pulse",
    )
    val fill = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = pulse)
    LazyColumn(modifier.fillMaxSize(), contentPadding = PaddingValues(18.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                repeat(2) { Box(Modifier.size(width = 82.dp, height = 34.dp)
                    .clip(RoundedCornerShape(17.dp)).background(fill)) }
            }
        }
        items(5) {
            Box(Modifier.fillMaxWidth().height(112.dp).clip(RoundedCornerShape(20.dp)).background(fill))
        }
    }
}
