package com.schooldb.mobile.family

import android.content.Intent
import android.net.Uri
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.automirrored.outlined.Assignment
import androidx.compose.material.icons.automirrored.outlined.EventNote
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.School
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.DirectionsBus
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.LocationOn
import androidx.compose.material.icons.outlined.MoreHoriz
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.Payments
import androidx.compose.material.icons.outlined.Phone
import androidx.compose.material.icons.outlined.Route
import androidx.compose.material.icons.outlined.Schedule
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import java.text.NumberFormat
import java.time.LocalDate
import java.time.Instant
import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.time.YearMonth
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import java.util.Locale
import kotlinx.coroutines.delay
import com.composables.icons.lucide.CalendarCheck
import com.composables.icons.lucide.Bell
import com.composables.icons.lucide.ClipboardCheck
import com.composables.icons.lucide.GraduationCap
import com.composables.icons.lucide.House
import com.composables.icons.lucide.LayoutGrid
import com.composables.icons.lucide.Lucide

private val FamilyIndigo = Color(0xFF4F46E5)
private val FamilyGreen = Color(0xFF059669)
private val FamilyRed = Color(0xFFDC2626)
private val FamilyAmber = Color(0xFFD97706)

private enum class FamilyTab(val label: String, val icon: ImageVector) {
    HOME("Home", Icons.Outlined.Home),
    ATTENDANCE("Attendance", Icons.Outlined.CalendarMonth),
    HOMEWORK("Homework", Icons.AutoMirrored.Outlined.Assignment),
    FEES("Fees", Icons.Outlined.Payments),
    RESULTS("Results", Icons.Default.EmojiEvents),
    MORE("More", Icons.Outlined.MoreHoriz),
}

private data class StudentNavItem(val tab: FamilyTab, val icon: ImageVector)

