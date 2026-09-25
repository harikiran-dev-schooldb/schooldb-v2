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
    val date: String,
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
                                date = item.optString("publishedAt").take(10),
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
    var unreadOnly by rememberSaveable { mutableStateOf(false) }
    var expandedId by rememberSaveable { mutableStateOf<String?>(null) }
    val visibleItems = if (unreadOnly) state.items.filter { !it.read } else state.items
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
                Text("Announcements", fontSize = 32.sp, lineHeight = 36.sp,
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
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        FilterChip(selected = !unreadOnly, onClick = { unreadOnly = false },
                            label = { Text("All") })
                        FilterChip(selected = unreadOnly, onClick = { unreadOnly = true },
                            label = { Text("Unread") })
                    }
                }
                if (visibleItems.isEmpty()) item {
                    Text(if (unreadOnly) "You’re all caught up" else "No announcements yet",
                        color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                items(visibleItems, key = { it.id }) { item ->
                    Card(
                        onClick = {
                            expandedId = if (expandedId == item.id) null else item.id
                            viewModel.markRead(item)
                        },
                        shape = RoundedCornerShape(20.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = if (item.read) MaterialTheme.colorScheme.surface
                            else MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.55f),
                        ),
                    ) {
                        Row(Modifier.fillMaxWidth().padding(16.dp),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            Surface(shape = CircleShape, color = MaterialTheme.colorScheme.primaryContainer,
                                modifier = Modifier.size(42.dp)) {
                                Box(contentAlignment = Alignment.Center) {
                                    Icon(Lucide.Megaphone, contentDescription = null,
                                        tint = MaterialTheme.colorScheme.primary,
                                        modifier = Modifier.size(22.dp))
                                }
                            }
                            Column(Modifier.weight(1f)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(item.title, modifier = Modifier.weight(1f),
                                        fontWeight = FontWeight.Bold, maxLines = 2,
                                        overflow = TextOverflow.Ellipsis)
                                    if (!item.read) Surface(shape = CircleShape,
                                        color = MaterialTheme.colorScheme.primary,
                                        modifier = Modifier.size(8.dp)) {}
                                }
                                Spacer(Modifier.height(4.dp))
                                Text(item.body,
                                    maxLines = if (expandedId == item.id) Int.MAX_VALUE else 2,
                                    overflow = TextOverflow.Ellipsis,
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Spacer(Modifier.height(8.dp))
                                Text(listOf(item.category.replace('_', ' '), item.target, item.date)
                                    .filter(String::isNotBlank).joinToString(" · "),
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.primary)
                            }
                        }
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
