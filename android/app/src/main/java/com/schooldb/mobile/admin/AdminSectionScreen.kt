package com.schooldb.mobile.admin

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.clickable
import androidx.compose.foundation.BorderStroke
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.schooldb.mobile.network.ApiException
import com.schooldb.mobile.network.AuthenticatedApiClient
import com.composables.icons.lucide.ArrowLeft
import com.composables.icons.lucide.Lucide
import com.composables.icons.lucide.RefreshCw
import java.io.IOException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
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
)

internal class AdminSectionViewModel : ViewModel() {
    private val api = AuthenticatedApiClient()
    private val mutableState = MutableStateFlow(AdminSectionState())
    val state = mutableState.asStateFlow()

    fun load(section: String, page: Int = mutableState.value.page) {
        mutableState.value = mutableState.value.copy(loading = true, error = null)
        viewModelScope.launch {
            try {
                val data = withContext(Dispatchers.IO) {
                    api.get("api/v1/mobile/admin/sections?section=$section&page=$page")
                }
                val items = data.getJSONArray("rows")
                mutableState.value = AdminSectionState(
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
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminSectionScreen(section: String, onBack: () -> Unit, onTicket: (String) -> Unit) {
    val viewModel: AdminSectionViewModel = viewModel(key = "admin-section-$section")
    val state by viewModel.state.collectAsStateWithLifecycle()
    val title = sectionTitles[section] ?: "School data"
    BackHandler(onBack = onBack)
    LaunchedEffect(section) { viewModel.load(section, 1) }

    Scaffold(topBar = {
        TopAppBar(title = { Text(title, fontWeight = FontWeight.Bold) },
            navigationIcon = {
                IconButton(onClick = onBack) {
                    Icon(Lucide.ArrowLeft, contentDescription = "Back")
                }
            },
            actions = {
                IconButton(onClick = { viewModel.load(section) }, enabled = !state.loading) {
                    Icon(Lucide.RefreshCw, contentDescription = "Refresh $title")
                }
            })
    }) { padding ->
        if (state.loading && state.rows.isEmpty()) {
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else if (state.error != null && state.rows.isEmpty()) {
            Column(Modifier.fillMaxSize().padding(padding).padding(24.dp),
                verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally) {
                Text(state.error ?: "Could not load", color = MaterialTheme.colorScheme.error)
                Spacer(Modifier.height(12.dp))
                Button(onClick = { viewModel.load(section) }) { Text("Try again") }
            }
        } else {
            LazyColumn(Modifier.fillMaxSize().padding(padding),
                contentPadding = PaddingValues(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                item {
                    Text("$title · ${state.total}", style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold)
                    Text(sectionDescriptions[section] ?: "School records in this section",
                        color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                if (state.rows.isEmpty()) item {
                    Text("No records yet", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                items(state.rows, key = { it.id }) { row ->
                    Card(modifier = if (section == "queries") Modifier.clickable { onTicket(row.id) } else Modifier,
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.55f)),
                        shape = RoundedCornerShape(16.dp)) {
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
                        }
                    }
                }
                item {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically) {
                        OutlinedButton(onClick = { viewModel.load(section, state.page - 1) },
                            enabled = !state.loading && state.page > 1) { Text("Previous") }
                        Text("Page ${state.page} of ${((state.total + state.pageSize - 1) / state.pageSize).coerceAtLeast(1)}",
                            style = MaterialTheme.typography.bodySmall)
                        OutlinedButton(onClick = { viewModel.load(section, state.page + 1) },
                            enabled = !state.loading && state.page * state.pageSize < state.total) { Text("Next") }
                    }
                }
                if (state.loading) item { CircularProgressIndicator() }
                state.error?.let { message -> item { Text(message, color = MaterialTheme.colorScheme.error) } }
            }
        }
    }
}
