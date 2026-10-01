package com.schooldb.mobile.admin

import android.app.Activity
import androidx.activity.compose.BackHandler
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
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
import androidx.compose.ui.draw.shadow
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
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.core.view.WindowCompat
import com.schooldb.mobile.network.ApiException
import com.schooldb.mobile.network.AuthenticatedApiClient
import com.composables.icons.lucide.ArrowLeft
import com.composables.icons.lucide.Bell
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
fun AdminNotificationsScreen(onBack: () -> Unit, onCreate: () -> Unit) {
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
    val view = LocalView.current
    DisposableEffect(view) {
        val window = (view.context as? Activity)?.window
        val controller = window?.let { WindowCompat.getInsetsController(it, view) }
        val previous = controller?.isAppearanceLightStatusBars
        controller?.isAppearanceLightStatusBars = false
        onDispose {
            if (previous != null) controller.isAppearanceLightStatusBars = previous
        }
    }
    BackHandler(onBack = onBack)
    LaunchedEffect(Unit) { viewModel.load() }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            val headerShape = RoundedCornerShape(bottomStart = 32.dp, bottomEnd = 32.dp)
            Box(
                Modifier.fillMaxWidth()
                    .shadow(18.dp, headerShape, ambientColor = Color(0xFF312A78).copy(alpha = .24f),
                        spotColor = Color(0xFF312A78).copy(alpha = .28f))
                    .clip(headerShape)
                    .background(Brush.linearGradient(listOf(
                        Color(0xFF10172D), Color(0xFF31256E), Color(0xFF0B5B69),
                    )))
                    .statusBarsPadding(),
            ) {
                Box(Modifier.size(180.dp).align(Alignment.TopEnd).padding(top = 6.dp)
                    .background(Color(0xFF9EC9FF).copy(alpha = .10f), CircleShape))
                Box(Modifier.size(125.dp).align(Alignment.BottomStart)
                    .background(Color(0xFFD8A8FF).copy(alpha = .09f), CircleShape))
                Column(Modifier.fillMaxWidth().padding(horizontal = 18.dp, vertical = 14.dp)) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically) {
                        PremiumHeaderIcon(onClick = onBack, contentDescription = "Back") {
                            Icon(Lucide.ArrowLeft, contentDescription = null, tint = Color.White,
                                modifier = Modifier.size(20.dp))
                        }
                        Surface(shape = RoundedCornerShape(50.dp), color = Color.White.copy(alpha = .10f),
                            border = BorderStroke(1.dp, Color.White.copy(alpha = .14f))) {
                            Row(Modifier.padding(horizontal = 11.dp, vertical = 7.dp),
                                verticalAlignment = Alignment.CenterVertically) {
                                Box(Modifier.size(6.dp).background(Color(0xFF5BE0B5), CircleShape))
                                Text("  LIVE", color = Color(0xFFCFF8EC), fontSize = 9.sp,
                                    fontWeight = FontWeight.ExtraBold, letterSpacing = 1.sp)
                            }
                        }
                        PremiumHeaderIcon(
                            onClick = { viewModel.load(forceRefresh = true) },
                            enabled = !state.loading,
                            contentDescription = "Refresh announcements",
                        ) {
                            if (state.loading && state.items.isNotEmpty()) {
                                CircularProgressIndicator(Modifier.size(19.dp), strokeWidth = 2.dp,
                                    color = Color.White)
                            } else {
                                Icon(Lucide.RefreshCw, contentDescription = null, tint = Color.White,
                                    modifier = Modifier.size(20.dp))
                            }
                        }
                    }
                    Spacer(Modifier.height(20.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Surface(shape = RoundedCornerShape(18.dp), color = Color.White.copy(alpha = .12f),
                            border = BorderStroke(1.dp, Color.White.copy(alpha = .17f))) {
                            Icon(Lucide.Bell, contentDescription = null, tint = Color(0xFFC7D5FF),
                                modifier = Modifier.padding(13.dp).size(26.dp))
                        }
                        Column(Modifier.padding(start = 14.dp)) {
                            Text("COMMUNICATION HUB", color = Color(0xFF9EB7FF), fontSize = 9.sp,
                                fontWeight = FontWeight.ExtraBold, letterSpacing = 1.3.sp)
                            Text("Announcements", color = Color.White, fontSize = 29.sp, lineHeight = 34.sp,
                                letterSpacing = (-.45).sp, fontWeight = FontWeight.ExtraBold)
                        }
                    }
                    Text("Reach the right families with clear, targeted school updates.",
                        Modifier.padding(top = 12.dp), color = Color.White.copy(alpha = .68f),
                        fontSize = 12.sp, lineHeight = 17.sp)
                    Spacer(Modifier.height(15.dp))
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(9.dp)) {
                        NotificationMetric("${state.items.count { !it.read }}", "Unread", Modifier.weight(1f))
                        NotificationMetric("${state.items.size}", "Published", Modifier.weight(1f))
                    }
                    Spacer(Modifier.height(14.dp))
                    Surface(
                        onClick = onCreate,
                        modifier = Modifier.fillMaxWidth().height(50.dp),
                        shape = RoundedCornerShape(17.dp),
                        color = Color.White,
                        contentColor = Color(0xFF25205D),
                        shadowElevation = 6.dp,
                    ) {
                        Row(Modifier.fillMaxSize(), horizontalArrangement = Arrangement.Center,
                            verticalAlignment = Alignment.CenterVertically) {
                            Icon(Lucide.Megaphone, contentDescription = null, modifier = Modifier.size(20.dp))
                            Spacer(Modifier.size(9.dp))
                            Text("Create announcement", fontWeight = FontWeight.ExtraBold)
                        }
                    }
                }
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
private fun PremiumHeaderIcon(
    onClick: () -> Unit,
    contentDescription: String,
    enabled: Boolean = true,
    content: @Composable () -> Unit,
) {
    Surface(
        onClick = onClick,
        enabled = enabled,
        modifier = Modifier.size(42.dp).semantics { this.contentDescription = contentDescription },
        shape = CircleShape,
        color = Color.White.copy(alpha = if (enabled) .11f else .06f),
        border = BorderStroke(1.dp, Color.White.copy(alpha = if (enabled) .16f else .08f)),
    ) {
        Box(contentAlignment = Alignment.Center) { content() }
    }
}

@Composable
private fun NotificationMetric(value: String, label: String, modifier: Modifier = Modifier) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(16.dp),
        color = Color.Black.copy(alpha = .14f),
        border = BorderStroke(1.dp, Color.White.copy(alpha = .11f)),
    ) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 13.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically) {
            Text(value, color = Color.White, fontSize = 18.sp, fontWeight = FontWeight.ExtraBold)
            Text("  $label", color = Color.White.copy(alpha = .62f), fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold)
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
