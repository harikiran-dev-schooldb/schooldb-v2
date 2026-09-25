package com.schooldb.mobile.admin

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.Apps
import androidx.compose.material.icons.filled.Assessment
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.QuestionAnswer
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.outlined.Campaign
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material3.Button
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.schooldb.mobile.network.AuthenticatedApiClient
import com.schooldb.mobile.network.ApiException
import com.schooldb.mobile.R
import com.schooldb.mobile.teacher.MobileContext
import java.io.IOException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.text.NumberFormat
import java.util.Locale

internal data class RecentTicket(
    val id: String,
    val number: String,
    val subject: String,
    val status: String,
    val priority: String,
    val parentQuery: Boolean,
)

internal data class AdminAnnouncement(
    val id: String,
    val title: String,
    val body: String,
    val category: String,
    val priority: String,
    val target: String,
    val date: String,
    val read: Boolean,
)

internal data class AdminCalendarEvent(
    val id: String,
    val title: String,
    val category: String,
    val startDate: String,
    val endDate: String,
    val target: String,
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
    val unreadAnnouncements: Int,
    val announcements: List<AdminAnnouncement>,
    val upcomingEvents: List<AdminCalendarEvent>,
)

internal data class ReportBar(val name: String, val value: Int)
internal data class ReportDay(val date: String, val absent: Int)
internal data class AdminReport(
    val available: Boolean,
    val academicYear: String = "",
    val from: String = "",
    val to: String = "",
    val students: Int = 0,
    val classes: List<ReportBar> = emptyList(),
    val attendancePercentage: Double = 0.0,
    val attendanceSessions: Int = 0,
    val attendanceRecords: Int = 0,
    val lowAttendanceCount: Int = 0,
    val dailyAbsences: List<ReportDay> = emptyList(),
    val feesCollected: Double = 0.0,
    val feesOutstanding: Double = 0.0,
    val feesPayable: Double = 0.0,
    val feePayments: Int = 0,
    val examAverage: Double = 0.0,
    val passRate: Double = 0.0,
    val homework: Int = 0,
    val subjects: List<Pair<String, Double>> = emptyList(),
    val overdueLoans: Int = 0,
    val transportAssignments: Int = 0,
)

