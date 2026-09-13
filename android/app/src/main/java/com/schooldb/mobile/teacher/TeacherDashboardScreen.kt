package com.schooldb.mobile.teacher

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Assignment
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.School
import androidx.compose.material3.Button
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel

@Composable
fun TeacherDashboardScreen(viewModel: TeacherViewModel = viewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbar = remember { SnackbarHostState() }

    LaunchedEffect(state.message) {
        state.message?.let {
            snackbar.showSnackbar(it)
            viewModel.clearMessage()
        }
    }

    state.attendanceSheet?.let { sheet ->
        AttendanceScreen(
            sheet = sheet,
            saving = state.saving,
            onStatusChange = viewModel::setStatus,
            onSave = viewModel::saveAttendance,
            onBack = viewModel::closeAttendance,
            snackbar = snackbar,
        )
        return
    }

    if (state.context?.role == "TEACHER" && state.dashboard != null) {
        TeacherShell(state, snackbar, viewModel)
    } else {
        TeacherHome(
            state = state,
            snackbar = snackbar,
            onRefresh = viewModel::refresh,
            onOpenAttendance = viewModel::openAttendance,
            onOpenDailyAttendance = viewModel::openDailyAttendance,
            onSignOut = viewModel::signOut,
        )
    }
}

private enum class TeacherTab { HOME, ATTENDANCE, HOMEWORK, NOTICES }

@Composable
private fun TeacherShell(
    state: TeacherUiState,
    snackbar: SnackbarHostState,
    teacherViewModel: TeacherViewModel,
    noticeViewModel: NoticeViewModel = viewModel(),
) {
    var tab by rememberSaveable { mutableStateOf(TeacherTab.HOME) }
    val noticeState by noticeViewModel.uiState.collectAsStateWithLifecycle()

    Scaffold(
        bottomBar = {
            NavigationBar {
                NavigationBarItem(
                    selected = tab == TeacherTab.HOME,
                    onClick = { tab = TeacherTab.HOME },
                    icon = { Icon(Icons.Default.Home, contentDescription = null) },
                    label = { Text("Home") },
                )
                NavigationBarItem(
                    selected = tab == TeacherTab.ATTENDANCE,
                    onClick = { tab = TeacherTab.ATTENDANCE },
                    icon = { Icon(Icons.Default.Groups, contentDescription = null) },
                    label = { Text("Attendance") },
                )
                NavigationBarItem(
                    selected = tab == TeacherTab.HOMEWORK,
                    onClick = { tab = TeacherTab.HOMEWORK },
                    icon = { Icon(Icons.AutoMirrored.Filled.Assignment, contentDescription = null) },
                    label = { Text("Homework") },
                )
                NavigationBarItem(
                    selected = tab == TeacherTab.NOTICES,
                    onClick = { tab = TeacherTab.NOTICES },
                    icon = {
                        BadgedBox(
                            badge = {
                                if (noticeState.unreadCount > 0) {
                                    Badge { Text(noticeState.unreadCount.coerceAtMost(99).toString()) }
                                }
                            },
                        ) { Icon(Icons.Default.Notifications, contentDescription = null) }
                    },
                    label = { Text("Notices") },
                )
            }
        },
    ) { padding ->
        Box(Modifier.fillMaxSize().padding(padding)) {
            when (tab) {
                TeacherTab.HOME -> TeacherHome(
                    state = state,
                    snackbar = snackbar,
                    onRefresh = teacherViewModel::refresh,
                    onOpenAttendance = teacherViewModel::openAttendance,
                    onOpenDailyAttendance = teacherViewModel::openDailyAttendance,
                    onSignOut = teacherViewModel::signOut,
                )
                TeacherTab.ATTENDANCE -> AttendanceHub(
                    dashboard = state.dashboard!!,
                    loading = state.loading,
                    onRefresh = teacherViewModel::refresh,
                    onOpenAttendance = teacherViewModel::openAttendance,
                    onOpenDailyAttendance = teacherViewModel::openDailyAttendance,
                )
                TeacherTab.HOMEWORK -> HomeworkScreen(onBack = { tab = TeacherTab.HOME })
                TeacherTab.NOTICES -> NoticeScreen(noticeState, noticeViewModel)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AttendanceHub(
    dashboard: TeacherDashboard,
    loading: Boolean,
    onRefresh: () -> Unit,
    onOpenAttendance: (TeachingPeriod) -> Unit,
    onOpenDailyAttendance: (DailyAttendanceTarget) -> Unit,
) {
    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Attendance", fontWeight = FontWeight.Bold)
                        Text(
                            "${dashboard.day.lowercase().replaceFirstChar(Char::uppercase)} · ${dashboard.date}",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                },
                actions = {
                    IconButton(onClick = onRefresh, enabled = !loading) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                    }
                },
            )
        },
    ) { padding ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(padding),
            contentPadding = androidx.compose.foundation.layout.PaddingValues(18.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            when (dashboard.attendanceMode) {
                "ONCE_DAILY" -> {
                    item {
                        Text(
                            "Daily attendance",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                        )
                    }
                    if (dashboard.dailyTargets.isEmpty()) {
                        item { AttendanceInfoCard("No class or section is assigned to your teacher account.") }
                    } else {
                        items(dashboard.dailyTargets, key = { "attendance-${it.classId}-${it.sectionId}" }) { target ->
                            DailyAttendanceCard(target, onOpenDailyAttendance)
                        }
                    }
                }
                "EVERY_PERIOD" -> {
                    item {
                        Text(
                            "Period attendance",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                        )
                    }
                    if (dashboard.periods.isEmpty()) {
                        item { AttendanceInfoCard("There are no timetable periods assigned today.") }
                    } else {
                        items(dashboard.periods, key = { "attendance-${it.timetableId}" }) { period ->
                            PeriodCard(period, onOpenAttendance)
                        }
                    }
                }
                "MORNING_AFTERNOON" -> item {
                    AttendanceInfoCard("Morning and afternoon attendance will appear here when sessions are assigned.")
                }
                else -> item { AttendanceInfoCard("No active attendance mode is configured.") }
            }
        }
    }
}

