package com.schooldb.mobile.admin

import androidx.activity.compose.BackHandler
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
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
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.draw.clip
import androidx.compose.material3.Button
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import com.composables.icons.lucide.Check
import com.composables.icons.lucide.Lucide
import com.composables.icons.lucide.RefreshCw
import com.composables.icons.lucide.Search
import com.composables.icons.lucide.X
import java.io.IOException
import java.net.URLEncoder
import java.nio.charset.StandardCharsets
import org.json.JSONObject
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private val sectionTitles = mapOf(
    "students" to "Students",
    "teachers" to "Teachers",
    "classes" to "Classes",
    "attendance" to "Attendance",
    "fees" to "Fees",
    "leave" to "Leave requests",
    "queries" to "Parent queries",
    "timetable" to "Timetable",
    "exams" to "Exams & results",
    "calendar" to "School calendar",
    "fee-collection" to "Fee collection",
    "admissions" to "Online admissions",
)

private val sectionDescriptions = mapOf(
    "timetable" to "Current class periods, subjects and teachers",
    "exams" to "Exam cycles and published schedules",
    "calendar" to "School events, holidays and important dates",
    "fee-collection" to "Pending and partially paid installments",
    "admissions" to "Recent online admission applications",
)

internal data class AdminListRow(
    val id: String,
    val title: String,
    val subtitle: String,
    val detail: String,
    val status: String,
)

internal data class AdminSectionState(
    val rows: List<AdminListRow> = emptyList(),
    val total: Int = 0,
    val page: Int = 1,
    val pageSize: Int = 20,
    val loading: Boolean = true,
    val error: String? = null,
    val savingId: String? = null,
    val actionMessage: String? = null,
)

internal class AdminSectionViewModel : ViewModel() {
    private val api = AuthenticatedApiClient()
    private val mutableState = MutableStateFlow(AdminSectionState())
    val state = mutableState.asStateFlow()

    fun load(
        section: String,
        page: Int = mutableState.value.page,
        query: String = "",
        forceRefresh: Boolean = false,
    ) {
        mutableState.value = mutableState.value.copy(loading = true, error = null)
        viewModelScope.launch {
            try {
                val data = withContext(Dispatchers.IO) {
                    val encoded = URLEncoder.encode(query.trim(), StandardCharsets.UTF_8.toString())
                    api.get("api/v1/mobile/admin/sections?section=$section&page=$page&q=$encoded",
                        cacheTtlMillis = 120_000L, forceRefresh = forceRefresh)
                }
                val items = data.getJSONArray("rows")
                mutableState.value = mutableState.value.copy(
                    rows = (0 until items.length()).map { index ->
                        val item = items.getJSONObject(index)
                        AdminListRow(
                            id = item.optString("id"),
                            title = item.optString("title"),
                            subtitle = item.optString("subtitle"),
                            detail = item.optString("detail"),
                            status = item.optString("status"),
                        )
                    },
                    total = data.optInt("total"),
                    page = data.optInt("page", page),
                    pageSize = data.optInt("pageSize", 20),
                    loading = false,
                    error = null,
                )
            } catch (error: Exception) {
                mutableState.value = mutableState.value.copy(
                    loading = false,
                    error = when (error) {
                        is ApiException -> error.message
                        is IOException -> "Could not reach SchoolDB. Check your connection."
                        else -> "Could not load this page."
                    },
                )
            }
        }
    }

