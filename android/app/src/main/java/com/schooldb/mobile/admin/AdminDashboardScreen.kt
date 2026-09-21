package com.schooldb.mobile.admin

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.automirrored.filled.OpenInNew
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.schooldb.mobile.BuildConfig
import com.schooldb.mobile.network.AuthenticatedApiClient
import com.schooldb.mobile.network.ApiException
import com.schooldb.mobile.teacher.MobileContext
import java.io.IOException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

internal data class RecentTicket(
    val id: String,
    val number: String,
    val subject: String,
    val status: String,
    val priority: String,
    val parentQuery: Boolean,
)

internal data class AdminDashboard(
    val academicYear: String?,
    val students: Int,
    val teachers: Int,
    val classes: Int,
    val attendanceSessionsToday: Int,
    val pendingLeaveRequests: Int,
    val openTickets: Int,
    val inProgressTickets: Int,
    val urgentTickets: Int,
    val parentQueries: Int,
    val recentTickets: List<RecentTicket>,
)

internal data class AdminUiState(
    val dashboard: AdminDashboard? = null,
    val loading: Boolean = true,
    val error: String? = null,
)

internal class AdminDashboardViewModel : ViewModel() {
    private val api = AuthenticatedApiClient()
    private val mutableState = MutableStateFlow(AdminUiState())
    val state = mutableState.asStateFlow()