@Composable
private fun AttendanceInfoCard(message: String) {
    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
        Text(
            message,
            modifier = Modifier.fillMaxWidth().padding(20.dp),
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TeacherHome(
    state: TeacherUiState,
    snackbar: SnackbarHostState,
    onRefresh: () -> Unit,
    onOpenAttendance: (TeachingPeriod) -> Unit,
    onOpenDailyAttendance: (DailyAttendanceTarget) -> Unit,
    onSignOut: () -> Unit,
) {
    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        snackbarHost = { SnackbarHost(snackbar) },
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("SchoolDB", fontWeight = FontWeight.Bold)
                        state.dashboard?.let {
                            Text(
                                it.schoolName,
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        if (state.dashboard == null) state.context?.let {
                            Text(
                                it.schoolName,
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                },
                actions = {
                    IconButton(onClick = onRefresh, enabled = !state.loading) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                    }
                    IconButton(onClick = onSignOut) {
                        Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = "Sign out")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface),
            )
        },
    ) { padding ->
        when {
            state.loading && state.context == null -> LoadingPage(Modifier.padding(padding))
            state.error != null -> ErrorPage(state.error, onRefresh, Modifier.padding(padding))
            state.context != null && state.context.role != "TEACHER" -> RoleHome(state.context, Modifier.padding(padding))
            state.dashboard == null -> ErrorPage("Your teacher profile could not be loaded.", onRefresh, Modifier.padding(padding))
            else -> DashboardContent(
                dashboard = state.dashboard,
                loading = state.loading,
                onOpenAttendance = onOpenAttendance,
                onOpenDailyAttendance = onOpenDailyAttendance,
                modifier = Modifier.padding(padding),
            )
        }
    }
}

@Composable
private fun RoleHome(context: MobileContext, modifier: Modifier = Modifier) {
    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(18.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primary),
                shape = RoundedCornerShape(22.dp),
            ) {
                Column(Modifier.fillMaxWidth().padding(22.dp)) {
                    Text("Welcome back,", color = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.8f))
                    Text(
                        context.userName,
                        color = MaterialTheme.colorScheme.onPrimary,
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                    )
                    Spacer(Modifier.height(12.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Person, contentDescription = null, tint = MaterialTheme.colorScheme.onPrimary)
                        Spacer(Modifier.width(8.dp))
                        Text(context.role.displayRole, color = MaterialTheme.colorScheme.onPrimary)
                    }
                }
            }
        }
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                shape = RoundedCornerShape(18.dp),
            ) {
                Column(Modifier.fillMaxWidth().padding(20.dp)) {
                    Text("Mobile access is ready", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(8.dp))
                    Text(
                        "This first mobile workspace is built for teachers to view classes and record attendance.",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Spacer(Modifier.height(12.dp))
                    Text(
                        "To test attendance, sign in with a phone number linked to an active Teacher account in ${context.schoolName}.",
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
            }
        }
    }
}

private val String.displayRole: String
    get() = lowercase().split("_").joinToString(" ") { word -> word.replaceFirstChar(Char::uppercase) }