    fun decideLeave(
        requestId: String,
        decision: String,
        note: String,
        page: Int,
        query: String,
    ) {
        if (mutableState.value.savingId != null) return
        mutableState.value = mutableState.value.copy(
            savingId = requestId,
            error = null,
            actionMessage = null,
        )
        viewModelScope.launch {
            try {
                withContext(Dispatchers.IO) {
                    api.post(
                        "api/v1/mobile/admin/leave/$requestId/decision",
                        JSONObject()
                            .put("decision", decision)
                            .put("decisionNote", note.trim()),
                    )
                }
                mutableState.value = mutableState.value.copy(
                    savingId = null,
                    actionMessage = if (decision == "APPROVED") {
                        "Leave request approved. A parent and student notification was created."
                    } else {
                        "Leave request rejected. A parent and student notification was created."
                    },
                )
                load("leave", page, query, forceRefresh = true)
            } catch (error: Exception) {
                mutableState.value = mutableState.value.copy(
                    savingId = null,
                    error = when (error) {
                        is ApiException -> error.message
                        is IOException -> "Could not reach SchoolDB. Check your connection."
                        else -> "Could not update this leave request."
                    },
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminSectionScreen(
    section: String,
    onBack: () -> Unit,
    onTicket: (String) -> Unit,
    onStudent: (String) -> Unit,
) {
    val viewModel: AdminSectionViewModel = viewModel(key = "admin-section-$section")
    val state by viewModel.state.collectAsStateWithLifecycle()
    val title = sectionTitles[section] ?: "School data"
    var query by rememberSaveable(section) { mutableStateOf("") }
    var statusFilter by rememberSaveable(section) { mutableStateOf("ALL") }
    var decisionRequest by rememberSaveable(section) { mutableStateOf<String?>(null) }
    var decisionType by rememberSaveable(section) { mutableStateOf("APPROVED") }
    var decisionNote by rememberSaveable(section) { mutableStateOf("") }
    val statuses = state.rows.map { it.status }.filter(String::isNotBlank).distinct().sorted()
    val visibleRows = if (statusFilter == "ALL") state.rows else state.rows.filter { it.status == statusFilter }
    BackHandler(onBack = onBack)
    LaunchedEffect(section, query) {
        delay(if (query.isBlank()) 0 else 350)
        statusFilter = "ALL"
        viewModel.load(section, 1, query)
    }

    if (decisionRequest != null) {
        val approving = decisionType == "APPROVED"
        AlertDialog(
            onDismissRequest = {
                if (state.savingId == null) decisionRequest = null
            },
            title = { Text(if (approving) "Approve leave?" else "Reject leave?") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        if (approving) "Add a short approval note for the parent."
                        else "Explain the reason so the parent knows what to do next.",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    OutlinedTextField(
                        value = decisionNote,
                        onValueChange = { decisionNote = it.take(1000) },
                        modifier = Modifier.fillMaxWidth(),
                        label = { Text("Decision note") },
                        minLines = 2,
                        maxLines = 5,
                        shape = RoundedCornerShape(16.dp),
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        decisionRequest?.let {
                            viewModel.decideLeave(it, decisionType, decisionNote, state.page, query)
                        }
                        decisionRequest = null
                        decisionNote = ""
                    },
                    enabled = decisionNote.trim().length >= 3 && state.savingId == null,
                ) {
                    if (state.savingId != null) {
                        CircularProgressIndicator(Modifier.width(18.dp).height(18.dp), strokeWidth = 2.dp)
                    } else {
                        Text(if (approving) "Approve" else "Reject")
                    }
                }
            },
            dismissButton = {
                TextButton(
                    onClick = { decisionRequest = null },
                    enabled = state.savingId == null,
                ) { Text("Cancel") }
            },
            shape = RoundedCornerShape(28.dp),
        )
    }

    Scaffold(containerColor = MaterialTheme.colorScheme.background, topBar = {
        Column(Modifier.fillMaxWidth().statusBarsPadding().padding(horizontal = 18.dp, vertical = 10.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Surface(onClick = onBack, shape = RoundedCornerShape(50),
                    color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.72f)) {
                    Box(Modifier.padding(11.dp), contentAlignment = Alignment.Center) {
                        Icon(Lucide.ArrowLeft, contentDescription = "Back")
                    }
                }
                Surface(onClick = { viewModel.load(section, state.page, query, forceRefresh = true) },
                    enabled = !state.loading,
                    shape = RoundedCornerShape(50),
                    color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.72f)) {
                    Box(Modifier.padding(11.dp), contentAlignment = Alignment.Center) {
                        Icon(Lucide.RefreshCw, contentDescription = "Refresh $title")
                    }
                }
            }
            Spacer(Modifier.height(14.dp))
            Text(title, fontSize = 32.sp, lineHeight = 36.sp,
                letterSpacing = (-0.5).sp, fontWeight = FontWeight.ExtraBold)
            Text(sectionDescriptions[section] ?: "School records in this section",
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                style = MaterialTheme.typography.bodyMedium)
        }
    }) { padding ->
        PullToRefreshBox(
            isRefreshing = state.loading && state.rows.isNotEmpty(),
            onRefresh = { viewModel.load(section, state.page, query, forceRefresh = true) },
            modifier = Modifier.fillMaxSize().padding(padding),
        ) {
        if (state.loading && state.rows.isEmpty()) {
            AdminSectionSkeleton()
        } else if (state.error != null && state.rows.isEmpty()) {
            Column(Modifier.fillMaxSize().padding(24.dp),
                verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally) {
                Text(state.error ?: "Could not load", color = MaterialTheme.colorScheme.error)
                Spacer(Modifier.height(12.dp))
                Button(onClick = { viewModel.load(section, 1, query, forceRefresh = true) }) { Text("Try again") }
            }
        } else {
            LazyColumn(Modifier.fillMaxSize(),
                contentPadding = PaddingValues(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                item {
                    OutlinedTextField(
                        value = query,
                        onValueChange = { query = it.take(100) },
                        modifier = Modifier.fillMaxWidth(),
                        placeholder = { Text("Search $title") },
                        leadingIcon = { Icon(Lucide.Search, contentDescription = null) },
                        trailingIcon = {
                            if (query.isNotEmpty()) IconButton(onClick = { query = "" }) {
                                Icon(Lucide.X, contentDescription = "Clear search")
                            }
                        },
                        singleLine = true,
                        shape = RoundedCornerShape(18.dp),
                    )
                }
                if (statuses.size > 1) item {
                    Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf("ALL") .plus(statuses).forEach { status ->
                            FilterChip(
                                selected = statusFilter == status,
                                onClick = { statusFilter = status },
                                label = { Text(status.replace('_', ' ')) },
                            )
                        }
                    }
                }
                item {
                    Text(if (statusFilter == "ALL") "${state.total} records" else "${visibleRows.size} shown",
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                state.actionMessage?.let { message ->
                    item {
                        Surface(
                            color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.72f),
                            contentColor = MaterialTheme.colorScheme.onPrimaryContainer,
                            shape = RoundedCornerShape(16.dp),
                        ) {
                            Row(
                                Modifier.fillMaxWidth().padding(14.dp),
                                horizontalArrangement = Arrangement.spacedBy(10.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Icon(Lucide.Check, contentDescription = null)
                                Text(message, style = MaterialTheme.typography.bodyMedium)
                            }
                        }
                    }
                }
                if (visibleRows.isEmpty()) item {
                    Text(if (query.isBlank() && statusFilter == "ALL") "No records yet" else "No matching records",
                        color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                items(visibleRows, key = { it.id }) { row ->
                    val rowModifier = when (section) {
                        "queries" -> Modifier.clickable { onTicket(row.id) }
                        "students" -> Modifier.clickable { onStudent(row.id) }
                        else -> Modifier
                    }
                    Surface(modifier = rowModifier,
                        color = MaterialTheme.colorScheme.surface,
                        tonalElevation = 1.dp,
                        shape = RoundedCornerShape(18.dp)) {
                        Column(Modifier.fillMaxWidth().padding(17.dp)) {
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text(row.title, modifier = Modifier.weight(1f), fontWeight = FontWeight.Bold,
                                    maxLines = 2, overflow = TextOverflow.Ellipsis)
                                if (row.status.isNotBlank()) {
                                    Surface(
                                        color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.72f),
                                        contentColor = MaterialTheme.colorScheme.onPrimaryContainer,
                                        shape = RoundedCornerShape(50),
                                    ) {
                                        Text(
                                            row.status.replace('_', ' '),
                                            modifier = Modifier.padding(horizontal = 9.dp, vertical = 4.dp),
                                            style = MaterialTheme.typography.labelSmall,
                                        )
                                    }
                                }
                            }
                            if (row.subtitle.isNotBlank()) Text(row.subtitle,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant)
                            if (row.detail.isNotBlank()) {
                                Spacer(Modifier.height(7.dp))
                                Text(row.detail, style = MaterialTheme.typography.bodyMedium,
                                    maxLines = 3, overflow = TextOverflow.Ellipsis)
                            }
                            if (section == "leave" && row.status == "PENDING") {
                                Spacer(Modifier.height(14.dp))
                                Row(
                                    Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                                ) {
                                    OutlinedButton(
                                        onClick = {
                                            decisionRequest = row.id
                                            decisionType = "REJECTED"
                                            decisionNote = ""
                                        },
                                        modifier = Modifier.weight(1f),
                                        enabled = state.savingId == null,
                                        shape = RoundedCornerShape(14.dp),
                                    ) {
                                        Icon(Lucide.X, contentDescription = null)
                                        Spacer(Modifier.width(7.dp))
                                        Text("Reject")
                                    }
                                    Button(
                                        onClick = {
                                            decisionRequest = row.id
                                            decisionType = "APPROVED"
                                            decisionNote = ""
                                        },
                                        modifier = Modifier.weight(1f),
                                        enabled = state.savingId == null,
                                        shape = RoundedCornerShape(14.dp),
                                    ) {
                                        Icon(Lucide.Check, contentDescription = null)
                                        Spacer(Modifier.width(7.dp))
                                        Text("Approve")
                                    }
                                }
                            }
                        }
                    }
                }
                item {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically) {
                        OutlinedButton(onClick = { viewModel.load(section, state.page - 1, query) },
                            enabled = !state.loading && state.page > 1) { Text("Previous") }
                        Text("Page ${state.page} of ${((state.total + state.pageSize - 1) / state.pageSize).coerceAtLeast(1)}",
                            style = MaterialTheme.typography.bodySmall)
                        OutlinedButton(onClick = { viewModel.load(section, state.page + 1, query) },
                            enabled = !state.loading && state.page * state.pageSize < state.total) { Text("Next") }
                    }
                }
                if (state.loading) item { CircularProgressIndicator() }
                state.error?.let { message -> item { Text(message, color = MaterialTheme.colorScheme.error) } }
            }
        }
        }
    }
}

@Composable
internal fun AdminSectionSkeleton(modifier: Modifier = Modifier) {
    val transition = rememberInfiniteTransition(label = "section-skeleton")
    val pulse by transition.animateFloat(
        initialValue = 0.42f,
        targetValue = 0.82f,
        animationSpec = infiniteRepeatable(tween(850), repeatMode = RepeatMode.Reverse),
        label = "section-skeleton-pulse",
    )
    val fill = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = pulse)
    LazyColumn(modifier.fillMaxSize(), contentPadding = PaddingValues(18.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item { Box(Modifier.width(100.dp).height(16.dp).clip(RoundedCornerShape(8.dp)).background(fill)) }
        items(6) {
            Column(Modifier.fillMaxWidth().height(104.dp).clip(RoundedCornerShape(18.dp))
                .background(fill).padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Box(Modifier.fillMaxWidth(0.62f).height(15.dp).clip(RoundedCornerShape(7.dp))
                    .background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.10f)))
                Box(Modifier.fillMaxWidth(0.42f).height(12.dp).clip(RoundedCornerShape(6.dp))
                    .background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.08f)))
                Box(Modifier.fillMaxWidth(0.78f).height(12.dp).clip(RoundedCornerShape(6.dp))
                    .background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.08f)))
            }
        }
    }
}