@Composable
private fun StudentPremiumTopBar(
    schoolName: String,
    studentName: String,
    unread: Int,
    onNotifications: () -> Unit,
    onSwitchAccount: () -> Unit,
) {
    Row(
        Modifier.fillMaxWidth().background(MaterialTheme.colorScheme.background)
            .statusBarsPadding().padding(start = 20.dp, end = 14.dp, top = 12.dp, bottom = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f)) {
            Text("STUDENT SPACE", color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold,
                fontSize = 10.sp, letterSpacing = 1.3.sp)
            Text(schoolName, color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.Bold,
                fontSize = 18.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        Surface(
            onClick = onNotifications,
            modifier = Modifier.size(42.dp),
            shape = CircleShape,
            color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = .72f),
        ) {
            Box(contentAlignment = Alignment.Center) {
                BadgedBox(badge = {
                    if (unread > 0) Badge { Text(unread.coerceAtMost(99).toString(), fontSize = 9.sp) }
                }) {
                    Icon(Lucide.Bell, contentDescription = "Notifications", modifier = Modifier.size(20.dp))
                }
            }
        }
        Spacer(Modifier.width(9.dp))
        Surface(
            onClick = onSwitchAccount,
            modifier = Modifier.size(42.dp),
            shape = CircleShape,
            color = MaterialTheme.colorScheme.onSurface,
        ) {
            Box(contentAlignment = Alignment.Center) {
                Text(studentName.trim().take(1).uppercase().ifBlank { "S" },
                    color = MaterialTheme.colorScheme.surface, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
private fun StudentPremiumNavigation(
    selected: FamilyTab,
    unread: Int,
    onSelect: (FamilyTab) -> Unit,
) {
    val haptic = LocalHapticFeedback.current
    val darkTheme = MaterialTheme.colorScheme.background.luminance() < .5f
    val dockColors = if (darkTheme) {
        listOf(Color(0xEE454547), Color(0xF52D2D30), Color(0xF23A3A3D))
    } else {
        listOf(Color(0xF8FFFFFF), Color(0xF3F4F6FF), Color(0xF8FFFFFF))
    }
    val border = if (darkTheme) Color.White.copy(alpha = .16f) else Color.White.copy(alpha = .96f)
    val inactive = if (darkTheme) Color.White.copy(alpha = .72f) else Color(0xFF667085)
    val selectedFill = if (darkTheme) Color(0xF0121213) else Color(0xFFE1E9FF)
    val selectedTint = if (darkTheme) Color.White else MaterialTheme.colorScheme.primary
    val items = listOf(
        StudentNavItem(FamilyTab.HOME, Lucide.House),
        StudentNavItem(FamilyTab.ATTENDANCE, Lucide.CalendarCheck),
        StudentNavItem(FamilyTab.HOMEWORK, Lucide.ClipboardCheck),
        StudentNavItem(FamilyTab.RESULTS, Lucide.GraduationCap),
        StudentNavItem(FamilyTab.MORE, Lucide.LayoutGrid),
    )
    Surface(
        modifier = Modifier.navigationBarsPadding().padding(horizontal = 14.dp, vertical = 7.dp)
            .shadow(18.dp, RoundedCornerShape(31.dp), ambientColor = Color.Black.copy(alpha = .30f),
                spotColor = Color.Black.copy(alpha = .38f)),
        shape = RoundedCornerShape(31.dp),
        color = Color.Transparent,
        border = BorderStroke(1.dp, border),
    ) {
        Box(Modifier.fillMaxWidth().clip(RoundedCornerShape(31.dp)).background(Brush.linearGradient(dockColors))) {
            Box(Modifier.fillMaxWidth().height(23.dp).align(Alignment.TopCenter)
                .background(Brush.verticalGradient(listOf(Color.White.copy(alpha = .13f), Color.Transparent))))
            Row(Modifier.fillMaxWidth().padding(5.dp)) {
                items.forEach { item ->
                    val active = selected == item.tab
                    Box(
                        Modifier.weight(1f).clip(RoundedCornerShape(25.dp))
                            .then(if (active) Modifier.shadow(8.dp, RoundedCornerShape(25.dp),
                                ambientColor = MaterialTheme.colorScheme.primary.copy(alpha = .18f),
                                spotColor = MaterialTheme.colorScheme.primary.copy(alpha = .22f))
                                .background(selectedFill) else Modifier)
                            .clickable {
                                if (!active) {
                                    haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                    onSelect(item.tab)
                                }
                            }.padding(vertical = 11.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        BadgedBox(badge = {
                            if (item.tab == FamilyTab.MORE && unread > 0) {
                                Badge { Text(if (unread > 99) "99+" else unread.toString(), fontSize = 8.sp) }
                            }
                        }) {
                            Icon(item.icon, contentDescription = item.tab.label,
                                tint = if (active) selectedTint else inactive, modifier = Modifier.size(24.dp))
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FamilyDashboardScreen(
    onSwitchAccount: () -> Unit,
    refreshKey: Int = 0,
    openNotificationId: String? = null,
    onNotificationOpened: () -> Unit = {},
    viewModel: FamilyViewModel = viewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val dashboard = state.dashboard
    val isStudent = dashboard?.role == "STUDENT"
    val student = dashboard?.students?.firstOrNull { it.id == state.selectedStudentId }
    var tab by rememberSaveable { mutableStateOf(FamilyTab.HOME) }
    var moreScreen by rememberSaveable { mutableStateOf("MENU") }

    BackHandler(enabled = tab != FamilyTab.HOME) {
        if (tab == FamilyTab.MORE && moreScreen != "MENU") {
            moreScreen = "MENU"
        } else {
            tab = FamilyTab.HOME
            moreScreen = "MENU"
        }
    }

    LaunchedEffect(dashboard?.role) {
        if ((isStudent && tab == FamilyTab.FEES) || (!isStudent && tab == FamilyTab.RESULTS)) {
            tab = FamilyTab.HOME
        }
    }
    LaunchedEffect(refreshKey) {
        if (refreshKey == 0) {
            withFrameNanos { }
            delay(50)
        }
        if (refreshKey > 0) viewModel.refreshForAccountChange() else viewModel.refresh()
    }
    LaunchedEffect(openNotificationId, dashboard != null) {
        if (!openNotificationId.isNullOrBlank()) {
            tab = FamilyTab.MORE
            moreScreen = "NOTIFICATIONS"
            if (dashboard != null) {
                if (!state.notificationsLoading) viewModel.refreshNotifications()
                onNotificationOpened()
            }
        }
    }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            if (isStudent) {
                StudentPremiumTopBar(
                    schoolName = dashboard.schoolName,
                    studentName = student?.fullName.orEmpty(),
                    unread = state.unreadNotificationCount,
                    onNotifications = {
                        tab = FamilyTab.MORE
                        moreScreen = "NOTIFICATIONS"
                    },
                    onSwitchAccount = onSwitchAccount,
                )
            } else TopAppBar(
                title = {
                    Column {
                        Text(dashboard?.schoolName ?: "SchoolDB", fontWeight = FontWeight.Bold, maxLines = 1)
                        Text("Parent space", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
                    }
                },
                actions = {
                    IconButton(onClick = {
                        tab = FamilyTab.MORE
                        moreScreen = "NOTIFICATIONS"
                    }) {
                        BadgedBox(
                            badge = {
                                if (state.unreadNotificationCount > 0) {
                                    Badge {
                                        Text(
                                            state.unreadNotificationCount.coerceAtMost(99).toString(),
                                            fontSize = 9.sp,
                                        )
                                    }
                                }
                            },
                        ) {
                            Icon(Icons.Outlined.Notifications, contentDescription = "Notifications")
                        }
                    }
                    IconButton(onClick = onSwitchAccount) {
                        Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = "Switch account or role")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface),
            )
        },
        bottomBar = {
            if (student != null) {
                if (isStudent) {
                    StudentPremiumNavigation(
                        selected = tab,
                        unread = state.unreadNotificationCount,
                        onSelect = {
                            tab = it
                            moreScreen = "MENU"
                        },
                    )
                } else NavigationBar(containerColor = MaterialTheme.colorScheme.surface, tonalElevation = 0.dp) {
                    val tabs =
                        listOf(FamilyTab.HOME, FamilyTab.ATTENDANCE, FamilyTab.HOMEWORK, FamilyTab.FEES, FamilyTab.MORE)
                    tabs.forEach { item ->
                        NavigationBarItem(
                            selected = tab == item,
                            onClick = {
                                tab = item
                                moreScreen = "MENU"
                            },
                            icon = { Icon(item.icon, contentDescription = item.label) },
                            label = { Text(item.label, fontSize = 10.sp) },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = FamilyIndigo,
                                selectedTextColor = FamilyIndigo,
                                indicatorColor = FamilyIndigo.copy(alpha = .1f),
                                unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant,
                            ),
                        )
                    }
                }
            }
        },
    ) { padding ->
        when {
            state.loading && dashboard == null -> LoadingPage(Modifier.padding(padding))
            state.error != null && dashboard == null -> FamilyError(state.error.orEmpty(), viewModel::refresh, Modifier.padding(padding))
            dashboard != null && student != null -> when (tab) {
                FamilyTab.HOME -> FamilyHome(dashboard, student, state, viewModel::selectStudent, viewModel::refresh, Modifier.padding(padding))
                FamilyTab.ATTENDANCE -> AttendanceTab(dashboard, student, state, viewModel::selectStudent, viewModel::refreshDetails, Modifier.padding(padding))
                FamilyTab.HOMEWORK -> HomeworkTab(dashboard, student, state, viewModel::selectStudent, viewModel::refreshDetails, Modifier.padding(padding))
                FamilyTab.FEES -> FeesTab(dashboard, student, state, viewModel::selectStudent, viewModel::refreshDetails, Modifier.padding(padding))
                FamilyTab.RESULTS -> ResultsTab(dashboard, student, state, viewModel::selectStudent, viewModel::refreshDetails, Modifier.padding(padding))
                FamilyTab.MORE -> if (moreScreen == "FEES") {
                    FeesTab(
                        dashboard, student, state, viewModel::selectStudent,
                        viewModel::refreshDetails, Modifier.padding(padding),
                        onBack = { moreScreen = "MENU" },
                    )
                } else if (moreScreen == "TIMETABLE") {
                    TimetableTab(
                        dashboard,
                        student,
                        state,
                        viewModel::selectStudent,
                        viewModel::refreshDetails,
                        onBack = { moreScreen = "MENU" },
                        modifier = Modifier.padding(padding),
                    )
                } else if (moreScreen == "LEAVE") {
                    LeaveRequestsTab(
                        dashboard,
                        student,
                        state,
                        viewModel::selectStudent,
                        viewModel::refreshDetails,
                        viewModel::submitLeave,
                        viewModel::cancelLeave,
                        onBack = { moreScreen = "MENU" },
                        modifier = Modifier.padding(padding),
                    )
                } else if (moreScreen == "CALENDAR") {
                    CalendarTab(
                        dashboard,
                        student,
                        state,
                        viewModel::selectStudent,
                        viewModel::refreshDetails,
                        onBack = { moreScreen = "MENU" },
                        modifier = Modifier.padding(padding),
                    )
                } else if (moreScreen == "TRANSPORT") {
                    TransportTab(
                        dashboard,
                        student,
                        state,
                        viewModel::selectStudent,
                        viewModel::refreshDetails,
                        onBack = { moreScreen = "MENU" },
                        modifier = Modifier.padding(padding),
                    )
                } else if (moreScreen == "NOTIFICATIONS") {
                    NotificationsTab(
                        state = state,
                        onOpen = viewModel::markNotificationRead,
                        onRefresh = viewModel::refreshNotifications,
                        onBack = { moreScreen = "MENU" },
                        modifier = Modifier.padding(padding),
                    )
                } else {
                    MoreTab(
                        dashboard,
                        student,
                        state,
                        viewModel::selectStudent,
                        viewModel::refreshDetails,
                        onOpenTimetable = { moreScreen = "TIMETABLE" },
                        onOpenLeave = { moreScreen = "LEAVE" },
                        onOpenCalendar = { moreScreen = "CALENDAR" },
                        onOpenTransport = { moreScreen = "TRANSPORT" },
                        onOpenNotifications = { moreScreen = "NOTIFICATIONS" },
                        onOpenFees = { moreScreen = "FEES" },
                        onSwitchAccount = onSwitchAccount,
                        modifier = Modifier.padding(padding),
                    )
                }
            }
            else -> FamilyError("No active student is linked to this account.", viewModel::refresh, Modifier.padding(padding))
        }
    }
}

@Composable
private fun FamilyHome(
    dashboard: FamilyDashboard,
    student: FamilyStudent,
    state: FamilyUiState,
    onSelect: (String) -> Unit,
    onRefresh: () -> Unit,
    modifier: Modifier,
) {
    if (dashboard.role == "STUDENT") {
        StudentHome(student, state, onRefresh, modifier)
        return
    }
    LazyColumn(modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 28.dp)) {
        item { FamilyPageIntro(dashboard, student, if (dashboard.role == "STUDENT") "My overview" else "Student overview", onSelect) }
        item {
            StudentSummary(student)
            Text("Today at a glance", Modifier.padding(start = 20.dp, top = 24.dp, bottom = 12.dp), fontWeight = FontWeight.Bold, fontSize = 18.sp)
            Metrics(student, dashboard.role == "STUDENT")
            Text("Upcoming events", Modifier.padding(start = 20.dp, top = 24.dp, bottom = 8.dp), fontWeight = FontWeight.Bold, fontSize = 18.sp)
        }
        val today = LocalDate.now().toString()
        val upcomingEvents = state.details?.calendarEvents
            ?.filter { it.endDate.take(10) >= today }
            ?.take(3)
            .orEmpty()
        if (state.details != null && upcomingEvents.isEmpty()) {
            item { EmptyMessage("No upcoming school events or deadlines.") }
        } else {
            items(upcomingEvents, key = { it.id }) { CalendarEventCard(it) }
        }
        item {
            SectionHeader("Recent homework", onRefresh)
        }
        if (student.recentHomework.isEmpty()) item { EmptyMessage("No active homework right now.") }
        else items(student.recentHomework, key = { it.id }) { HomeworkSummaryCard(it) }
    }
}

@Composable
private fun StudentHome(
    student: FamilyStudent,
    state: FamilyUiState,
    onRefresh: () -> Unit,
    modifier: Modifier,
) {
    val today = LocalDate.now()
    val upcomingEvents = state.details?.calendarEvents
        ?.filter { it.endDate.take(10) >= today.toString() }
        ?.take(3)
        .orEmpty()

    LazyColumn(
        modifier = modifier.fillMaxSize().background(MaterialTheme.colorScheme.background),
        contentPadding = PaddingValues(bottom = 32.dp),
        verticalArrangement = Arrangement.spacedBy(18.dp),
    ) {
        item {
            Column(Modifier.padding(start = 20.dp, end = 20.dp, top = 18.dp)) {
                Text("YOUR SCHOOL DAY", color = FamilyIndigo, fontWeight = FontWeight.Bold, fontSize = 11.sp, letterSpacing = 1.4.sp)
                Text("Welcome back", color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.Bold, fontSize = 29.sp, letterSpacing = (-.7).sp)
                Text(today.format(DateTimeFormatter.ofPattern("EEEE, d MMMM", Locale.ENGLISH)), color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 13.sp)
            }
        }
        item { StudentHero(student) }
        item {
            Column {
                StudentSectionHeading("At a glance", "A quick view of your progress")
                StudentMetrics(student)
            }
        }
        item { StudentSectionHeading("Coming up", "School events and deadlines") }
        if (state.details != null && upcomingEvents.isEmpty()) {
            item { StudentEmptyState(Icons.Outlined.CalendarMonth, "A clear calendar", "Nothing coming up right now.") }
        } else {
            items(upcomingEvents, key = { it.id }) { CalendarEventCard(it) }
        }
        item { SectionHeader("Recent homework", onRefresh) }
        if (student.recentHomework.isEmpty()) item { StudentEmptyState(Icons.AutoMirrored.Outlined.Assignment, "All caught up", "No active homework right now.") }
        else items(student.recentHomework, key = { it.id }) { HomeworkSummaryCard(it) }
    }
}

@Composable
private fun StudentHero(student: FamilyStudent) {
    Box(
        Modifier.fillMaxWidth().padding(horizontal = 20.dp)
            .clip(RoundedCornerShape(28.dp))
            .background(Brush.linearGradient(listOf(Color(0xFF293A9D), Color(0xFF5B42D8), Color(0xFF8463E8)))),
    ) {
        Box(Modifier.align(Alignment.TopEnd).offset(x = 60.dp, y = (-65).dp).size(180.dp).background(Color.White.copy(alpha = .07f), CircleShape))
        Box(Modifier.align(Alignment.BottomEnd).offset(x = 38.dp, y = 60.dp).size(145.dp).background(Color.White.copy(alpha = .06f), CircleShape))
        Column(Modifier.fillMaxWidth().padding(22.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(42.dp).background(Color.White.copy(alpha = .16f), RoundedCornerShape(14.dp)), contentAlignment = Alignment.Center) {
                    Icon(Icons.Default.School, contentDescription = null, tint = Color.White, modifier = Modifier.size(22.dp))
                }
                Spacer(Modifier.width(11.dp))
                Text("STUDENT PROFILE", color = Color.White.copy(alpha = .78f), fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
            }
            Spacer(Modifier.height(19.dp))
            Text(student.fullName, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 25.sp, lineHeight = 29.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)
            Text(
                listOfNotNull(student.className, student.sectionName?.let { "Section $it" }, student.rollNo?.let { "Roll $it" }).joinToString("  ·  ").ifBlank { "Enrollment details unavailable" },
                Modifier.padding(top = 7.dp), color = Color.White.copy(alpha = .85f), fontSize = 13.sp,
            )
            if (student.admissionNo.isNotBlank()) {
                Spacer(Modifier.height(20.dp))
                Text(
                    "ADMISSION  ${student.admissionNo}",
                    Modifier.background(Color.White.copy(alpha = .14f), RoundedCornerShape(10.dp)).padding(horizontal = 11.dp, vertical = 7.dp),
                    color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, letterSpacing = .4.sp,
                )
            }
        }
    }
}

@Composable
private fun StudentSectionHeading(title: String, subtitle: String) {
    Column(Modifier.padding(horizontal = 20.dp)) {
        Text(title, color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.Bold, fontSize = 19.sp)
        Text(subtitle, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
    }
}

@Composable
private fun StudentMetrics(student: FamilyStudent) {
    Column(Modifier.padding(start = 20.dp, end = 20.dp, top = 12.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            StudentMetricCard("Attendance", student.attendancePercentage?.let { "${number(it)}%" } ?: "—", "${student.attendanceAttended} of ${student.attendanceTotal} sessions", Icons.Outlined.CalendarMonth, Color(0xFF14847B), Modifier.weight(1f))
            StudentMetricCard("Homework", student.pendingHomeworkCount.toString(), "active assignments", Icons.AutoMirrored.Outlined.Assignment, FamilyIndigo, Modifier.weight(1f))
        }
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            StudentMetricCard("Results", student.completedResultCount.toString(), "completed exams", Icons.Default.EmojiEvents, Color(0xFFB87014), Modifier.weight(1f))
            StudentMetricCard("Fees due", currency(student.outstandingFee), if (student.outstandingFee > 0) "outstanding" else "nothing pending", Icons.Outlined.Payments, Color(0xFFB74E69), Modifier.weight(1f))
        }
    }
}

@Composable
private fun StudentMetricCard(label: String, value: String, detail: String, icon: ImageVector, accent: Color, modifier: Modifier) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = .7f)),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Column(Modifier.fillMaxWidth().padding(15.dp)) {
            Box(Modifier.size(34.dp).background(accent.copy(alpha = .1f), RoundedCornerShape(11.dp)), contentAlignment = Alignment.Center) {
                Icon(icon, contentDescription = null, tint = accent, modifier = Modifier.size(19.dp))
            }
            Spacer(Modifier.height(13.dp))
            Text(value, color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.Bold, fontSize = 21.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(label, color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.SemiBold, fontSize = 12.sp)
            Text(detail, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 10.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
    }
}

@Composable
private fun StudentEmptyState(icon: ImageVector, title: String, detail: String) {
    Card(
        Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 6.dp),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Row(Modifier.fillMaxWidth().padding(18.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(44.dp).background(FamilyIndigo.copy(alpha = .09f), RoundedCornerShape(14.dp)), contentAlignment = Alignment.Center) {
                Icon(icon, contentDescription = null, tint = FamilyIndigo, modifier = Modifier.size(22.dp))
            }
            Column(Modifier.padding(start = 14.dp)) {
                Text(title, color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                Text(detail, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
            }
        }
    }
}

@Composable
private fun AttendanceTab(
    dashboard: FamilyDashboard,
    student: FamilyStudent,
    state: FamilyUiState,
    onSelect: (String) -> Unit,
    onRefresh: () -> Unit,
    modifier: Modifier,
) = DetailList(modifier, dashboard, student, "Attendance", state, onSelect, onRefresh) { details ->
    val attendance = details.attendance
    if (attendance == null) item { EmptyMessage("Attendance becomes available after enrollment.") }
    else {
        item {
            Row(Modifier.fillMaxWidth().padding(horizontal = 20.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                if (dashboard.role == "STUDENT") {
                    StudentMetricCard("Attendance", "${number(attendance.percentage)}%", "${attendance.total} sessions", Icons.Outlined.CalendarMonth, Color(0xFF14847B), Modifier.weight(1f))
                    StudentMetricCard("Present", attendance.present.toString(), "${attendance.absent} absent", Icons.Default.CheckCircle, FamilyIndigo, Modifier.weight(1f))
                } else {
                    MetricCard("Attendance", "${number(attendance.percentage)}%", "${attendance.total} sessions", Modifier.weight(1f))
                    MetricCard("Present", attendance.present.toString(), "${attendance.absent} absent", Modifier.weight(1f))
                }
            }
        }
        if (attendance.records.isEmpty()) item {
            if (dashboard.role == "STUDENT") StudentEmptyState(Icons.Outlined.CalendarMonth, "No records yet", "Attendance will appear after your classes are recorded.")
            else EmptyMessage("No attendance has been recorded yet.")
        }
        else items(attendance.records, key = { it.id }) { AttendanceCard(it) }
    }
}

@Composable
private fun HomeworkTab(
    dashboard: FamilyDashboard,
    student: FamilyStudent,
    state: FamilyUiState,
    onSelect: (String) -> Unit,
    onRefresh: () -> Unit,
    modifier: Modifier,
) = DetailList(modifier, dashboard, student, "Homework", state, onSelect, onRefresh) { details ->
    if (details.homework.isEmpty()) item {
        if (dashboard.role == "STUDENT") StudentEmptyState(Icons.AutoMirrored.Outlined.Assignment, "No homework posted", "Assignments from your teachers will appear here.")
        else EmptyMessage("No active homework right now.")
    }
    else if (dashboard.role == "STUDENT") {
        item { StudentHomeworkSummary(details.homework) }
        items(details.homework, key = { it.id }) { StudentHomeworkCard(it) }
    } else {
        items(details.homework, key = { it.id }) { HomeworkCard(it) }
    }
}

@Composable
private fun StudentHomeworkSummary(homework: List<FamilyHomeworkDetails>) {
    val today = LocalDate.now()
    val dueSoon = homework.count { item ->
        calendarDate(item.dueDate.orEmpty())?.let { due ->
            !due.isBefore(today) && due.isBefore(today.plusDays(8))
        } == true
    }
    Card(
        Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 8.dp),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = FamilyIndigo.copy(alpha = .08f)),
    ) {
        Row(Modifier.fillMaxWidth().padding(17.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(42.dp).background(FamilyIndigo.copy(alpha = .12f), RoundedCornerShape(13.dp)), contentAlignment = Alignment.Center) {
                Icon(Icons.AutoMirrored.Outlined.Assignment, contentDescription = null, tint = FamilyIndigo, modifier = Modifier.size(22.dp))
            }
            Column(Modifier.weight(1f).padding(start = 13.dp)) {
                Text("${homework.size} ${if (homework.size == 1) "assignment" else "assignments"}", color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                Text("From your teachers", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
            }
            if (dueSoon > 0) {
                Text("$dueSoon due soon", color = FamilyIndigo, fontWeight = FontWeight.SemiBold, fontSize = 11.sp)
            }
        }
    }
}

@Composable
private fun StudentHomeworkCard(item: FamilyHomeworkDetails) {
    val today = LocalDate.now()
    val due = item.dueDate?.let(::calendarDate)
    val daysUntilDue = due?.let { ChronoUnit.DAYS.between(today, it) }
    val status = when {
        daysUntilDue == null -> "No due date"
        daysUntilDue < 0 -> "Past due"
        daysUntilDue == 0L -> "Due today"
        daysUntilDue == 1L -> "Due tomorrow"
        daysUntilDue <= 7 -> "Due in $daysUntilDue days"
        else -> "Upcoming"
    }
    val statusColor = when {
        daysUntilDue == null -> MaterialTheme.colorScheme.onSurfaceVariant
        daysUntilDue < 0 -> FamilyRed
        daysUntilDue <= 1 -> FamilyAmber
        else -> FamilyIndigo
    }

    Card(
        Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 6.dp),
        shape = RoundedCornerShape(21.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
    ) {
        Column(Modifier.fillMaxWidth().padding(18.dp)) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Text(
                    item.subjectName.uppercase(),
                    Modifier.weight(1f, fill = false).background(FamilyIndigo.copy(alpha = .09f), RoundedCornerShape(8.dp)).padding(horizontal = 9.dp, vertical = 5.dp),
                    color = FamilyIndigo, fontWeight = FontWeight.Bold, fontSize = 10.sp, letterSpacing = .5.sp,
                    maxLines = 1, overflow = TextOverflow.Ellipsis,
                )
                Spacer(Modifier.width(8.dp))
                Text(
                    status,
                    Modifier.background(statusColor.copy(alpha = .1f), RoundedCornerShape(8.dp)).padding(horizontal = 9.dp, vertical = 5.dp),
                    color = statusColor, fontWeight = FontWeight.SemiBold, fontSize = 10.sp,
                )
            }
            Text(item.title, Modifier.padding(top = 15.dp), color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.Bold, fontSize = 17.sp, lineHeight = 22.sp)
            item.description?.let {
                Text(it, Modifier.padding(top = 7.dp), color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 13.sp, lineHeight = 19.sp, maxLines = 4, overflow = TextOverflow.Ellipsis)
            }
            HorizontalDivider(Modifier.padding(top = 16.dp, bottom = 12.dp), color = MaterialTheme.colorScheme.outlineVariant)
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.CalendarMonth, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(16.dp))
                Text("Assigned ${date(item.assignedDate)}", Modifier.padding(start = 6.dp), color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
                Spacer(Modifier.weight(1f))
                item.dueDate?.let {
                    Text("Due ${date(it)}", color = if (daysUntilDue != null && daysUntilDue < 0) FamilyRed else MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.SemiBold, fontSize = 11.sp)
                }
            }
        }
    }
}

@Composable
private fun ResultsTab(
    dashboard: FamilyDashboard,
    student: FamilyStudent,
    state: FamilyUiState,
    onSelect: (String) -> Unit,
    onRefresh: () -> Unit,
    modifier: Modifier,
) = DetailList(modifier, dashboard, student, "Results", state, onSelect, onRefresh) { details ->
    if (details.results.isEmpty()) item { StudentEmptyState(Icons.Default.EmojiEvents, "Results are on the way", "Completed examination results will appear here.") }
    else items(details.results, key = { it.id }) { ResultCard(it) }
}

@Composable
private fun FeesTab(
    dashboard: FamilyDashboard,
    student: FamilyStudent,
    state: FamilyUiState,
    onSelect: (String) -> Unit,
    onRefresh: () -> Unit,
    modifier: Modifier,
    onBack: (() -> Unit)? = null,
) = DetailList(modifier, dashboard, student, "Fees", state, onSelect, onRefresh, onBack) { details ->
    item {
        Row(Modifier.fillMaxWidth().padding(horizontal = 20.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            MetricCard("Paid", currency(details.fees.paid), "of ${currency(details.fees.payable)}", Modifier.weight(1f))
            MetricCard("Outstanding", currency(details.fees.outstanding), "remaining balance", Modifier.weight(1f))
        }
        Subheading("Installments")
    }
    if (details.fees.installments.isEmpty()) item { EmptyMessage("No fee plan is assigned.") }
    else items(details.fees.installments, key = { it.id }) { InstallmentCard(it) }
    if (details.fees.payments.isNotEmpty()) {
        item { Subheading("Recent payments") }
        items(details.fees.payments.take(10), key = { it.id }) { PaymentCard(it) }
    }
}

@Composable
private fun MoreTab(
    dashboard: FamilyDashboard,
    student: FamilyStudent,
    state: FamilyUiState,
    onSelect: (String) -> Unit,
    onRefresh: () -> Unit,
    onOpenTimetable: () -> Unit,
    onOpenLeave: () -> Unit,
    onOpenCalendar: () -> Unit,
    onOpenTransport: () -> Unit,
    onOpenNotifications: () -> Unit,
    onOpenFees: () -> Unit,
    onSwitchAccount: () -> Unit,
    modifier: Modifier,
) {
    if (dashboard.role == "STUDENT") {
        StudentMoreTab(
            dashboard, student, state, onSelect, onOpenTimetable, onOpenLeave,
            onOpenCalendar, onOpenTransport, onOpenNotifications, onOpenFees,
            onSwitchAccount, modifier,
        )
        return
    }

    DetailList(modifier, dashboard, student, "More", state, onSelect, onRefresh) { details ->
    item {
        Card(
            onClick = onOpenNotifications,
            modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 6.dp),
            shape = RoundedCornerShape(18.dp),
        ) {
            Row(Modifier.fillMaxWidth().padding(18.dp), verticalAlignment = Alignment.CenterVertically) {
                BadgedBox(
                    badge = {
                        if (state.unreadNotificationCount > 0) {
                            Badge { Text(state.unreadNotificationCount.coerceAtMost(99).toString()) }
                        }
                    },
                ) {
                    Icon(Icons.Outlined.Notifications, contentDescription = null, tint = FamilyIndigo)
                }
                Column(Modifier.padding(start = 14.dp).weight(1f)) {
                    Text("Notifications", fontWeight = FontWeight.Bold)
                    Text(
                        if (state.unreadNotificationCount > 0) "${state.unreadNotificationCount} unread school updates"
                        else "Announcements and school updates",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontSize = 12.sp,
                    )
                }
            }
        }
    }
    item {
        Card(
            onClick = onOpenTimetable,
            modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 6.dp),
            shape = RoundedCornerShape(18.dp),
        ) {
            Row(Modifier.fillMaxWidth().padding(18.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.Schedule, contentDescription = null, tint = FamilyIndigo)
                Column(Modifier.padding(start = 14.dp).weight(1f)) {
                    Text("Class timetable", fontWeight = FontWeight.Bold)
                    Text("View today's classes and the weekly schedule", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
                }
            }
        }
    }
    item {
        Card(
            onClick = onOpenTransport,
            modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 6.dp),
            shape = RoundedCornerShape(18.dp),
        ) {
            Row(Modifier.fillMaxWidth().padding(18.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.DirectionsBus, contentDescription = null, tint = FamilyIndigo)
                Column(Modifier.padding(start = 14.dp).weight(1f)) {
                    Text("School transport", fontWeight = FontWeight.Bold)
                    Text("Route, stop, vehicle and daily timings", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
                }
            }
        }
    }
    item {
        Card(
            onClick = onOpenCalendar,
            modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 6.dp),
            shape = RoundedCornerShape(18.dp),
        ) {
            Row(Modifier.fillMaxWidth().padding(18.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.CalendarMonth, contentDescription = null, tint = FamilyIndigo)
                Column(Modifier.padding(start = 14.dp).weight(1f)) {
                    Text("School calendar", fontWeight = FontWeight.Bold)
                    Text("Holidays, exams, events and deadlines", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
                }
            }
        }
    }
    item {
        Card(
            onClick = onOpenLeave,
            modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 6.dp),
            shape = RoundedCornerShape(18.dp),
        ) {
            Row(Modifier.fillMaxWidth().padding(18.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.AutoMirrored.Outlined.EventNote, contentDescription = null, tint = FamilyIndigo)
                Column(Modifier.padding(start = 14.dp).weight(1f)) {
                    Text("Leave requests", fontWeight = FontWeight.Bold)
                    Text("Request an absence and follow the school's decision", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
                }
            }
        }
    }
    if (dashboard.role != "STUDENT") {
        item { Subheading("Results") }
        if (details.results.isEmpty()) item { EmptyMessage("Completed examination results will appear here.") }
        else items(details.results, key = { it.id }) { ResultCard(it) }
    }
    item {
        Card(onClick = onSwitchAccount, modifier = Modifier.fillMaxWidth().padding(20.dp), shape = RoundedCornerShape(18.dp)) {
            Row(Modifier.fillMaxWidth().padding(18.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = null, tint = FamilyIndigo)
                Column(Modifier.padding(start = 14.dp)) {
                    Text("Switch account or role", fontWeight = FontWeight.Bold)
                    Text("Choose another profile without a new OTP", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
                }
            }
        }
    }
    }
}

@Composable
private fun StudentMoreTab(
    dashboard: FamilyDashboard,
    student: FamilyStudent,
    state: FamilyUiState,
    onSelect: (String) -> Unit,
    onOpenTimetable: () -> Unit,
    onOpenLeave: () -> Unit,
    onOpenCalendar: () -> Unit,
    onOpenTransport: () -> Unit,
    onOpenNotifications: () -> Unit,
    onOpenFees: () -> Unit,
    onSwitchAccount: () -> Unit,
    modifier: Modifier,
) {
    LazyColumn(
        modifier.fillMaxSize().background(MaterialTheme.colorScheme.background),
        contentPadding = PaddingValues(bottom = 30.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        item { FamilyPageIntro(dashboard, student, "More", onSelect) }
        item { StudentSectionHeading("Learning", "Your classes and important dates") }
        item { StudentMoreAction(Icons.Outlined.Schedule, "Class timetable", "See your weekly class schedule", Color(0xFF4F46E5), onOpenTimetable) }
        item { StudentMoreAction(Icons.Outlined.CalendarMonth, "School calendar", "Exams, holidays and deadlines", Color(0xFF0F8A83), onOpenCalendar) }
        item { Spacer(Modifier.height(5.dp)) }
        item { StudentSectionHeading("School life", "Updates and daily essentials") }
        item {
            StudentMoreAction(
                Icons.Outlined.Notifications, "Notifications", "Announcements and school updates",
                Color(0xFFB87014), onOpenNotifications,
                if (state.unreadNotificationCount > 0) "${state.unreadNotificationCount} new" else null,
            )
        }
        item { StudentMoreAction(Icons.Outlined.DirectionsBus, "School transport", "Route, stop and pickup time", Color(0xFF3474B7), onOpenTransport) }
        item { StudentMoreAction(Icons.AutoMirrored.Outlined.EventNote, "Leave requests", "Request leave and track decisions", Color(0xFF9A58AD), onOpenLeave) }
        item { Spacer(Modifier.height(5.dp)) }
        item { StudentSectionHeading("Account", "Your school account") }
        item { StudentMoreAction(Icons.Outlined.Payments, "Fees", "Installments and payments", Color(0xFFB74E69), onOpenFees) }
        item { StudentMoreAction(Icons.AutoMirrored.Filled.Logout, "Switch account or role", "Choose another linked profile", FamilyIndigo, onSwitchAccount) }
    }
}

@Composable
private fun StudentMoreAction(
    icon: ImageVector,
    title: String,
    subtitle: String,
    accent: Color,
    onClick: () -> Unit,
    badge: String? = null,
) {
    Card(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Row(Modifier.fillMaxWidth().padding(15.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(43.dp).background(accent.copy(alpha = .1f), RoundedCornerShape(13.dp)), contentAlignment = Alignment.Center) {
                Icon(icon, contentDescription = null, tint = accent, modifier = Modifier.size(22.dp))
            }
            Column(Modifier.weight(1f).padding(start = 13.dp)) {
                Text(title, color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                Text(subtitle, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
            if (badge != null) {
                Text(badge, color = accent, fontWeight = FontWeight.Bold, fontSize = 10.sp, modifier = Modifier.padding(end = 6.dp))
            }
            Icon(Icons.AutoMirrored.Filled.ArrowForward, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(16.dp))
        }
    }
}

@Composable
private fun NotificationsTab(
    state: FamilyUiState,
    onOpen: (String) -> Unit,
    onRefresh: () -> Unit,
    onBack: () -> Unit,
    modifier: Modifier,
) {
    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(bottom = 28.dp),
    ) {
        item {
            Box(Modifier.padding(top = 12.dp, bottom = 14.dp)) {
                StudentPageHeader(
                    title = "Notifications",
                    subtitle = if (state.unreadNotificationCount > 0) "${state.unreadNotificationCount} unread school updates"
                        else "You are all caught up",
                    onBack = onBack,
                    action = {
                        Surface(onClick = onRefresh, modifier = Modifier.size(43.dp), shape = CircleShape,
                            color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = .78f)) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(Icons.Default.Refresh, contentDescription = "Refresh notifications", modifier = Modifier.size(20.dp))
                            }
                        }
                    },
                )
            }
        }
        when {
            state.notificationsLoading && state.notifications.isEmpty() -> item { LoadingBlock() }
            state.notificationsError != null && state.notifications.isEmpty() -> item {
                InlineError(state.notificationsError, onRefresh)
            }
            state.notifications.isEmpty() -> item {
                EmptyMessage("School announcements and updates will appear here.")
            }
            else -> items(state.notifications, key = { it.id }) { notification ->
                NotificationCard(notification, onOpen)
            }
        }
    }
}

@Composable
private fun NotificationCard(
    notification: FamilyNotification,
    onOpen: (String) -> Unit,
) {
    val urgent = notification.priority == "URGENT"
    Card(
        onClick = { onOpen(notification.id) },
        modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 6.dp),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(
            containerColor = when {
                urgent && !notification.read -> FamilyRed.copy(alpha = .09f)
                !notification.read -> FamilyIndigo.copy(alpha = .09f)
                else -> MaterialTheme.colorScheme.surface
            },
        ),
        border = if (!notification.read) BorderStroke(
            1.dp,
            if (urgent) FamilyRed.copy(alpha = .35f) else FamilyIndigo.copy(alpha = .3f),
        ) else null,
    ) {
        Column(Modifier.padding(16.dp)) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                if (!notification.read) {
                    Box(
                        Modifier.size(9.dp).background(
                            if (urgent) FamilyRed else FamilyIndigo,
                            CircleShape,
                        ),
                    )
                    Spacer(Modifier.width(9.dp))
                }
                Text(
                    notification.title,
                    Modifier.weight(1f),
                    fontWeight = if (notification.read) FontWeight.SemiBold else FontWeight.Bold,
                    fontSize = 16.sp,
                )
                if (urgent) {
                    Badge(containerColor = FamilyRed) { Text("URGENT", color = Color.White) }
                }
            }
            Text(
                notification.body,
                Modifier.padding(top = 9.dp),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                fontSize = 13.sp,
                lineHeight = 19.sp,
            )
            Text(
                listOf(
                    notification.category.replace('_', ' ').lowercase().replaceFirstChar(Char::uppercase),
                    notification.targetLabel,
                    date(notification.publishedAt),
                ).filter(String::isNotBlank).joinToString(" · "),
                Modifier.padding(top = 12.dp),
                color = if (notification.read) MaterialTheme.colorScheme.onSurfaceVariant else FamilyIndigo,
                fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold,
            )
        }
    }
}

@Composable
private fun TimetableTab(
    dashboard: FamilyDashboard,
    student: FamilyStudent,
    state: FamilyUiState,
    onSelect: (String) -> Unit,
    onRefresh: () -> Unit,
    onBack: () -> Unit,
    modifier: Modifier,
) {
    val schoolDays = listOf("MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY")
    val today = LocalDate.now().dayOfWeek.name
    val initialDay = today.takeIf { it in schoolDays } ?: "MONDAY"
    var selectedDay by rememberSaveable(student.id) { mutableStateOf(initialDay) }

    DetailList(modifier, dashboard, student, "Class timetable", state, onSelect, onRefresh, onBack) { details ->
        item {
            LazyRow(
                contentPadding = PaddingValues(horizontal = 20.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                items(schoolDays) { day ->
                    if (dashboard.role == "STUDENT") {
                        val selected = selectedDay == day
                        Surface(
                            onClick = { selectedDay = day },
                            shape = RoundedCornerShape(13.dp),
                            color = if (selected) FamilyIndigo else MaterialTheme.colorScheme.surface,
                            shadowElevation = if (selected) 2.dp else 1.dp,
                        ) {
                            Text(
                                day.take(3).lowercase().replaceFirstChar(Char::uppercase),
                                Modifier.padding(horizontal = 17.dp, vertical = 11.dp),
                                color = if (selected) Color.White else MaterialTheme.colorScheme.onSurfaceVariant,
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 12.sp,
                            )
                        }
                    } else {
                        FilterChip(
                            selected = selectedDay == day,
                            onClick = { selectedDay = day },
                            label = { Text(day.take(3).lowercase().replaceFirstChar(Char::uppercase)) },
                        )
                    }
                }
            }
        }

        val entries = details.timetable
            .filter { it.day == selectedDay }
            .sortedBy { it.displayOrder }
        if (dashboard.role == "STUDENT") {
            item {
                StudentTimetableSummary(
                    selectedDay.lowercase().replaceFirstChar(Char::uppercase),
                    entries.size,
                    selectedDay == today,
                )
            }
        }
        if (entries.isEmpty()) {
            item {
                if (dashboard.role == "STUDENT") {
                    StudentEmptyState(Icons.Outlined.Schedule, "No classes scheduled", "Your timetable has no classes for ${selectedDay.lowercase().replaceFirstChar(Char::uppercase)}.")
                } else {
                    EmptyMessage("No classes are scheduled for ${selectedDay.lowercase().replaceFirstChar(Char::uppercase)}.")
                }
            }
        } else {
            items(entries, key = { it.id }) { entry ->
                if (dashboard.role == "STUDENT") StudentTimetableCard(entry)
                else TimetableCard(entry)
            }
        }
    }
}

@Composable
private fun StudentTimetableSummary(day: String, count: Int, isToday: Boolean) {
    Card(
        Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 8.dp),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = FamilyIndigo.copy(alpha = .08f)),
    ) {
        Row(Modifier.fillMaxWidth().padding(17.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(42.dp).background(FamilyIndigo.copy(alpha = .12f), RoundedCornerShape(13.dp)), contentAlignment = Alignment.Center) {
                Icon(Icons.Outlined.Schedule, contentDescription = null, tint = FamilyIndigo, modifier = Modifier.size(22.dp))
            }
            Column(Modifier.weight(1f).padding(start = 13.dp)) {
                Text(day, color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                Text("$count ${if (count == 1) "class" else "classes"} scheduled", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
            }
            if (isToday) Text("TODAY", color = FamilyIndigo, fontWeight = FontWeight.Bold, fontSize = 10.sp, letterSpacing = .7.sp)
        }
    }
}

@Composable
private fun StudentTimetableCard(entry: FamilyTimetableEntry) {
    Card(
        Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 5.dp),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Row(Modifier.fillMaxWidth().padding(17.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(
                Modifier.width(86.dp).background(FamilyIndigo.copy(alpha = .09f), RoundedCornerShape(13.dp)).padding(horizontal = 10.dp, vertical = 12.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(entry.periodName, color = FamilyIndigo, fontWeight = FontWeight.Bold, fontSize = 11.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text(entry.startTime.take(5), color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 10.sp)
            }
            Column(Modifier.weight(1f).padding(start = 15.dp)) {
                Text(entry.subjectName, color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                if (entry.teacherName.isNotBlank()) Text(entry.teacherName, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
                if (entry.endTime.isNotBlank()) Text("Until ${entry.endTime.take(5)}", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
            }
        }
    }
}

@Composable
private fun TimetableCard(entry: FamilyTimetableEntry) {
    RowCard {
        Column(Modifier.width(82.dp)) {
            Text(entry.periodName, color = FamilyIndigo, fontWeight = FontWeight.Bold, fontSize = 12.sp)
            Text(
                listOf(entry.startTime, entry.endTime).filter(String::isNotBlank).joinToString(" – "),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                fontSize = 10.sp,
            )
        }
        Column(Modifier.weight(1f).padding(start = 12.dp)) {
            Text(entry.subjectName, fontWeight = FontWeight.Bold, fontSize = 16.sp)
            Text(entry.teacherName, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun LeaveRequestsTab(
    dashboard: FamilyDashboard,
    student: FamilyStudent,
    state: FamilyUiState,
    onSelect: (String) -> Unit,
    onRefresh: () -> Unit,
    onSubmit: (String, String, String) -> Unit,
    onCancel: (String) -> Unit,
    onBack: () -> Unit,
    modifier: Modifier,
) {
    var startDate by rememberSaveable(student.id) { mutableStateOf("") }
    var endDate by rememberSaveable(student.id) { mutableStateOf("") }
    var reason by rememberSaveable(student.id) { mutableStateOf("") }
    var pickerTarget by rememberSaveable { mutableStateOf<String?>(null) }

    LaunchedEffect(state.leaveMessage) {
        if (state.leaveMessage == "Leave request submitted for review.") {
            startDate = ""
            endDate = ""
            reason = ""
        }
    }

    pickerTarget?.let { target ->
        val current = if (target == "START") startDate else endDate
        val initialMillis = runCatching {
            LocalDate.parse(current).atStartOfDay().toInstant(ZoneOffset.UTC).toEpochMilli()
        }.getOrDefault(Instant.now().toEpochMilli())
        val pickerState = rememberDatePickerState(initialSelectedDateMillis = initialMillis)
        DatePickerDialog(
            onDismissRequest = { pickerTarget = null },
            confirmButton = {
                TextButton(onClick = {
                    pickerState.selectedDateMillis?.let { millis ->
                        val value = Instant.ofEpochMilli(millis).atZone(ZoneOffset.UTC).toLocalDate().toString()
                        if (target == "START") {
                            startDate = value
                            if (endDate.isBlank() || endDate < value) endDate = value
                        } else {
                            endDate = value
                        }
                    }
                    pickerTarget = null
                }) { Text("Done") }
            },
            dismissButton = { TextButton(onClick = { pickerTarget = null }) { Text("Cancel") } },
        ) { DatePicker(state = pickerState) }
    }

    DetailList(modifier, dashboard, student, "Leave requests", state, onSelect, onRefresh, onBack) { details ->
        item {
            Card(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 6.dp),
                shape = RoundedCornerShape(22.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = .75f)),
                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
            ) {
                Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Surface(shape = RoundedCornerShape(13.dp), color = FamilyIndigo.copy(alpha = .10f)) {
                            Icon(Icons.AutoMirrored.Outlined.EventNote, contentDescription = null, tint = FamilyIndigo,
                                modifier = Modifier.padding(10.dp).size(20.dp))
                        }
                        Column(Modifier.padding(start = 12.dp)) {
                            Text("Request leave", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                            Text("Send an absence request to your school", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
                        }
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        DateField("From", startDate, Modifier.weight(1f)) { pickerTarget = "START" }
                        DateField("To", endDate, Modifier.weight(1f)) { pickerTarget = "END" }
                    }
                    OutlinedTextField(
                        value = reason,
                        onValueChange = { reason = it.take(2000) },
                        label = { Text("Reason") },
                        placeholder = { Text("Medical appointment, family function…") },
                        minLines = 3,
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(17.dp),
                    )
                    state.leaveMessage?.let {
                        Text(
                            it,
                            color = if (it in setOf("Leave request submitted for review.", "Leave request cancelled.")) FamilyGreen else MaterialTheme.colorScheme.error,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.SemiBold,
                        )
                    }
                    Button(
                        onClick = { onSubmit(startDate, endDate, reason.trim()) },
                        enabled = !state.leaveSaving && startDate.isNotBlank() && endDate.isNotBlank() && endDate >= startDate && reason.trim().length >= 5,
                        modifier = Modifier.fillMaxWidth().height(52.dp),
                        shape = RoundedCornerShape(17.dp),
                    ) {
                        if (state.leaveSaving) CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp)
                        else Text("Submit request")
                    }
                }
            }
        }
        item { Subheading("Leave history") }
        if (details.leaveRequests.isEmpty()) {
            item { EmptyMessage("No leave requests have been submitted for this student.") }
        } else {
            items(details.leaveRequests, key = { it.id }) { request ->
                LeaveRequestCard(request, state.leaveSaving, onCancel)
            }
        }
    }
}

@Composable
private fun DateField(label: String, value: String, modifier: Modifier, onClick: () -> Unit) {
    Surface(
        onClick = onClick,
        modifier = modifier.height(62.dp),
        shape = RoundedCornerShape(17.dp),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = .58f),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
    ) {
        Row(Modifier.fillMaxSize().padding(horizontal = 13.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Outlined.CalendarMonth, contentDescription = null, tint = FamilyIndigo, modifier = Modifier.size(18.dp))
            Column(Modifier.padding(start = 9.dp)) {
                Text(label.uppercase(), fontSize = 9.sp, fontWeight = FontWeight.Bold,
                    letterSpacing = .5.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text(value.takeIf(String::isNotBlank)?.let(::date) ?: "Choose date",
                    fontSize = 12.sp, fontWeight = FontWeight.SemiBold, maxLines = 1)
            }
        }
    }
}

@Composable
private fun LeaveRequestCard(request: FamilyLeaveRequest, saving: Boolean, onCancel: (String) -> Unit) {
    val start = runCatching { LocalDate.parse(request.startDate.take(10)) }.getOrNull()
    val end = runCatching { LocalDate.parse(request.endDate.take(10)) }.getOrNull()
    val duration = if (start != null && end != null) ChronoUnit.DAYS.between(start, end) + 1 else null
    ColumnCard {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(
                    if (request.startDate.take(10) == request.endDate.take(10)) date(request.startDate)
                    else "${date(request.startDate)} – ${date(request.endDate)}",
                    fontWeight = FontWeight.Bold,
                )
                duration?.let { Text("$it ${if (it == 1L) "day" else "days"} leave", color = FamilyIndigo, fontSize = 12.sp) }
            }
            StatusText(request.status)
        }
        Text(request.reason, Modifier.padding(top = 12.dp), color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 13.sp)
        request.decisionNote?.let {
            Text("School note: $it", Modifier.padding(top = 10.dp), fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
        }
        if (request.status == "PENDING") {
            TextButton(onClick = { onCancel(request.id) }, enabled = !saving, modifier = Modifier.align(Alignment.End)) {
                Text("Cancel request", color = FamilyRed)
            }
        }
    }
}

@Composable
private fun CalendarTab(
    dashboard: FamilyDashboard,
    student: FamilyStudent,
    state: FamilyUiState,
    onSelect: (String) -> Unit,
    onRefresh: () -> Unit,
    onBack: () -> Unit,
    modifier: Modifier,
) {
    var mode by rememberSaveable { mutableStateOf("UPCOMING") }
    var monthValue by rememberSaveable { mutableStateOf(YearMonth.now().toString()) }

    DetailList(modifier, dashboard, student, "School calendar", state, onSelect, onRefresh, onBack) { details ->
        item {
            Row(Modifier.padding(horizontal = 20.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterChip(selected = mode == "UPCOMING", onClick = { mode = "UPCOMING" }, label = { Text("Upcoming") })
                FilterChip(selected = mode == "MONTH", onClick = { mode = "MONTH" }, label = { Text("By month") })
            }
        }

        val today = LocalDate.now()
        val visibleEvents = if (mode == "MONTH") {
            val month = YearMonth.parse(monthValue)
            val monthStart = month.atDay(1)
            val monthEnd = month.atEndOfMonth()
            item {
                Row(
                    Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    TextButton(onClick = { monthValue = month.minusMonths(1).toString() }) { Text("Previous") }
                    Text(
                        month.format(DateTimeFormatter.ofPattern("MMMM yyyy")),
                        Modifier.weight(1f),
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                        fontWeight = FontWeight.Bold,
                    )
                    TextButton(onClick = { monthValue = month.plusMonths(1).toString() }) { Text("Next") }
                }
            }
            details.calendarEvents.filter { event ->
                val start = calendarDate(event.startDate)
                val end = calendarDate(event.endDate)
                start != null && end != null && start <= monthEnd && end >= monthStart
            }
        } else {
            details.calendarEvents.filter { event ->
                calendarDate(event.endDate)?.let { it >= today } == true
            }
        }

        if (visibleEvents.isEmpty()) {
            item { EmptyMessage(if (mode == "MONTH") "Nothing is scheduled in this month." else "No upcoming school events or deadlines.") }
        } else {
            items(visibleEvents, key = { it.id }) { CalendarEventCard(it) }
        }
    }
}

@Composable
private fun CalendarEventCard(event: FamilyCalendarEvent) {
    val color = calendarColor(event.category)
    Card(
        Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 5.dp),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = color.copy(alpha = .09f)),
        border = BorderStroke(1.dp, color.copy(alpha = .22f)),
    ) {
        Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.width(58.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Text(event.startDate.take(10).let(::calendarDate)?.format(DateTimeFormatter.ofPattern("MMM"))?.uppercase() ?: "DATE", color = color, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                Text(event.startDate.take(10).let(::calendarDate)?.dayOfMonth?.toString() ?: "—", color = color, fontSize = 23.sp, fontWeight = FontWeight.Bold)
            }
            Column(Modifier.weight(1f).padding(start = 12.dp)) {
                Text(event.category.replace('_', ' '), color = color, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                Text(event.title, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                Text(
                    if (event.startDate.take(10) == event.endDate.take(10)) date(event.startDate)
                    else "${date(event.startDate)} – ${date(event.endDate)}",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontSize = 11.sp,
                )
                event.description?.let { Text(it, Modifier.padding(top = 5.dp), color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp, maxLines = 3, overflow = TextOverflow.Ellipsis) }
            }
        }
    }
}

@Composable
private fun TransportTab(
    dashboard: FamilyDashboard,
    student: FamilyStudent,
    state: FamilyUiState,
    onSelect: (String) -> Unit,
    onRefresh: () -> Unit,
    onBack: () -> Unit,
    modifier: Modifier,
) = DetailList(modifier, dashboard, student, "School transport", state, onSelect, onRefresh, onBack) { details ->
    val transport = details.transport
    if (transport == null) {
        item { EmptyMessage("No active transport assignment is linked to this student.") }
    } else {
        item { TransportHero(transport) }
        item {
            Row(
                Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 6.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                TransportMetric("Pickup", transport.stop.pickupTime ?: "To confirm", Modifier.weight(1f))
                TransportMetric("Drop", transport.stop.dropTime ?: "To confirm", Modifier.weight(1f))
            }
        }
        item { TransportVehicleCard(transport) }
        if (transport.stops.isNotEmpty()) {
            item { Subheading("Route stops") }
            items(transport.stops, key = { it.id }) { stop ->
                TransportStopCard(stop, stop.id == transport.stop.id)
            }
        }
        transport.notes?.let { note ->
            item { ColumnCard { Text("Transport note", color = FamilyIndigo, fontWeight = FontWeight.Bold, fontSize = 12.sp); Text(note, Modifier.padding(top = 6.dp), fontSize = 13.sp) } }
        }
    }
}

@Composable
private fun TransportHero(transport: FamilyTransportAssignment) {
    Card(
        Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 6.dp),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF172554)),
    ) {
        Column(Modifier.padding(20.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.Route, contentDescription = null, tint = Color(0xFF67E8F9))
                Text("YOUR DAILY JOURNEY", Modifier.padding(start = 8.dp), color = Color(0xFFA5F3FC), fontSize = 11.sp, fontWeight = FontWeight.Bold)
            }
            Text(transport.routeName, Modifier.padding(top = 12.dp), color = Color.White, fontSize = 24.sp, fontWeight = FontWeight.Bold)
            Text(
                listOf(
                    transport.routeCode,
                    when {
                        transport.pickupEnabled && transport.dropEnabled -> "Pickup & drop"
                        transport.pickupEnabled -> "Pickup only"
                        transport.dropEnabled -> "Drop only"
                        else -> "Transport assigned"
                    },
                ).filter(String::isNotBlank).joinToString(" · "),
                Modifier.padding(top = 6.dp),
                color = Color.White.copy(alpha = .75f),
                fontSize = 12.sp,
            )
            Card(
                Modifier.fillMaxWidth().padding(top = 18.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = .12f)),
            ) {
                Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Outlined.LocationOn, contentDescription = null, tint = Color.White)
                    Column(Modifier.padding(start = 10.dp)) {
                        Text("Boarding stop", color = Color.White.copy(alpha = .7f), fontSize = 11.sp)
                        Text(transport.stop.name, color = Color.White, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

@Composable
private fun TransportMetric(label: String, value: String, modifier: Modifier) {
    Card(modifier, shape = RoundedCornerShape(18.dp)) {
        Column(Modifier.padding(16.dp)) {
            Text(label, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
            Text(value, Modifier.padding(top = 4.dp), fontWeight = FontWeight.Bold, fontSize = 17.sp)
        }
    }
}

@Composable
private fun TransportVehicleCard(transport: FamilyTransportAssignment) {
    val vehicle = transport.vehicle
    ColumnCard {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Outlined.DirectionsBus, contentDescription = null, tint = FamilyIndigo)
            Column(Modifier.padding(start = 12.dp).weight(1f)) {
                Text("Assigned vehicle", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
                Text(vehicle?.name ?: vehicle?.registrationNo ?: "Vehicle to be assigned", fontWeight = FontWeight.Bold, fontSize = 17.sp)
                vehicle?.let { Text("${it.registrationNo} · ${it.type.replace('_', ' ')}", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp) }
            }
        }
        vehicle?.let {
            HorizontalDivider(Modifier.padding(vertical = 14.dp))
            TransportContact("Driver", it.driverName, it.driverPhone)
            if (!it.attendantName.isNullOrBlank()) {
                Spacer(Modifier.height(12.dp))
                TransportContact("Attendant", it.attendantName, it.attendantPhone)
            }
        }
        transport.stop.monthlyFee?.let {
            HorizontalDivider(Modifier.padding(vertical = 14.dp))
            Text("Monthly transport fee: ${currency(it)}", color = FamilyIndigo, fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
private fun TransportContact(label: String, name: String, phone: String?) {
    val context = LocalContext.current
    Row(verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text(label, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
            Text(name, fontWeight = FontWeight.SemiBold)
        }
        if (!phone.isNullOrBlank()) {
            OutlinedButton(onClick = {
                context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:+91$phone")))
            }) {
                Icon(Icons.Outlined.Phone, contentDescription = null, modifier = Modifier.size(17.dp))
                Spacer(Modifier.width(6.dp))
                Text("Call")
            }
        }
    }
}

@Composable
private fun TransportStopCard(stop: FamilyTransportStop, selected: Boolean) {
    Card(
        Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 4.dp),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = if (selected) FamilyIndigo.copy(alpha = .1f) else MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, if (selected) FamilyIndigo else MaterialTheme.colorScheme.outlineVariant),
    ) {
        Row(Modifier.fillMaxWidth().padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Surface(shape = CircleShape, color = if (selected) FamilyIndigo else MaterialTheme.colorScheme.surfaceVariant) {
                Text(stop.sequence?.toString() ?: "•", Modifier.padding(horizontal = 9.dp, vertical = 5.dp), color = if (selected) Color.White else MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Bold)
            }
            Column(Modifier.weight(1f).padding(start = 12.dp)) {
                Text(stop.name, fontWeight = FontWeight.SemiBold, color = if (selected) FamilyIndigo else MaterialTheme.colorScheme.onSurface)
                if (selected) Text("Your stop", color = FamilyIndigo, fontSize = 11.sp)
            }
            Text(stop.pickupTime ?: "—", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
        }
    }
}

@Composable
private fun DetailList(
    modifier: Modifier,
    dashboard: FamilyDashboard,
    student: FamilyStudent,
    title: String,
    state: FamilyUiState,
    onSelect: (String) -> Unit,
    onRefresh: () -> Unit,
    onBack: (() -> Unit)? = null,
    content: LazyListScope.(FamilyStudentDetails) -> Unit,
) {
    LazyColumn(modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 34.dp)) {
        item { FamilyPageIntro(dashboard, student, title, onSelect, onBack) }
        when {
            state.detailsLoading && state.details == null -> item { LoadingBlock() }
            state.detailsError != null && state.details == null -> item { InlineError(state.detailsError, onRefresh) }
            state.details != null -> content(state.details)
        }
    }
}

@Composable
private fun FamilyPageIntro(
    dashboard: FamilyDashboard,
    student: FamilyStudent,
    title: String,
    onSelect: (String) -> Unit,
    onBack: (() -> Unit)? = null,
) {
    Column(Modifier.padding(top = 12.dp, bottom = 14.dp)) {
        if (dashboard.role == "STUDENT") {
            StudentPageHeader(
                title = title,
                subtitle = listOfNotNull(student.className, student.sectionName?.let { "Section $it" })
                    .joinToString("  ·  ").ifBlank { student.fullName },
                onBack = onBack,
            )
        } else {
            Text(title, Modifier.padding(horizontal = 20.dp), fontWeight = FontWeight.Bold, fontSize = 24.sp)
            Text(student.fullName, Modifier.padding(horizontal = 20.dp), color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 13.sp)
        }
        if (dashboard.students.size > 1) {
            Spacer(Modifier.height(14.dp))
            LazyRow(contentPadding = PaddingValues(horizontal = 20.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                items(dashboard.students, key = { it.id }) { item -> StudentChip(item, item.id == student.id) { onSelect(item.id) } }
            }
        }
    }
}

@Composable
private fun StudentPageHeader(
    title: String,
    subtitle: String,
    onBack: (() -> Unit)? = null,
    action: (@Composable () -> Unit)? = null,
) {
    Row(Modifier.fillMaxWidth().padding(horizontal = 20.dp), verticalAlignment = Alignment.CenterVertically) {
        if (onBack != null) {
            Surface(
                onClick = onBack,
                modifier = Modifier.size(43.dp),
                shape = CircleShape,
                color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = .78f),
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", modifier = Modifier.size(21.dp))
                }
            }
            Spacer(Modifier.width(13.dp))
        }
        Column(Modifier.weight(1f)) {
            Text(title, color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.ExtraBold,
                fontSize = 27.sp, lineHeight = 31.sp, letterSpacing = (-.45).sp)
            Text(subtitle, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp,
                maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        if (action != null) {
            Spacer(Modifier.width(10.dp))
            action()
        }
    }
}

@Composable
private fun StudentChip(student: FamilyStudent, selected: Boolean, onClick: () -> Unit) {
    Card(
        onClick = onClick,
        shape = RoundedCornerShape(18.dp),
        border = BorderStroke(1.dp, if (selected) FamilyIndigo else MaterialTheme.colorScheme.outlineVariant),
        colors = CardDefaults.cardColors(containerColor = if (selected) FamilyIndigo.copy(alpha = .1f) else MaterialTheme.colorScheme.surface),
    ) {
        Row(Modifier.padding(horizontal = 14.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Default.Person, null, tint = FamilyIndigo, modifier = Modifier.size(20.dp))
            Column(Modifier.padding(start = 8.dp)) {
                Text(student.fullName, fontWeight = FontWeight.SemiBold, maxLines = 1)
                Text(listOfNotNull(student.className, student.sectionName?.let { "Sec $it" }).joinToString(" · "), color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
            }
        }
    }
}

@Composable
private fun StudentSummary(student: FamilyStudent) {
    Card(Modifier.fillMaxWidth().padding(horizontal = 20.dp), shape = RoundedCornerShape(24.dp), colors = CardDefaults.cardColors(containerColor = FamilyIndigo)) {
        Column(Modifier.padding(20.dp)) {
            Text(student.relationship, color = Color.White.copy(alpha = .75f), fontSize = 12.sp)
            Text(student.fullName, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 23.sp)
            Text(
                listOfNotNull(student.className, student.sectionName?.let { "Section $it" }, student.rollNo?.let { "Roll $it" }).joinToString(" · ").ifBlank { "Enrollment details unavailable" },
                Modifier.padding(top = 8.dp), color = Color.White.copy(alpha = .88f), fontSize = 14.sp,
            )
            if (student.admissionNo.isNotBlank()) Text("Admission no. ${student.admissionNo}", color = Color.White.copy(alpha = .72f), fontSize = 12.sp)
        }
    }
}

@Composable
private fun Metrics(student: FamilyStudent, isStudent: Boolean) {
    Column(Modifier.fillMaxWidth().padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            MetricCard("Attendance", student.attendancePercentage?.let { "${number(it)}%" } ?: "—", "${student.attendanceAttended} of ${student.attendanceTotal} sessions", Modifier.weight(1f))
            MetricCard("Homework", student.pendingHomeworkCount.toString(), "active assignments", Modifier.weight(1f))
        }
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            if (isStudent) {
                MetricCard("Results", student.completedResultCount.toString(), "completed exams", Modifier.weight(1f))
                MetricCard("Fees due", currency(student.outstandingFee), if (student.outstandingFee > 0) "outstanding" else "nothing pending", Modifier.weight(1f))
            } else {
                MetricCard("Fees due", currency(student.outstandingFee), if (student.outstandingFee > 0) "outstanding" else "nothing pending", Modifier.weight(1f))
                MetricCard("Results", student.completedResultCount.toString(), "completed exams", Modifier.weight(1f))
            }
        }
    }
}

@Composable
private fun MetricCard(label: String, value: String, detail: String, modifier: Modifier = Modifier) {
    Card(modifier, shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = .72f)),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)) {
        Column(Modifier.padding(16.dp)) {
            Text(label, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
            Text(value, fontWeight = FontWeight.Bold, fontSize = 21.sp)
            Text(detail, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
        }
    }
}

@Composable
private fun AttendanceCard(record: FamilyAttendanceRecord) {
    val recordDate = calendarDate(record.date)
    Card(
        Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 5.dp),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = .68f)),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Row(Modifier.fillMaxWidth().padding(15.dp), verticalAlignment = Alignment.CenterVertically) {
            Surface(shape = RoundedCornerShape(14.dp), color = FamilyIndigo.copy(alpha = .10f)) {
                Column(Modifier.width(48.dp).padding(vertical = 8.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(recordDate?.format(DateTimeFormatter.ofPattern("MMM"))?.uppercase() ?: "DATE",
                        color = FamilyIndigo, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                    Text(recordDate?.dayOfMonth?.toString() ?: "—", color = FamilyIndigo,
                        fontSize = 19.sp, fontWeight = FontWeight.ExtraBold)
                }
            }
            Column(Modifier.weight(1f).padding(start = 13.dp)) {
                Text(record.subjectName ?: record.sessionType.lowercase().replaceFirstChar(Char::uppercase),
                    fontWeight = FontWeight.Bold, fontSize = 14.sp)
                Text(record.sessionType.lowercase().replaceFirstChar(Char::uppercase),
                    color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
                record.remarks?.let { Text(it, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp) }
            }
            StatusText(record.status)
        }
    }
}

@Composable
private fun HomeworkCard(item: FamilyHomeworkDetails) {
    ColumnCard {
        Text(item.subjectName, color = FamilyIndigo, fontWeight = FontWeight.SemiBold, fontSize = 12.sp)
        Text(item.title, fontWeight = FontWeight.Bold, fontSize = 16.sp)
        item.description?.let { Text(it, Modifier.padding(top = 6.dp), color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 13.sp) }
        Text(item.dueDate?.let { "Assigned ${date(item.assignedDate)} · Due ${date(it)}" } ?: "Assigned ${date(item.assignedDate)}", Modifier.padding(top = 10.dp), color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
    }
}

@Composable
private fun InstallmentCard(item: FamilyFeeInstallment) {
    ColumnCard {
        Row(Modifier.fillMaxWidth()) {
            Column(Modifier.weight(1f)) {
                Text(item.name, fontWeight = FontWeight.Bold)
                Text(listOf(item.planName, item.categoryName).filter(String::isNotBlank).joinToString(" · "), color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
            }
            Text(currency(item.outstanding), color = if (item.outstanding > 0) FamilyRed else FamilyGreen, fontWeight = FontWeight.Bold)
        }
        Text("Due ${date(item.dueDate)} · Paid ${currency(item.paidAmount)} of ${currency(item.payableAmount)}", Modifier.padding(top = 8.dp), color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
    }
}

@Composable
private fun PaymentCard(item: FamilyFeePayment) {
    RowCard {
        Column(Modifier.weight(1f)) {
            Text(item.receiptNo ?: "Payment", fontWeight = FontWeight.Bold)
            Text("${date(item.paymentDate)} · ${item.paymentMode.replace('_', ' ')}", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
        }
        Text(currency(item.amount), color = FamilyGreen, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun ResultCard(item: FamilyResult) {
    Card(
        Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 6.dp),
        shape = RoundedCornerShape(21.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = .68f)),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Column(Modifier.fillMaxWidth().padding(17.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(shape = RoundedCornerShape(13.dp), color = FamilyIndigo.copy(alpha = .10f)) {
                    Icon(Icons.Default.EmojiEvents, contentDescription = null, tint = FamilyIndigo,
                        modifier = Modifier.padding(10.dp).size(20.dp))
                }
                Column(Modifier.weight(1f).padding(start = 12.dp)) {
                    Text(item.name, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                    Text("${date(item.startDate)} – ${date(item.endDate)}",
                        color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text("${number(item.percentage)}%", fontWeight = FontWeight.ExtraBold, fontSize = 20.sp)
                    StatusText(item.status)
                }
            }
            Spacer(Modifier.height(14.dp))
            LinearProgressIndicator(
                progress = { (item.percentage / 100.0).coerceIn(0.0, 1.0).toFloat() },
                modifier = Modifier.fillMaxWidth().height(6.dp).clip(CircleShape),
                color = statusColor(item.status),
                trackColor = MaterialTheme.colorScheme.surfaceVariant,
            )
            Text("${number(item.obtained)} of ${number(item.maximum)} marks",
                Modifier.padding(top = 8.dp), color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
        }
    }
}

@Composable
private fun HomeworkSummaryCard(item: FamilyHomework) = ColumnCard {
    Text(item.subjectName, color = FamilyIndigo, fontWeight = FontWeight.SemiBold, fontSize = 12.sp)
    Text(item.title, fontWeight = FontWeight.SemiBold, maxLines = 2, overflow = TextOverflow.Ellipsis)
    if (item.dueDate.isNotBlank()) Text("Due ${date(item.dueDate)}", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
}

@Composable
private fun RowCard(content: @Composable RowScope.() -> Unit) {
    Card(
        Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 5.dp),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = .68f)),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically, content = content)
    }
}

@Composable
private fun ColumnCard(content: @Composable ColumnScope.() -> Unit) {
    Card(
        Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 5.dp),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = .68f)),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Column(Modifier.padding(16.dp), content = content)
    }
}

@Composable
private fun StatusText(status: String) = Text(status.lowercase().replaceFirstChar(Char::uppercase), color = statusColor(status), fontWeight = FontWeight.Bold, fontSize = 12.sp)

@Composable
private fun SectionHeader(title: String, onRefresh: () -> Unit) {
    Row(Modifier.fillMaxWidth().padding(start = 20.dp, end = 12.dp, top = 18.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(title, Modifier.weight(1f), fontWeight = FontWeight.Bold, fontSize = 18.sp)
        IconButton(onClick = onRefresh) { Icon(Icons.Default.Refresh, contentDescription = "Refresh") }
    }
}

@Composable
private fun Subheading(title: String) = Text(title, Modifier.padding(start = 20.dp, top = 22.dp, bottom = 9.dp),
    fontWeight = FontWeight.ExtraBold, fontSize = 19.sp, letterSpacing = (-.2).sp)

@Composable
private fun EmptyMessage(message: String) {
    Surface(
        Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 6.dp),
        shape = RoundedCornerShape(20.dp),
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = .68f)),
    ) {
        Text(message, Modifier.padding(18.dp), color = MaterialTheme.colorScheme.onSurfaceVariant,
            fontSize = 13.sp, lineHeight = 19.sp)
    }
}

@Composable
private fun LoadingBlock() = Box(Modifier.fillMaxWidth().height(180.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator() }

@Composable
private fun InlineError(message: String, onRefresh: () -> Unit) {
    Column(Modifier.fillMaxWidth().padding(20.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Text(message, color = MaterialTheme.colorScheme.error)
        TextButton(onClick = onRefresh) { Text("Try again") }
    }
}

@Composable
private fun LoadingPage(modifier: Modifier) = Box(modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }

@Composable
private fun FamilyError(message: String, onRefresh: () -> Unit, modifier: Modifier) {
    Box(modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(message, color = MaterialTheme.colorScheme.onSurfaceVariant)
            TextButton(onClick = onRefresh) { Text("Try again") }
        }
    }
}

private fun statusColor(status: String) = when (status) {
    "PRESENT", "PASS", "PAID" -> FamilyGreen
    "ABSENT", "FAIL", "OVERDUE" -> FamilyRed
    else -> FamilyAmber
}

private fun calendarColor(category: String) = when (category) {
    "HOLIDAY" -> FamilyGreen
    "EXAM" -> Color(0xFF7C3AED)
    "FEE_DEADLINE" -> FamilyAmber
    "PARENT_MEETING" -> Color(0xFFDB2777)
    "HOMEWORK" -> FamilyIndigo
    else -> Color(0xFF2563EB)
}

private fun calendarDate(value: String) = runCatching { LocalDate.parse(value.take(10)) }.getOrNull()

private fun number(value: Double) = if (value % 1.0 == 0.0) value.toInt().toString() else String.format(Locale.US, "%.1f", value)
private fun currency(value: Double) = NumberFormat.getCurrencyInstance(Locale.forLanguageTag("en-IN")).apply { maximumFractionDigits = 0 }.format(value)
private fun date(value: String) = runCatching { OffsetDateTime.parse(value).format(DateTimeFormatter.ofPattern("d MMM yyyy")) }.getOrDefault(value.take(10))