internal data class AdminUiState(
    val dashboard: AdminDashboard? = null,
    val loading: Boolean = true,
    val error: String? = null,
    val report: AdminReport? = null,
    val reportLoading: Boolean = false,
    val reportError: String? = null,
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
                val announcementRows = data.optJSONArray("announcements")
                val eventRows = data.optJSONArray("upcomingEvents")
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
                    unreadAnnouncements = data.optInt("unreadAnnouncements"),
                    announcements = (0 until (announcementRows?.length() ?: 0)).map { index ->
                        announcementRows!!.getJSONObject(index).let { item ->
                            AdminAnnouncement(
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
                    upcomingEvents = (0 until (eventRows?.length() ?: 0)).map { index ->
                        eventRows!!.getJSONObject(index).let { item ->
                            AdminCalendarEvent(
                                id = item.getString("id"),
                                title = item.optString("title"),
                                category = item.optString("category"),
                                startDate = item.optString("startDate").take(10),
                                endDate = item.optString("endDate").take(10),
                                target = item.optString("targetLabel"),
                            )
                        }
                    },
                )
                mutableState.value = mutableState.value.copy(dashboard = dashboard, loading = false, error = null)
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

    fun loadReport() {
        if (mutableState.value.reportLoading) return
        mutableState.value = mutableState.value.copy(reportLoading = true, reportError = null)
        viewModelScope.launch {
            try {
                val data = withContext(Dispatchers.IO) { api.get("api/v1/mobile/admin/reports") }
                val report = if (!data.optBoolean("available")) AdminReport(available = false) else {
                    val scope = data.getJSONObject("scope")
                    val students = data.getJSONObject("students")
                    val attendance = data.getJSONObject("attendance")
                    val fees = data.getJSONObject("fees")
                    val academics = data.getJSONObject("academics")
                    val operations = data.getJSONObject("operations")
                    val classes = students.getJSONArray("classes")
                    val days = attendance.getJSONArray("daily")
                    val subjects = academics.getJSONArray("subjects")
                    AdminReport(
                        available = true,
                        academicYear = scope.optString("academicYearName"),
                        from = scope.optString("from"),
                        to = scope.optString("to"),
                        students = students.optInt("total"),
                        classes = (0 until classes.length()).map { index ->
                            classes.getJSONObject(index).let { ReportBar(it.optString("name"), it.optInt("count")) }
                        },
                        attendancePercentage = attendance.optDouble("percentage"),
                        attendanceSessions = attendance.optInt("sessions"),
                        attendanceRecords = attendance.optInt("total"),
                        lowAttendanceCount = attendance.optInt("lowCount"),
                        dailyAbsences = (0 until days.length()).map { index ->
                            days.getJSONObject(index).let { ReportDay(it.optString("date"), it.optInt("absent")) }
                        },
                        feesCollected = fees.optDouble("collected"),
                        feesOutstanding = fees.optDouble("outstanding"),
                        feesPayable = fees.optDouble("payable"),
                        feePayments = fees.optInt("payments"),
                        examAverage = academics.optDouble("averagePercentage"),
                        passRate = academics.optDouble("passPercentage"),
                        homework = academics.optInt("homework"),
                        subjects = (0 until subjects.length()).map { index ->
                            subjects.getJSONObject(index).let { it.optString("name") to it.optDouble("averagePercentage") }
                        },
                        overdueLoans = operations.optInt("overdueLoans"),
                        transportAssignments = operations.optInt("transportAssignments"),
                    )
                }
                mutableState.value = mutableState.value.copy(report = report, reportLoading = false, reportError = null)
            } catch (error: Exception) {
                mutableState.value = mutableState.value.copy(
                    reportLoading = false,
                    reportError = when (error) {
                        is ApiException -> error.message
                        is IOException -> "Could not reach SchoolDB. Check your connection."
                        else -> "Could not load reports."
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
    var selectedTab by rememberSaveable(school.schoolSlug) { mutableStateOf("Home") }
    var selectedSection by rememberSaveable(school.schoolSlug) { mutableStateOf<String?>(null) }
    var selectedTicket by rememberSaveable(school.schoolSlug) { mutableStateOf<String?>(null) }
    var showAnnouncements by rememberSaveable(school.schoolSlug) { mutableStateOf(false) }
    BackHandler(enabled = selectedSection != null || selectedTicket != null || showAnnouncements) {
        when {
            selectedTicket != null -> selectedTicket = null
            selectedSection != null -> selectedSection = null
            else -> showAnnouncements = false
        }
    }

    if (showAnnouncements) {
        AdminNotificationsScreen(onBack = {
            showAnnouncements = false
            viewModel.refresh()
        })
        return
    }
    selectedTicket?.let { ticketId ->
        AdminTicketScreen(ticketId, onBack = { selectedTicket = null })
        return
    }
    selectedSection?.let { section ->
        AdminSectionScreen(section, onBack = { selectedSection = null }, onTicket = { selectedTicket = it })
        return
    }

    LaunchedEffect(refreshKey) {
        if (refreshKey == 0) {
            withFrameNanos { }
            delay(50)
        }
        viewModel.refresh()
    }
    LaunchedEffect(selectedTab) {
        if (selectedTab == "Reports" && state.report == null && !state.reportLoading) {
            withFrameNanos { }
            delay(50)
            viewModel.loadReport()
        }
    }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        bottomBar = {
            PremiumAdminNavigation(selectedTab = selectedTab, onSelect = { selectedTab = it })
        },
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(when (selectedTab) {
                            "Reports" -> "Reports & Analytics"
                            "Queries" -> "Queries"
                            "More" -> "School tools"
                            else -> "Overview"
                        }, fontWeight = FontWeight.Bold)
                        Text(school.schoolName, style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                },
                actions = {
                    if (selectedTab == "Home") {
                        PremiumIconButton(onClick = { showAnnouncements = true }) {
                            BadgedBox(badge = {
                                val unread = state.dashboard?.unreadAnnouncements ?: 0
                                if (unread > 0) Badge { Text(unread.coerceAtMost(99).toString()) }
                            }) {
                                Icon(Icons.Filled.Notifications, contentDescription = "Announcements",
                                    modifier = Modifier.size(20.dp))
                            }
                        }
                    }
                    Spacer(Modifier.width(7.dp))
                    PremiumIconButton(
                        onClick = { if (selectedTab == "Reports") viewModel.loadReport() else viewModel.refresh() },
                        enabled = if (selectedTab == "Reports") !state.reportLoading else !state.loading,
                    ) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh dashboard",
                            modifier = Modifier.size(20.dp))
                    }
                    Spacer(Modifier.width(7.dp))
                    Surface(onClick = onSwitchAccount, modifier = Modifier.size(42.dp), shape = CircleShape,
                        color = MaterialTheme.colorScheme.primary) {
                        Box(contentAlignment = Alignment.Center) {
                            Text(school.userName.trim().take(1).uppercase().ifBlank { "S" },
                                color = MaterialTheme.colorScheme.onPrimary,
                                fontWeight = FontWeight.Bold)
                        }
                    }
                    Spacer(Modifier.width(12.dp))
                },
            )
        },
    ) { padding ->
        val dashboard = state.dashboard
        if (selectedTab == "Reports") {
            ReportsTab(state, Modifier.padding(padding), viewModel::loadReport)
        } else if (selectedTab == "More") {
            MoreTab(Modifier.padding(padding), onSection = { selectedSection = it })
        } else if (dashboard == null && state.loading) {
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
        } else if (selectedTab == "Queries") {
            QueriesTab(dashboard, Modifier.padding(padding),
                onTicket = { selectedTicket = it }, onAllQueries = { selectedSection = "queries" })
        } else {
            AdminHomeTab(
                school = school,
                dashboard = dashboard,
                state = state,
                modifier = Modifier.padding(padding),
                onSection = { selectedSection = it },
                onQueries = { selectedTab = "Queries" },
                onTicket = { selectedTicket = it },
                onAnnouncements = { showAnnouncements = true },
            )
        }
    }
}

private data class AdminNavDestination(
    val key: String,
    val label: String,
    val icon: ImageVector,
)

@Composable
private fun PremiumAdminNavigation(
    selectedTab: String,
    onSelect: (String) -> Unit,
) {
    val items = listOf(
        AdminNavDestination("Home", "Home", Icons.Filled.Home),
        AdminNavDestination("Reports", "Reports", Icons.Filled.Assessment),
        AdminNavDestination("Queries", "Queries", Icons.Filled.QuestionAnswer),
        AdminNavDestination("More", "More", Icons.Filled.Apps),
    )
    Surface(color = MaterialTheme.colorScheme.background) {
        Surface(
            modifier = Modifier
                .navigationBarsPadding()
                .padding(horizontal = 14.dp, vertical = 9.dp),
            shape = RoundedCornerShape(28.dp),
            color = MaterialTheme.colorScheme.surface,
            tonalElevation = 4.dp,
            shadowElevation = 10.dp,
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.7f)),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 6.dp, vertical = 7.dp),
            ) {
                items.forEach { item ->
                    val selected = selectedTab == item.key
                    Column(
                        modifier = Modifier
                            .weight(1f)
                            .clickable { onSelect(item.key) }
                            .padding(vertical = 3.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        val iconBackground = if (selected) {
                            Modifier.background(
                                Brush.linearGradient(
                                    listOf(Color(0xFF3154D9), Color(0xFF7557E8)),
                                ),
                                RoundedCornerShape(14.dp),
                            )
                        } else {
                            Modifier.background(Color.Transparent, RoundedCornerShape(14.dp))
                        }
                        Box(
                            modifier = Modifier
                                .width(48.dp)
                                .height(36.dp)
                                .then(iconBackground),
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(
                                imageVector = item.icon,
                                contentDescription = item.label,
                                tint = if (selected) Color.White else MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.size(21.dp),
                            )
                        }
                        Spacer(Modifier.height(4.dp))
                        Text(
                            text = item.label,
                            fontSize = 10.sp,
                            fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
                            color = if (selected) MaterialTheme.colorScheme.primary
                            else MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun PremiumIconButton(
    enabled: Boolean = true,
    onClick: () -> Unit,
    content: @Composable () -> Unit,
) {
    Surface(
        modifier = Modifier.size(42.dp),
        onClick = onClick,
        enabled = enabled,
        shape = CircleShape,
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.72f),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.85f)),
    ) {
        Box(contentAlignment = Alignment.Center) { content() }
    }
}

@Composable
private fun AdminHomeTab(
    school: MobileContext,
    dashboard: AdminDashboard,
    state: AdminUiState,
    modifier: Modifier,
    onSection: (String) -> Unit,
    onQueries: () -> Unit,
    onTicket: (String) -> Unit,
    onAnnouncements: () -> Unit,
) {
    val greeting = when (java.time.LocalTime.now().hour) {
        in 5..11 -> "Good morning"
        in 12..16 -> "Good afternoon"
        else -> "Good evening"
    }
    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 18.dp, vertical = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item {
            Box(Modifier.fillMaxWidth().background(
                Brush.linearGradient(listOf(Color(0xFF111D4C), Color(0xFF3456B8), Color(0xFF7959E8))),
                RoundedCornerShape(28.dp))) {
                Column(Modifier.fillMaxWidth().padding(22.dp)) {
                    Text(greeting.uppercase(), color = Color(0xFFC7D5FF),
                        style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(7.dp))
                    Text(school.userName, color = Color.White,
                        style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                    Text(school.schoolName, color = Color(0xFFE1E7FF),
                        style = MaterialTheme.typography.bodyLarge)
                    Spacer(Modifier.height(18.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Surface(shape = RoundedCornerShape(50), color = Color.White.copy(alpha = 0.14f)) {
                            Text(dashboard.academicYear ?: "Academic year not active",
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 7.dp),
                                color = Color.White, style = MaterialTheme.typography.labelMedium)
                        }
                        Spacer(Modifier.weight(1f))
                        Text("${dashboard.openTickets + dashboard.inProgressTickets} active tickets",
                            color = Color.White, style = MaterialTheme.typography.labelMedium)
                    }
                }
            }
        }

        item {
            val hasUrgent = dashboard.urgentTickets > 0
            val hasLeave = dashboard.pendingLeaveRequests > 0
            Card(
                onClick = { if (hasUrgent) onQueries() else if (hasLeave) onSection("leave") else onAnnouncements() },
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(
                    containerColor = if (hasUrgent) Color(0xFFFFECEE)
                    else MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.65f),
                ),
            ) {
                Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Surface(shape = RoundedCornerShape(15.dp),
                        color = if (hasUrgent) Color(0xFFFFD6DB) else MaterialTheme.colorScheme.surface,
                        modifier = Modifier.size(46.dp)) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(Icons.Filled.Notifications, contentDescription = null,
                                tint = if (hasUrgent) Color(0xFFB42335) else MaterialTheme.colorScheme.primary)
                        }
                    }
                    Column(Modifier.weight(1f)) {
                        Text(when {
                            hasUrgent -> "${dashboard.urgentTickets} urgent support ${if (dashboard.urgentTickets == 1) "ticket" else "tickets"}"
                            hasLeave -> "${dashboard.pendingLeaveRequests} leave requests need review"
                            else -> "Operations are up to date"
                        }, fontWeight = FontWeight.Bold)
                        Text(when {
                            hasUrgent -> "Open the support inbox to take action"
                            hasLeave -> "Review pending requests from students"
                            else -> "Check the latest school announcements"
                        }, style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Icon(Icons.AutoMirrored.Filled.ArrowForward, contentDescription = null)
                }
            }
        }

        item { SectionTitle("Quick actions") }
        item {
            Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                listOf(
                    AdminTool("Attendance", R.drawable.admin_tool_attendance, "attendance"),
                    AdminTool("Students", R.drawable.admin_tool_students, "students"),
                    AdminTool("Fees", R.drawable.admin_tool_fees, "fees"),
                    AdminTool("Leave", R.drawable.admin_tool_leave, "leave"),
                ).forEach { tool ->
                    Card(onClick = { onSection(tool.destination) }, modifier = Modifier.width(104.dp),
                        shape = RoundedCornerShape(19.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                        Column(Modifier.fillMaxWidth().padding(12.dp),
                            horizontalAlignment = Alignment.CenterHorizontally) {
                            Image(painterResource(tool.icon), contentDescription = null,
                                modifier = Modifier.size(48.dp))
                            Spacer(Modifier.height(8.dp))
                            Text(tool.label, style = MaterialTheme.typography.labelMedium,
                                fontWeight = FontWeight.Bold, maxLines = 1)
                        }
                    }
                }
            }
        }

        item { SectionTitle("Today at a glance") }
        item {
            Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                AdminCompactMetric("Students", dashboard.students)
                AdminCompactMetric("Teachers", dashboard.teachers)
                AdminCompactMetric("Classes", dashboard.classes)
                AdminCompactMetric("Sessions", dashboard.attendanceSessionsToday)
            }
        }

        item { SectionTitle("Announcements", "View all", onAnnouncements) }
        if (dashboard.announcements.isEmpty()) item {
            EmptyHomeCard("No active announcements", "New school updates will appear here.")
        }
        items(dashboard.announcements.take(3), key = { "announcement-${it.id}" }) { announcement ->
            Card(onClick = onAnnouncements, shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(
                    containerColor = if (announcement.read) MaterialTheme.colorScheme.surface
                    else MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.55f))) {
                Row(Modifier.fillMaxWidth().padding(16.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Surface(shape = RoundedCornerShape(14.dp),
                        color = MaterialTheme.colorScheme.secondaryContainer,
                        modifier = Modifier.size(44.dp)) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(Icons.Outlined.Campaign, contentDescription = null,
                                tint = MaterialTheme.colorScheme.secondary)
                        }
                    }
                    Column(Modifier.weight(1f)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(announcement.title, modifier = Modifier.weight(1f),
                                fontWeight = FontWeight.Bold, maxLines = 1,
                                overflow = TextOverflow.Ellipsis)
                            if (!announcement.read) Badge()
                        }
                        Text(announcement.body, maxLines = 2, overflow = TextOverflow.Ellipsis,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(Modifier.height(6.dp))
                        Text(listOf(announcement.category.replace('_', ' '), announcement.target, announcement.date)
                            .filter(String::isNotBlank).joinToString(" · "),
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.primary)
                    }
                }
            }
        }

        item { SectionTitle("Coming up") }
        if (dashboard.upcomingEvents.isEmpty()) item {
            EmptyHomeCard("Nothing scheduled", "Upcoming events and holidays will appear here.")
        }
        items(dashboard.upcomingEvents.take(3), key = { "event-${it.id}" }) { event ->
            Card(shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                Row(Modifier.fillMaxWidth().padding(15.dp), verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Surface(shape = RoundedCornerShape(14.dp), color = MaterialTheme.colorScheme.primaryContainer,
                        modifier = Modifier.size(48.dp)) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(Icons.Outlined.CalendarMonth, contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary)
                        }
                    }
                    Column(Modifier.weight(1f)) {
                        Text(event.title, fontWeight = FontWeight.Bold, maxLines = 1,
                            overflow = TextOverflow.Ellipsis)
                        Text(listOf(event.category.replace('_', ' '), event.target)
                            .filter(String::isNotBlank).joinToString(" · "),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Text(shortDate(event.startDate), color = MaterialTheme.colorScheme.primary,
                        style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
                }
            }
        }

        item { SectionTitle("Recent activity", "View queries", onQueries) }
        if (dashboard.recentTickets.isEmpty()) item {
            EmptyHomeCard("No recent activity", "Support and parent query updates will appear here.")
        }
        items(dashboard.recentTickets.take(3), key = { "activity-${it.id}" }) { ticket ->
            Card(onClick = { onTicket(ticket.id) }, shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                Row(Modifier.fillMaxWidth().padding(15.dp), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text(ticket.number, style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.primary)
                        Text(ticket.subject, fontWeight = FontWeight.SemiBold, maxLines = 1,
                            overflow = TextOverflow.Ellipsis)
                        Text(ticket.status.replace('_', ' ') + " · " + ticket.priority,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Icon(Icons.AutoMirrored.Filled.ArrowForward, contentDescription = "Open ticket")
                }
            }
        }
        if (state.loading) item { CircularProgressIndicator() }
        state.error?.let { message -> item { Text(message, color = MaterialTheme.colorScheme.error) } }
    }
}

