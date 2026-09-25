package com.schooldb.mobile.admin

import androidx.activity.compose.BackHandler
import androidx.compose.animation.Crossfade
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.BorderStroke
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
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
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
import com.schooldb.mobile.teacher.MobileContext
import com.composables.icons.lucide.Lucide
import com.composables.icons.lucide.Activity
import com.composables.icons.lucide.ArrowRight
import com.composables.icons.lucide.Bell
import com.composables.icons.lucide.CalendarCheck
import com.composables.icons.lucide.CalendarDays
import com.composables.icons.lucide.ChartNoAxesColumnIncreasing
import com.composables.icons.lucide.CircleAlert
import com.composables.icons.lucide.ClipboardCheck
import com.composables.icons.lucide.GraduationCap
import com.composables.icons.lucide.House
import com.composables.icons.lucide.LayoutGrid
import com.composables.icons.lucide.Megaphone
import com.composables.icons.lucide.MessageSquareText
import com.composables.icons.lucide.RefreshCw
import com.composables.icons.lucide.School
import com.composables.icons.lucide.Sparkles
import com.composables.icons.lucide.Users
import com.composables.icons.lucide.WalletCards
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

    fun refresh(forceRefresh: Boolean = false) {
        if (mutableState.value.loading && mutableState.value.dashboard != null) return
        mutableState.value = mutableState.value.copy(loading = true, error = null)
        viewModelScope.launch {
            try {
                val data = withContext(Dispatchers.IO) {
                    api.get("api/v1/mobile/admin/dashboard", cacheTtlMillis = 120_000L,
                        forceRefresh = forceRefresh)
                }
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

    fun loadReport(forceRefresh: Boolean = false) {
        if (mutableState.value.reportLoading) return
        mutableState.value = mutableState.value.copy(reportLoading = true, reportError = null)
        viewModelScope.launch {
            try {
                val data = withContext(Dispatchers.IO) {
                    api.get("api/v1/mobile/admin/reports", cacheTtlMillis = 300_000L,
                        forceRefresh = forceRefresh)
                }
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
            viewModel.refresh(forceRefresh = true)
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
            PremiumAdminNavigation(
                selectedTab = selectedTab,
                homeBadge = state.dashboard?.unreadAnnouncements ?: 0,
                queriesBadge = state.dashboard?.let { it.openTickets + it.inProgressTickets } ?: 0,
                onSelect = { selectedTab = it },
            )
        },
        topBar = {
            Column(
                Modifier.fillMaxWidth()
                    .background(MaterialTheme.colorScheme.background)
                    .statusBarsPadding()
                    .padding(start = 20.dp, end = 14.dp, top = 12.dp, bottom = 10.dp),
            ) {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text(school.schoolName.uppercase(), fontSize = 10.sp,
                            letterSpacing = 1.3.sp, fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text("SchoolDB", style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold)
                    }
                    if (selectedTab == "Home") {
                        PremiumIconButton(onClick = { showAnnouncements = true }) {
                            BadgedBox(badge = {
                                val unread = state.dashboard?.unreadAnnouncements ?: 0
                                if (unread > 0) Badge { Text(unread.coerceAtMost(99).toString()) }
                            }) {
                                Icon(Lucide.Bell, contentDescription = "Announcements",
                                    modifier = Modifier.size(20.dp))
                            }
                        }
                    }
                    Spacer(Modifier.width(8.dp))
                    PremiumIconButton(
                        onClick = {
                            if (selectedTab == "Reports") viewModel.loadReport(forceRefresh = true)
                            else viewModel.refresh(forceRefresh = true)
                        },
                        enabled = if (selectedTab == "Reports") !state.reportLoading else !state.loading,
                    ) {
                        Icon(Lucide.RefreshCw, contentDescription = "Refresh dashboard",
                            modifier = Modifier.size(20.dp))
                    }
                    Spacer(Modifier.width(8.dp))
                    Surface(onClick = onSwitchAccount, modifier = Modifier.size(42.dp), shape = CircleShape,
                        color = MaterialTheme.colorScheme.onSurface) {
                        Box(contentAlignment = Alignment.Center) {
                            Text(school.userName.trim().take(1).uppercase().ifBlank { "S" },
                                color = MaterialTheme.colorScheme.surface,
                                fontWeight = FontWeight.Bold)
                        }
                    }
                }
                Spacer(Modifier.height(12.dp))
                Text(when (selectedTab) {
                    "Reports" -> "Reports"
                    "Queries" -> "Queries"
                    "More" -> "School tools"
                    else -> "Overview"
                }, fontSize = 32.sp, lineHeight = 36.sp, fontWeight = FontWeight.ExtraBold,
                    letterSpacing = (-0.6).sp)
            }
        },
    ) { padding ->
        val dashboard = state.dashboard
        PullToRefreshBox(
            isRefreshing = if (selectedTab == "Reports") state.reportLoading else state.loading,
            onRefresh = {
                if (selectedTab == "Reports") viewModel.loadReport(forceRefresh = true)
                else viewModel.refresh(forceRefresh = true)
            },
            modifier = Modifier.fillMaxSize(),
        ) {
        Crossfade(targetState = selectedTab, animationSpec = tween(220), label = "admin-tabs") { tab ->
            if (tab == "Reports") {
                ReportsTab(state, Modifier.padding(padding)) { viewModel.loadReport(forceRefresh = true) }
            } else if (tab == "More") {
                MoreTab(Modifier.padding(padding), onSection = { selectedSection = it })
            } else if (dashboard == null && state.loading) {
                AdminDashboardSkeleton(Modifier.padding(padding))
            } else if (dashboard == null) {
                Column(Modifier.fillMaxSize().padding(padding).padding(24.dp),
                    verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(state.error ?: "Dashboard is unavailable", style = MaterialTheme.typography.titleMedium)
                    Spacer(Modifier.height(12.dp))
                    Button(onClick = viewModel::refresh) { Text("Try again") }
                }
            } else if (tab == "Queries") {
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
    homeBadge: Int,
    queriesBadge: Int,
    onSelect: (String) -> Unit,
) {
    val haptic = LocalHapticFeedback.current
    val darkTheme = MaterialTheme.colorScheme.background.luminance() < 0.5f
    val dockColors = if (darkTheme) {
        listOf(Color(0xEE454547), Color(0xF52D2D30), Color(0xF23A3A3D))
    } else {
        listOf(Color(0xF8FFFFFF), Color(0xF3F4F6FF), Color(0xF8FFFFFF))
    }
    val dockBorder = if (darkTheme) Color.White.copy(alpha = 0.16f)
        else Color.White.copy(alpha = 0.96f)
    val inactiveColor = if (darkTheme) Color.White.copy(alpha = 0.72f) else Color(0xFF667085)
    val selectedColor = if (darkTheme) Color(0xF0121213) else Color(0xFFE1E9FF)
    val selectedIconColor = if (darkTheme) Color.White else Color(0xFF3154D9)
    val items = listOf(
        AdminNavDestination("Home", "Home", Lucide.House),
        AdminNavDestination("Reports", "Reports", Lucide.ChartNoAxesColumnIncreasing),
        AdminNavDestination("Queries", "Queries", Lucide.MessageSquareText),
        AdminNavDestination("More", "More", Lucide.LayoutGrid),
    )
    Box(Modifier.fillMaxWidth()) {
        Surface(
            modifier = Modifier
                .navigationBarsPadding()
                .padding(horizontal = 14.dp, vertical = 7.dp)
                .shadow(
                    elevation = 18.dp,
                    shape = RoundedCornerShape(31.dp),
                    ambientColor = Color.Black.copy(alpha = 0.30f),
                    spotColor = Color.Black.copy(alpha = 0.38f),
                ),
            shape = RoundedCornerShape(31.dp),
            color = Color.Transparent,
            border = BorderStroke(1.dp, dockBorder),
        ) {
            Box(
                modifier = Modifier.fillMaxWidth()
                    .clip(RoundedCornerShape(31.dp))
                    .background(
                        Brush.linearGradient(
                            dockColors,
                        ),
                    ),
            ) {
                Box(
                    Modifier.fillMaxWidth().height(24.dp).align(Alignment.TopCenter)
                        .background(
                            Brush.verticalGradient(
                                listOf(
                                    Color.White.copy(alpha = 0.13f),
                                    Color.Transparent,
                                ),
                            ),
                        ),
                )
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 5.dp, vertical = 5.dp),
                ) {
                    items.forEach { item ->
                        val selected = selectedTab == item.key
                        val badge = when (item.key) {
                            "Home" -> homeBadge
                            "Queries" -> queriesBadge
                            else -> 0
                        }
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .clip(RoundedCornerShape(25.dp))
                                .then(if (selected) Modifier
                                    .shadow(
                                        elevation = 8.dp,
                                        shape = RoundedCornerShape(25.dp),
                                        ambientColor = Color(0xFF3154D9).copy(alpha = 0.18f),
                                        spotColor = Color(0xFF3154D9).copy(alpha = 0.22f),
                                    )
                                    .background(selectedColor) else Modifier)
                                .clickable {
                                    if (!selected) {
                                        haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                        onSelect(item.key)
                                    }
                                }
                                .padding(vertical = 11.dp),
                            contentAlignment = Alignment.Center,
                        ) {
                            if (selected) {
                                Box(
                                    Modifier.fillMaxWidth().height(18.dp).align(Alignment.TopCenter)
                                        .background(
                                            Brush.verticalGradient(
                                                listOf(Color.White.copy(alpha = 0.14f), Color.Transparent),
                                            ),
                                        ),
                                )
                            }
                            BadgedBox(badge = {
                                if (badge > 0) Badge { Text(if (badge > 99) "99+" else badge.toString()) }
                            }) {
                                Icon(
                                    imageVector = item.icon,
                                    contentDescription = item.label,
                                    tint = if (selected) selectedIconColor else inactiveColor,
                                    modifier = Modifier.size(25.dp),
                                )
                            }
                        }
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
        color = if (MaterialTheme.colorScheme.background.luminance() < 0.5f)
            Color(0xFF272729) else Color(0xFFEAF1FF),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.55f)),
    ) {
        Box(contentAlignment = Alignment.Center) { content() }
    }
}

@Composable
private fun AdminDashboardSkeleton(modifier: Modifier = Modifier) {
    val transition = rememberInfiniteTransition(label = "dashboard-skeleton")
    val pulse by transition.animateFloat(
        initialValue = 0.42f,
        targetValue = 0.82f,
        animationSpec = infiniteRepeatable(tween(850), repeatMode = RepeatMode.Reverse),
        label = "dashboard-skeleton-pulse",
    )
    val fill = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = pulse)
    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 18.dp, vertical = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item { Box(Modifier.fillMaxWidth().height(238.dp).clip(RoundedCornerShape(28.dp)).background(fill)) }
        item { Box(Modifier.fillMaxWidth().height(82.dp).clip(RoundedCornerShape(20.dp)).background(fill)) }
        item { Box(Modifier.width(130.dp).height(24.dp).clip(RoundedCornerShape(12.dp)).background(fill)) }
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                repeat(4) {
                    Column(Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally) {
                        Box(Modifier.size(50.dp).clip(RoundedCornerShape(16.dp)).background(fill))
                        Spacer(Modifier.height(8.dp))
                        Box(Modifier.fillMaxWidth().height(12.dp).clip(RoundedCornerShape(6.dp)).background(fill))
                    }
                }
            }
        }
        item { Box(Modifier.width(190.dp).height(24.dp).clip(RoundedCornerShape(12.dp)).background(fill)) }
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                repeat(3) {
                    Box(Modifier.weight(1f).height(84.dp).clip(RoundedCornerShape(18.dp)).background(fill))
                }
            }
        }
    }
}