    fun refresh() {
        if (mutableState.value.loading && mutableState.value.dashboard != null) return
        mutableState.value = mutableState.value.copy(loading = true, error = null)
        viewModelScope.launch {
            try {
                val data = withContext(Dispatchers.IO) { api.get("api/v1/mobile/admin/dashboard") }
                val rows = data.getJSONArray("recentTickets")
                val dashboard = AdminDashboard(
                    academicYear = data.optString("academicYearName").takeIf { it.isNotBlank() && it != "null" },
                    students = data.optInt("students"),
                    teachers = data.optInt("teachers"),
                    classes = data.optInt("classes"),
                    attendanceSessionsToday = data.optInt("attendanceSessionsToday"),
                    pendingLeaveRequests = data.optInt("pendingLeaveRequests"),
                    openTickets = data.optInt("openTickets"),
                    inProgressTickets = data.optInt("inProgressTickets"),
                    urgentTickets = data.optInt("urgentTickets"),
                    parentQueries = data.optInt("parentQueries"),
                    recentTickets = (0 until rows.length()).map { index ->
                        val item = rows.getJSONObject(index)
                        RecentTicket(
                            id = item.getString("id"),
                            number = item.getString("ticketNo"),
                            subject = item.getString("subject"),
                            status = item.getString("status"),
                            priority = item.getString("priority"),
                            parentQuery = item.optString("source") == "PARENT_QR",
                        )
                    },
                )
                mutableState.value = AdminUiState(dashboard = dashboard, loading = false)
            } catch (error: Exception) {
                mutableState.value = mutableState.value.copy(
                    loading = false,
                    error = when (error) {
                        is ApiException -> error.message
                        is IOException -> "Could not reach SchoolDB. Check your connection."
                        else -> "Could not load the admin dashboard."
                    },
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminDashboardScreen(
    school: MobileContext,
    refreshKey: Int,
    onSwitchAccount: () -> Unit,
) {
    val viewModel: AdminDashboardViewModel = viewModel(key = "admin-dashboard-${school.schoolSlug}")
    val state by viewModel.state.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val schoolUrl = BuildConfig.API_BASE_URL.trimEnd('/') + "/" + Uri.encode(school.schoolSlug)
    fun openWebsite(path: String) {
        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("$schoolUrl/$path")))
    }

    LaunchedEffect(refreshKey) {
        if (refreshKey == 0) {
            withFrameNanos { }
            delay(50)
        }
        viewModel.refresh()
    }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("SchoolDB Admin", fontWeight = FontWeight.Bold)
                        Text(school.schoolName, style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                },
                actions = {
                    IconButton(onClick = viewModel::refresh, enabled = !state.loading) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh dashboard")
                    }
                    IconButton(onClick = onSwitchAccount) {
                        Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = "Switch account or role")
                    }
                },
            )
        },
    ) { padding ->
        val dashboard = state.dashboard
        if (dashboard == null && state.loading) {
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else if (dashboard == null) {
            Column(Modifier.fillMaxSize().padding(padding).padding(24.dp),
                verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally) {
                Text(state.error ?: "Dashboard is unavailable", style = MaterialTheme.typography.titleMedium)
                Spacer(Modifier.height(12.dp))
                Button(onClick = viewModel::refresh) { Text("Try again") }
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentPadding = PaddingValues(18.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                item {
                    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primary),
                        shape = RoundedCornerShape(22.dp)) {
                        Column(Modifier.fillMaxWidth().padding(22.dp)) {
                            Text("WELCOME BACK", color = MaterialTheme.colorScheme.onPrimary,
                                style = MaterialTheme.typography.labelSmall)
                            Text(school.userName, color = MaterialTheme.colorScheme.onPrimary,
                                style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                            Spacer(Modifier.height(8.dp))
                            Text(dashboard.academicYear?.let { "Academic year $it" } ?: "No active academic year",
                                color = MaterialTheme.colorScheme.onPrimary)
                        }
                    }
                }
                item { SectionHeading("School at a glance") }
                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        AdminMetric("Students", dashboard.students, Modifier.weight(1f))
                        AdminMetric("Teachers", dashboard.teachers, Modifier.weight(1f))
                    }
                }
                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        AdminMetric("Classes", dashboard.classes, Modifier.weight(1f))
                        AdminMetric("Sessions today", dashboard.attendanceSessionsToday, Modifier.weight(1f))
                    }
                }
                item { SectionHeading("Needs attention") }
                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        AdminMetric("Open tickets", dashboard.openTickets, Modifier.weight(1f))
                        AdminMetric("In progress", dashboard.inProgressTickets, Modifier.weight(1f))
                    }
                }
                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        AdminMetric("Urgent tickets", dashboard.urgentTickets, Modifier.weight(1f))
                        AdminMetric("Parent queries", dashboard.parentQueries, Modifier.weight(1f))
                    }
                }
                item { AdminMetric("Pending leave requests", dashboard.pendingLeaveRequests, Modifier.fillMaxWidth()) }
                item { SectionHeading("Recent tickets") }
                if (dashboard.recentTickets.isEmpty()) item {
                    Text("No tickets yet", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                items(dashboard.recentTickets, key = { it.id }) { ticket ->
                    Card(
                        modifier = if (ticket.parentQuery) Modifier.clickable {
                            openWebsite("parent-queries/${Uri.encode(ticket.id)}")
                        } else Modifier,
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        shape = RoundedCornerShape(16.dp),
                    ) {
                        Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f)) {
                                Text(ticket.number + if (ticket.parentQuery) " · Parent query" else "",
                                    style = MaterialTheme.typography.labelMedium,
                                    color = MaterialTheme.colorScheme.primary)
                                Text(ticket.subject, fontWeight = FontWeight.SemiBold,
                                    maxLines = 1, overflow = TextOverflow.Ellipsis)
                                Text(ticket.status.replace('_', ' ') + " · " + ticket.priority,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            if (ticket.parentQuery) {
                                Spacer(Modifier.width(8.dp))
                                Icon(Icons.AutoMirrored.Filled.OpenInNew, contentDescription = "Open on website")
                            }
                        }
                    }
                }
                item { SectionHeading("Manage on website") }
                item {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        AdminLink("Parent queries", "parent-queries", ::openWebsite)
                        AdminLink("Attendance", "attendance/dashboard", ::openWebsite)
                        AdminLink("Students", "students", ::openWebsite)
                        AdminLink("Fees", "fees/dashboard", ::openWebsite)
                        AdminLink("Leave requests", "leave-requests", ::openWebsite)
                    }
                }
                if (state.loading) item { CircularProgressIndicator() }
                state.error?.let { message -> item { Text(message, color = MaterialTheme.colorScheme.error) } }
            }
        }
    }
}

@Composable
private fun SectionHeading(title: String) {
    Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
}

@Composable
private fun AdminMetric(label: String, value: Int, modifier: Modifier = Modifier) {
    Card(modifier, colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        shape = RoundedCornerShape(16.dp)) {
        Column(Modifier.fillMaxWidth().padding(16.dp)) {
            Text(value.toString(), style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary)
            Text(label, style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun AdminLink(label: String, path: String, openWebsite: (String) -> Unit) {
    Card(onClick = { openWebsite(path) }, shape = RoundedCornerShape(14.dp)) {
        Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(label, Modifier.weight(1f), fontWeight = FontWeight.SemiBold)
            Icon(Icons.AutoMirrored.Filled.OpenInNew, contentDescription = "Open $label on website")
        }
    }
}