@Composable
private fun SectionTitle(title: String, action: String? = null, onAction: (() -> Unit)? = null) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Text(title, modifier = Modifier.weight(1f), style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold)
        if (action != null && onAction != null) TextButton(onClick = onAction) { Text(action) }
    }
}

@Composable
private fun AdminCompactMetric(label: String, value: Int) {
    Card(modifier = Modifier.width(124.dp), shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
        Column(Modifier.padding(horizontal = 15.dp, vertical = 14.dp)) {
            Text(value.toString(), style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
            Text(label, style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun EmptyHomeCard(title: String, message: String) {
    Card(shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
        Column(Modifier.fillMaxWidth().padding(16.dp)) {
            Text(title, fontWeight = FontWeight.SemiBold)
            Text(message, style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

private fun shortDate(value: String): String = runCatching {
    java.time.LocalDate.parse(value).format(java.time.format.DateTimeFormatter.ofPattern("dd MMM"))
}.getOrDefault(value)

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
private fun ReportsTab(state: AdminUiState, modifier: Modifier, onRetry: () -> Unit) {
    val report = state.report
    if (report == null) {
        Box(modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            if (state.reportLoading || state.reportError == null) CircularProgressIndicator()
            else Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(state.reportError, color = MaterialTheme.colorScheme.error)
                Spacer(Modifier.height(12.dp))
                Button(onClick = onRetry) { Text("Try again") }
            }
        }
        return
    }
    if (!report.available) {
        Box(modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text("No active academic year", style = MaterialTheme.typography.titleLarge)
                Text("Activate an academic year to see reports.")
                Spacer(Modifier.height(12.dp))
                Button(onClick = onRetry) { Text("Refresh report") }
            }
        }
        return
    }

    LazyColumn(modifier.fillMaxSize(), contentPadding = PaddingValues(18.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item {
            Box(Modifier.fillMaxWidth().background(
                Brush.linearGradient(listOf(Color(0xFF182554), Color(0xFF3657AD), Color(0xFF5D7DE0))),
                RoundedCornerShape(24.dp))) {
                Column(Modifier.padding(22.dp)) {
                    Text("OFFICIAL SCHOOL REPORT", color = Color(0xFFBFD2FF),
                        style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(7.dp))
                    Text(report.academicYear, color = Color.White,
                        style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                    Text("${report.from} to ${report.to} · All classes",
                        color = Color(0xFFDBE7FF), style = MaterialTheme.typography.bodySmall)
                    Spacer(Modifier.height(16.dp))
                    Text("${formatPercent(report.attendancePercentage)} attendance",
                        color = Color.White, style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold)
                }
            }
        }
        item { SectionHeading("Key indicators") }
        item { Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            ReportMetric("Students", report.students.toString(), Modifier.weight(1f))
            ReportMetric("Attendance", formatPercent(report.attendancePercentage), Modifier.weight(1f))
        } }
        item { Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            ReportMetric("Collected", formatMoney(report.feesCollected), Modifier.weight(1f))
            ReportMetric("Outstanding", formatMoney(report.feesOutstanding), Modifier.weight(1f))
        } }
        item { Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            ReportMetric("Exam average", formatPercent(report.examAverage), Modifier.weight(1f))
            ReportMetric("Pass rate", formatPercent(report.passRate), Modifier.weight(1f))
        } }
        item {
            ReportPanel("Attendance trend", "Absentees in the last seven reporting days") {
                ReportBars(report.dailyAbsences.takeLast(7).map { it.date.takeLast(5) to it.absent.toDouble() },
                    suffix = "")
                Spacer(Modifier.height(8.dp))
                Text("${report.attendanceSessions} sessions · ${report.attendanceRecords} records · " +
                    "${report.lowAttendanceCount} below 75%",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        item {
            ReportPanel("Student distribution", "Current enrollment by class") {
                ReportBars(report.classes.map { it.name to it.value.toDouble() }, suffix = "")
            }
        }
        item {
            ReportPanel("Fee position", "Payments against assigned fees") {
                Text("${report.feePayments} successful payments",
                    style = MaterialTheme.typography.bodyMedium)
                Spacer(Modifier.height(8.dp))
                ProgressBar(if (report.feesPayable > 0) report.feesCollected / report.feesPayable else 0.0)
                Spacer(Modifier.height(8.dp))
                Text("${formatMoney(report.feesCollected)} collected · ${formatMoney(report.feesOutstanding)} outstanding",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        item {
            ReportPanel("Academic performance", "Exam marks in this period") {
                ReportBars(report.subjects, maximum = 100.0, suffix = "%")
                Spacer(Modifier.height(8.dp))
                Text("${report.homework} homework assignments published",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        item { Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            AdminMetric("Overdue library", report.overdueLoans, Modifier.weight(1f))
            AdminMetric("Transport assigned", report.transportAssignments, Modifier.weight(1f))
        } }
        item { Button(onClick = onRetry, modifier = Modifier.fillMaxWidth(), enabled = !state.reportLoading) {
            Text("Refresh report")
        } }
        if (state.reportLoading) item { CircularProgressIndicator() }
        state.reportError?.let { message -> item { Text(message, color = MaterialTheme.colorScheme.error) } }
    }
}

@Composable
private fun QueriesTab(dashboard: AdminDashboard, modifier: Modifier,
    onTicket: (String) -> Unit, onAllQueries: () -> Unit) {
    LazyColumn(modifier.fillMaxSize(), contentPadding = PaddingValues(18.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item { Text("Support attention", style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold) }
        item { Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            AdminMetric("Open", dashboard.openTickets, Modifier.weight(1f))
            AdminMetric("In progress", dashboard.inProgressTickets, Modifier.weight(1f))
        } }
        item { Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            AdminMetric("Urgent", dashboard.urgentTickets, Modifier.weight(1f))
            AdminMetric("Parent queries", dashboard.parentQueries, Modifier.weight(1f))
        } }
        item { SectionHeading("Latest tickets") }
        if (dashboard.recentTickets.isEmpty()) item {
            Text("No tickets yet", color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        items(dashboard.recentTickets, key = { it.id }) { ticket ->
            Card(onClick = { onTicket(ticket.id) },
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                shape = RoundedCornerShape(16.dp)) {
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
                    Icon(Icons.AutoMirrored.Filled.ArrowForward,
                        contentDescription = "Open ticket")
                }
            }
        }
        item { Button(onClick = onAllQueries, modifier = Modifier.fillMaxWidth()) {
            Text("View all parent queries")
        } }
    }
}

@Composable
private fun MoreTab(modifier: Modifier, onSection: (String) -> Unit) {
    val tools = listOf(
        AdminTool("Attendance", R.drawable.admin_tool_attendance, "attendance"),
        AdminTool("Students", R.drawable.admin_tool_students, "students"),
        AdminTool("Teachers", R.drawable.admin_tool_teachers, "teachers"),
        AdminTool("Classes", R.drawable.admin_tool_classes, "classes"),
        AdminTool("Fees", R.drawable.admin_tool_fees, "fees"),
        AdminTool("Leave", R.drawable.admin_tool_leave, "leave"),
    )
    LazyColumn(modifier.fillMaxSize(), contentPadding = PaddingValues(horizontal = 18.dp, vertical = 20.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            Text("Manage school", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(4.dp))
            Text("Choose a workspace to view and manage records",
                color = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(Modifier.height(8.dp))
        }
        items(tools.chunked(3)) { row ->
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                row.forEach { tool ->
                    AdminToolTile(tool, Modifier.weight(1f)) { onSection(tool.destination) }
                }
                repeat(3 - row.size) { Spacer(Modifier.weight(1f)) }
            }
        }
    }
}

private data class AdminTool(val label: String, val icon: Int, val destination: String)

@Composable
private fun AdminToolTile(tool: AdminTool, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Card(onClick = onClick, modifier = modifier.aspectRatio(0.90f),
        shape = RoundedCornerShape(20.dp),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.8f)),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp, pressedElevation = 0.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
        Column(Modifier.fillMaxSize().padding(horizontal = 8.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally) {
            Image(painter = painterResource(tool.icon), contentDescription = null,
                modifier = Modifier.size(58.dp))
            Spacer(Modifier.height(10.dp))
            Text(tool.label, style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold, maxLines = 2, overflow = TextOverflow.Ellipsis,
                textAlign = TextAlign.Center)
        }
    }
}

@Composable
private fun ReportMetric(label: String, value: String, modifier: Modifier = Modifier) {
    Card(modifier, colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        shape = RoundedCornerShape(16.dp)) {
        Column(Modifier.fillMaxWidth().padding(15.dp)) {
            Text(value, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary, maxLines = 1)
            Text(label, style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun ReportPanel(title: String, subtitle: String, content: @Composable () -> Unit) {
    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        shape = RoundedCornerShape(18.dp)) {
        Column(Modifier.fillMaxWidth().padding(18.dp)) {
            Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            Text(subtitle, style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(Modifier.height(16.dp))
            content()
        }
    }
}

@Composable
private fun ReportBars(rows: List<Pair<String, Double>>, maximum: Double? = null, suffix: String) {
    if (rows.isEmpty()) {
        Text("No data in this period", color = MaterialTheme.colorScheme.onSurfaceVariant)
        return
    }
    val ceiling = maximum ?: rows.maxOf { it.second }.coerceAtLeast(1.0)
    Column(verticalArrangement = Arrangement.spacedBy(11.dp)) {
        rows.forEach { (label, value) ->
            Column {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text(label, style = MaterialTheme.typography.bodySmall, maxLines = 1,
                        modifier = Modifier.weight(1f))
                    Text("${formatNumber(value)}$suffix", style = MaterialTheme.typography.bodySmall,
                        fontWeight = FontWeight.Bold)
                }
                Spacer(Modifier.height(5.dp))
                ProgressBar(value / ceiling)
            }
        }
    }
}

@Composable
private fun ProgressBar(fraction: Double) {
    Box(Modifier.fillMaxWidth().height(8.dp).background(MaterialTheme.colorScheme.primaryContainer,
        RoundedCornerShape(50))) {
        Box(Modifier.fillMaxWidth(fraction.coerceIn(0.0, 1.0).toFloat()).height(8.dp)
            .background(Brush.horizontalGradient(listOf(Color(0xFF4F46E5), Color(0xFF38BDF8))),
                RoundedCornerShape(50)))
    }
}

private fun formatNumber(value: Double) = if (value % 1.0 == 0.0) value.toInt().toString()
    else String.format(Locale.US, "%.1f", value)

private fun formatPercent(value: Double) = "${formatNumber(value)}%"

private fun formatMoney(value: Double): String = NumberFormat.getCurrencyInstance(Locale.forLanguageTag("en-IN"))
    .apply { maximumFractionDigits = 0 }.format(value)