@Composable
private fun DashboardContent(
    dashboard: TeacherDashboard,
    loading: Boolean,
    onOpenAttendance: (TeachingPeriod) -> Unit,
    onOpenDailyAttendance: (DailyAttendanceTarget) -> Unit,
    modifier: Modifier = Modifier,
) {
    val dailyMode = dashboard.attendanceMode == "ONCE_DAILY"
    val itemCount = if (dailyMode) dashboard.dailyTargets.size else dashboard.periods.size
    val completed = if (dailyMode) {
        dashboard.dailyTargets.count { it.attendanceCount > 0 || it.attendanceLocked }
    } else {
        dashboard.periods.count { it.attendanceCount > 0 || it.attendanceLocked }
    }
    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(18.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primary),
                shape = RoundedCornerShape(22.dp),
            ) {
                Column(Modifier.fillMaxWidth().padding(22.dp)) {
                    Text("Good day,", color = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.8f))
                    Text(
                        dashboard.teacherName,
                        color = MaterialTheme.colorScheme.onPrimary,
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                    )
                    Spacer(Modifier.height(14.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(22.dp)) {
                        SummaryLabel(Icons.Default.Schedule, "$itemCount", "Classes")
                        SummaryLabel(Icons.Default.CheckCircle, "$completed", "Marked")
                    }
                }
            }
        }
        if (dailyMode) {
            item {
                Column(Modifier.padding(top = 2.dp)) {
                    Text("Daily attendance", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                    Text("Mark attendance once for the whole day", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            if (dashboard.dailyTargets.isEmpty()) {
                item {
                    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                        Text(
                            "No class or section is assigned to your teacher account.",
                            modifier = Modifier.fillMaxWidth().padding(20.dp),
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            } else {
                items(dashboard.dailyTargets, key = { "daily-${it.classId}-${it.sectionId}" }) { target ->
                    DailyAttendanceCard(target, onOpenDailyAttendance)
                }
            }
        }
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Bottom,
            ) {
                Column {
                    Text("Today’s classes", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                    Text(
                        "${dashboard.day.lowercase().replaceFirstChar(Char::uppercase)} · ${dashboard.date}",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                if (loading) CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp)
            }
        }
        if (dashboard.periods.isEmpty()) {
            item { EmptySchedule() }
        } else {
            items(dashboard.periods, key = { it.timetableId }) { period ->
                PeriodCard(period, onOpenAttendance)
            }
        }
        item {
            Column(Modifier.padding(top = 6.dp)) {
                Text("Upcoming classes", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                dashboard.upcoming?.let { upcoming ->
                    Text(
                        "${upcoming.day.lowercase().replaceFirstChar(Char::uppercase)} · ${upcoming.date}",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
        dashboard.upcoming?.let { upcoming ->
            items(upcoming.periods, key = { "upcoming-${it.timetableId}" }) { period ->
                UpcomingPeriodCard(period)
            }
        } ?: item {
            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                Text(
                    "No upcoming classes are assigned to your timetable.",
                    modifier = Modifier.fillMaxWidth().padding(20.dp),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
        item { Spacer(Modifier.height(12.dp)) }
    }
}

@Composable
private fun DailyAttendanceCard(
    target: DailyAttendanceTarget,
    onOpenAttendance: (DailyAttendanceTarget) -> Unit,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
    ) {
        Column(Modifier.fillMaxWidth().padding(18.dp)) {
            Text(
                "${target.className} · Section ${target.sectionName}",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
            )
            Spacer(Modifier.height(12.dp))
            if (target.attendanceLocked) {
                Text("Attendance locked", color = MaterialTheme.colorScheme.secondary, fontWeight = FontWeight.SemiBold)
            } else {
                Button(onClick = { onOpenAttendance(target) }, modifier = Modifier.fillMaxWidth()) {
                    Icon(Icons.Default.Groups, contentDescription = null, modifier = Modifier.size(19.dp))
                    Spacer(Modifier.width(8.dp))
                    Text(if (target.attendanceCount > 0) "Edit daily attendance" else "Take daily attendance")
                }
            }
        }
    }
}

@Composable
private fun UpcomingPeriodCard(period: TeachingPeriod) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(18.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(Modifier.weight(1f)) {
                Text(period.subjectName, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Text(
                    "${period.className} · Section ${period.sectionName}",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(5.dp))
                Text(
                    "${period.startTime} – ${period.endTime}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Text(period.periodName, color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.labelLarge)
        }
    }
}

@Composable
private fun SummaryLabel(icon: androidx.compose.ui.graphics.vector.ImageVector, value: String, label: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.onPrimary, modifier = Modifier.size(22.dp))
        Column(Modifier.padding(start = 9.dp)) {
            Text(value, color = MaterialTheme.colorScheme.onPrimary, fontWeight = FontWeight.Bold)
            Text(label, color = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.75f), fontSize = 12.sp)
        }
    }
}

@Composable
private fun PeriodCard(period: TeachingPeriod, onOpenAttendance: (TeachingPeriod) -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
    ) {
        Column(Modifier.padding(18.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Column(Modifier.weight(1f)) {
                    Text(period.subjectName, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Text(
                        "${period.className} · Section ${period.sectionName}",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Text(
                    period.periodName,
                    color = MaterialTheme.colorScheme.primary,
                    style = MaterialTheme.typography.labelLarge,
                )
            }
            Spacer(Modifier.height(10.dp))
            Text(
                "${period.startTime} – ${period.endTime}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(14.dp))
            if (period.attendanceLocked) {
                Text("Attendance locked", color = MaterialTheme.colorScheme.secondary, fontWeight = FontWeight.SemiBold)
            } else {
                Button(onClick = { onOpenAttendance(period) }, modifier = Modifier.fillMaxWidth()) {
                    Icon(Icons.Default.Groups, contentDescription = null, modifier = Modifier.size(19.dp))
                    Spacer(Modifier.width(8.dp))
                    Text(if (period.attendanceCount > 0) "Edit attendance" else "Take attendance")
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AttendanceScreen(
    sheet: AttendanceSheet,
    saving: Boolean,
    onStatusChange: (String, AttendanceStatus) -> Unit,
    onSave: () -> Unit,
    onBack: () -> Unit,
    snackbar: SnackbarHostState,
) {
    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        snackbarHost = { SnackbarHost(snackbar) },
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(sheet.title, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text(
                            sheet.subtitle,
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack, enabled = !saving) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
            )
        },
        bottomBar = {
            Box(Modifier.fillMaxWidth().background(MaterialTheme.colorScheme.surface).padding(16.dp)) {
                Button(
                    onClick = onSave,
                    enabled = !saving && sheet.students.isNotEmpty(),
                    modifier = Modifier.fillMaxWidth().height(50.dp),
                ) {
                    if (saving) {
                        CircularProgressIndicator(
                            Modifier.size(20.dp),
                            color = MaterialTheme.colorScheme.onPrimary,
                            strokeWidth = 2.dp,
                        )
                    } else {
                        Text("Save attendance", fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        },
    ) { padding ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(padding),
            contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            item { AttendanceSummary(sheet.students) }
            items(sheet.students, key = { it.studentId }) { student ->
                StudentAttendanceCard(student, onStatusChange)
            }
        }
    }
}

@Composable
private fun AttendanceSummary(students: List<StudentAttendance>) {
    val present = students.count { it.status == AttendanceStatus.PRESENT }
    val absent = students.count { it.status == AttendanceStatus.ABSENT }
    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            horizontalArrangement = Arrangement.SpaceAround,
        ) {
            CountLabel(students.size, "Students")
            CountLabel(present, "Present")
            CountLabel(absent, "Absent")
        }
    }
}

@Composable
private fun CountLabel(count: Int, label: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text("$count", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        Text(label, style = MaterialTheme.typography.labelMedium)
    }
}

@Composable
private fun StudentAttendanceCard(
    student: StudentAttendance,
    onStatusChange: (String, AttendanceStatus) -> Unit,
) {
    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
        Column(Modifier.fillMaxWidth().padding(15.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier.size(38.dp).background(MaterialTheme.colorScheme.primaryContainer, CircleShape),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        if (student.rollNo > 0) student.rollNo.toString() else student.fullName.take(1),
                        color = MaterialTheme.colorScheme.onPrimaryContainer,
                        fontWeight = FontWeight.Bold,
                    )
                }
                Column(Modifier.padding(start = 12.dp).weight(1f)) {
                    Text(student.fullName, fontWeight = FontWeight.SemiBold)
                    Text(
                        student.admissionNo,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        style = MaterialTheme.typography.bodySmall,
                    )
                }
            }
            HorizontalDivider(Modifier.padding(vertical = 10.dp))
            Row(
                modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                AttendanceStatus.entries.forEach { status ->
                    FilterChip(
                        selected = student.status == status,
                        onClick = { onStatusChange(student.studentId, status) },
                        label = { Text(status.label) },
                    )
                }
            }
        }
    }
}

private val AttendanceStatus.label: String
    get() = when (this) {
        AttendanceStatus.PRESENT -> "Present"
        AttendanceStatus.ABSENT -> "Absent"
        AttendanceStatus.LATE -> "Late"
        AttendanceStatus.LEAVE -> "Leave"
    }

@Composable
private fun EmptySchedule() {
    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(28.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Icon(Icons.Default.School, contentDescription = null, modifier = Modifier.size(42.dp), tint = MaterialTheme.colorScheme.primary)
            Spacer(Modifier.height(12.dp))
            Text("No classes today", fontWeight = FontWeight.Bold)
            Text("Your assigned timetable periods will appear here.", color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun LoadingPage(modifier: Modifier = Modifier) {
    Box(modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
}

@Composable
private fun ErrorPage(message: String, onRetry: () -> Unit, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text("Couldn’t load your dashboard", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(8.dp))
        Text(message, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.height(18.dp))
        Button(onClick = onRetry) { Text("Try again") }
    }
}