@Composable
private fun AdminReportSkeleton(modifier: Modifier = Modifier) {
    val transition = rememberInfiniteTransition(label = "report-skeleton")
    val pulse by transition.animateFloat(
        initialValue = 0.42f,
        targetValue = 0.82f,
        animationSpec = infiniteRepeatable(tween(850), repeatMode = RepeatMode.Reverse),
        label = "report-skeleton-pulse",
    )
    val fill = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = pulse)
    LazyColumn(modifier.fillMaxSize(), contentPadding = PaddingValues(18.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item { Box(Modifier.fillMaxWidth().height(190.dp).clip(RoundedCornerShape(24.dp)).background(fill)) }
        items(3) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                repeat(2) {
                    Box(Modifier.weight(1f).height(88.dp).clip(RoundedCornerShape(18.dp)).background(fill))
                }
            }
        }
        item { Box(Modifier.fillMaxWidth().height(210.dp).clip(RoundedCornerShape(20.dp)).background(fill)) }
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
    val haptic = LocalHapticFeedback.current
    val greeting = when (java.time.LocalTime.now().hour) {
        in 5..11 -> "Good morning"
        in 12..16 -> "Good afternoon"
        else -> "Good evening"
    }
    val darkTheme = MaterialTheme.colorScheme.background.luminance() < 0.5f
    val heroColors = if (darkTheme) {
        listOf(Color(0xFF171719), Color(0xFF202024))
    } else {
        listOf(Color.White, Color(0xFFF6F6F8))
    }
    val heroTitleColor = MaterialTheme.colorScheme.onSurface
    val heroBodyColor = MaterialTheme.colorScheme.onSurfaceVariant
    val heroAccent = if (darkTheme) MaterialTheme.colorScheme.primary else Color(0xFF4F46E5)
    val heroChipColor = if (darkTheme) Color(0xFF222B40) else Color.White.copy(alpha = 0.88f)
    val heroChipBorder = if (darkTheme) MaterialTheme.colorScheme.outlineVariant else Color(0xFFE0E7FF)
    val urgentCardColor = if (darkTheme) Color(0xFF351923) else Color(0xFFFFECEE)
    val urgentIconColor = if (darkTheme) Color(0xFF4A202B) else Color(0xFFFFD6DB)
    val urgentTint = if (darkTheme) Color(0xFFFFA1AC) else Color(0xFFB42335)
    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 18.dp, vertical = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item {
            val heroShape = RoundedCornerShape(28.dp)
            Box(
                Modifier.fillMaxWidth()
                    .shadow(16.dp, heroShape, ambientColor = Color(0xFF4F46E5).copy(alpha = 0.10f),
                        spotColor = Color(0xFF4F46E5).copy(alpha = 0.12f))
                    .clip(heroShape)
                    .background(Brush.linearGradient(heroColors)),
            ) {
                Column(Modifier.fillMaxWidth().padding(20.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        GlossyLucideIcon(Lucide.Activity,
                            listOf(Color(0xFF4F46E5), Color(0xFF7C3AED)), 48.dp)
                        Column(Modifier.weight(1f)) {
                            Row(verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(5.dp)) {
                                Icon(Lucide.Sparkles, contentDescription = null,
                                    tint = heroAccent, modifier = Modifier.size(13.dp))
                                Text("SCHOOL OPERATIONS", color = heroAccent,
                                    fontSize = 10.sp, fontWeight = FontWeight.Bold,
                                    letterSpacing = 1.4.sp)
                            }
                            Text("$greeting, ${school.userName}",
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.Bold, color = heroTitleColor,
                                maxLines = 2, overflow = TextOverflow.Ellipsis)
                        }
                    }
                    Spacer(Modifier.height(16.dp))
                    Text("Today at ${school.schoolName}", color = heroTitleColor,
                        style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Text("A live view of school activity, announcements and items that need attention.",
                        color = heroBodyColor, style = MaterialTheme.typography.bodySmall)
                    Spacer(Modifier.height(16.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(9.dp)) {
                        Surface(shape = RoundedCornerShape(14.dp), color = heroChipColor,
                            border = BorderStroke(1.dp, heroChipBorder), shadowElevation = 2.dp) {
                            Text(dashboard.academicYear ?: "No active year",
                                modifier = Modifier.padding(horizontal = 11.dp, vertical = 7.dp),
                                color = heroAccent, style = MaterialTheme.typography.labelMedium,
                                fontWeight = FontWeight.Bold)
                        }
                        Surface(shape = RoundedCornerShape(14.dp), color = heroChipColor,
                            border = BorderStroke(1.dp, heroChipBorder), shadowElevation = 2.dp) {
                            Text("${dashboard.openTickets + dashboard.inProgressTickets} active tickets",
                                modifier = Modifier.padding(horizontal = 11.dp, vertical = 7.dp),
                                color = heroBodyColor, style = MaterialTheme.typography.labelMedium)
                        }
                    }
                }
            }
        }

        item {
            val hasUrgent = dashboard.urgentTickets > 0
            val hasLeave = dashboard.pendingLeaveRequests > 0
            Card(
                onClick = {
                    haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                    if (hasUrgent) onQueries() else if (hasLeave) onSection("leave") else onAnnouncements()
                },
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(
                    containerColor = if (hasUrgent) urgentCardColor
                    else MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.65f),
                ),
            ) {
                Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Surface(shape = RoundedCornerShape(15.dp),
                        color = if (hasUrgent) urgentIconColor else MaterialTheme.colorScheme.surface,
                        modifier = Modifier.size(46.dp)) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(Lucide.CircleAlert, contentDescription = null,
                                tint = if (hasUrgent) urgentTint else MaterialTheme.colorScheme.primary)
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
                    Icon(Lucide.ArrowRight, contentDescription = null)
                }
            }
        }

        item { SectionTitle("Quick actions") }
        item {
            Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                listOf(
                    AdminTool("Attendance", Lucide.CalendarCheck, "attendance", listOf(Color(0xFF12BFA5), Color(0xFF168C7D))),
                    AdminTool("Students", Lucide.GraduationCap, "students", listOf(Color(0xFF3977F6), Color(0xFF3154D9))),
                    AdminTool("Fees", Lucide.WalletCards, "fees", listOf(Color(0xFF34C989), Color(0xFF149669))),
                    AdminTool("Leave", Lucide.ClipboardCheck, "leave", listOf(Color(0xFFF2B641), Color(0xFFD58A18))),
                ).forEach { tool ->
                    Surface(onClick = {
                        haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                        onSection(tool.destination)
                    }, modifier = Modifier.width(92.dp),
                        shape = RoundedCornerShape(18.dp), color = Color.Transparent) {
                        Column(Modifier.fillMaxWidth().padding(horizontal = 4.dp, vertical = 8.dp),
                            horizontalAlignment = Alignment.CenterHorizontally) {
                            GlossyLucideIcon(tool.icon, tool.colors, 48.dp)
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
                            Icon(Lucide.Megaphone, contentDescription = null,
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
                            Icon(Lucide.CalendarDays, contentDescription = null,
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
                    Icon(Lucide.ArrowRight, contentDescription = "Open ticket")
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
        if (state.reportLoading || state.reportError == null) {
            AdminReportSkeleton(modifier)
        } else {
            Box(modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(state.reportError, color = MaterialTheme.colorScheme.error)
                Spacer(Modifier.height(12.dp))
                Button(onClick = onRetry) { Text("Try again") }
                }
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
                    Icon(Lucide.ArrowRight,
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
        AdminTool("Attendance", Lucide.CalendarCheck, "attendance", listOf(Color(0xFF12BFA5), Color(0xFF168C7D))),
        AdminTool("Students", Lucide.GraduationCap, "students", listOf(Color(0xFF3977F6), Color(0xFF3154D9))),
        AdminTool("Teachers", Lucide.Users, "teachers", listOf(Color(0xFFB066E7), Color(0xFF7950C8))),
        AdminTool("Classes", Lucide.School, "classes", listOf(Color(0xFFF39B52), Color(0xFFD36C31))),
        AdminTool("Fees", Lucide.WalletCards, "fees", listOf(Color(0xFF34C989), Color(0xFF149669))),
        AdminTool("Leave", Lucide.ClipboardCheck, "leave", listOf(Color(0xFFF2C14E), Color(0xFFD78C18))),
        AdminTool("Timetable", Lucide.CalendarDays, "timetable", listOf(Color(0xFF5B8DEF), Color(0xFF4355C5))),
        AdminTool("Exams", Lucide.GraduationCap, "exams", listOf(Color(0xFF9B6BE8), Color(0xFF6941C6))),
        AdminTool("Calendar", Lucide.CalendarCheck, "calendar", listOf(Color(0xFFEC6F91), Color(0xFFC33C68))),
        AdminTool("Fee collection", Lucide.WalletCards, "fee-collection", listOf(Color(0xFF2CC7A0), Color(0xFF07866C))),
        AdminTool("Admissions", Lucide.Users, "admissions", listOf(Color(0xFF38A9E8), Color(0xFF286CCB))),
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

private data class AdminTool(
    val label: String,
    val icon: ImageVector,
    val destination: String,
    val colors: List<Color>,
)

@Composable
private fun AdminToolTile(tool: AdminTool, modifier: Modifier = Modifier, onClick: () -> Unit) {
    val haptic = LocalHapticFeedback.current
    Surface(onClick = {
        haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
        onClick()
    }, modifier = modifier.aspectRatio(1.05f),
        shape = RoundedCornerShape(20.dp), color = Color.Transparent) {
        Column(Modifier.fillMaxSize().padding(horizontal = 6.dp, vertical = 7.dp),
            verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally) {
            GlossyLucideIcon(tool.icon, tool.colors, 56.dp)
            Spacer(Modifier.height(8.dp))
            Text(tool.label, style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold, maxLines = 2, overflow = TextOverflow.Ellipsis,
                textAlign = TextAlign.Center)
        }
    }
}

@Composable
private fun GlossyLucideIcon(
    icon: ImageVector,
    colors: List<Color>,
    size: androidx.compose.ui.unit.Dp,
) {
    val shape = RoundedCornerShape(size * 0.30f)
    Box(
        modifier = Modifier
            .size(size)
            .shadow(8.dp, shape, ambientColor = colors.last().copy(alpha = 0.22f),
                spotColor = colors.last().copy(alpha = 0.28f))
            .clip(shape)
            .background(Brush.linearGradient(colors)),
        contentAlignment = Alignment.Center,
    ) {
        Box(
            Modifier.fillMaxWidth().height(size * 0.46f).align(Alignment.TopCenter)
                .background(Brush.verticalGradient(listOf(Color.White.copy(alpha = 0.28f), Color.Transparent))),
        )
        Box(
            Modifier.size(size * 0.62f).align(Alignment.TopEnd)
                .background(Color.White.copy(alpha = 0.08f), CircleShape),
        )
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = Color.White,
            modifier = Modifier.size(size * 0.46f),
        )
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
