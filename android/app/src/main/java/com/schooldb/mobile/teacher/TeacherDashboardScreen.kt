package com.schooldb.mobile.teacher

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
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
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.School
import androidx.compose.material.icons.outlined.GridView
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Schedule
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material.icons.outlined.School
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.Button
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
import androidx.compose.material3.NavigationBarItemDefaults
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
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.compose.material.icons.automirrored.outlined.Assignment
import androidx.compose.material.icons.automirrored.outlined.FactCheck
import com.schooldb.mobile.preferences.AppPreferences
import com.schooldb.mobile.preferences.StartTabPreference
import com.schooldb.mobile.family.FamilyDashboardScreen


private val SchoolDbIndigo = Color(0xFF4F46E5)
private val SchoolDbIndigoSoft = Color(0xFFEEF2FF)
private val SchoolDbSlate900 = Color(0xFF0F172A)
private val SchoolDbSlate800 = Color(0xFF1E293B)
private val SchoolDbSlate500 = Color(0xFF64748B)
private val SchoolDbSlate400 = Color(0xFF94A3B8)
private val SchoolDbSlate300 = Color(0xFFCBD5E1)
private val SchoolDbSlate200 = Color(0xFFE2E8F0)
private val SchoolDbSlate100 = Color(0xFFF1F5F9)
private val SchoolDbBackground = Color(0xFFF8FAFC)
private val SchoolDbDanger = Color(0xFFDC2626)
private val SchoolDbDangerBadge = Color(0xFFEF4444)

private enum class TeacherTab {
    HOME,
    ATTENDANCE,
    HOMEWORK,
    NOTICES,
    MORE,
}

@Composable
fun TeacherDashboardScreen(
    refreshKey: Int = 0,
    onSwitchAccount: (() -> Unit)? = null,
    openNotificationId: String? = null,
    onNotificationOpened: () -> Unit = {},
    viewModel: TeacherViewModel = viewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbar = remember { SnackbarHostState() }

    LaunchedEffect(state.message) {
        state.message?.let {
            snackbar.showSnackbar(it)
            viewModel.clearMessage()
        }
    }

    LaunchedEffect(refreshKey) {
        if (refreshKey > 0) viewModel.refresh()
    }

    if (state.context?.role in setOf("PARENT", "STUDENT")) {
        FamilyDashboardScreen(
            refreshKey = refreshKey,
            onSwitchAccount = onSwitchAccount ?: viewModel::signOut,
            openNotificationId = openNotificationId,
            onNotificationOpened = onNotificationOpened,
        )
        return
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

    if (
        state.context?.role == "TEACHER" &&
        state.dashboard != null
    ) {
        TeacherShell(
            state = state,
            snackbar = snackbar,
            teacherViewModel = viewModel,
            onSwitchAccount = onSwitchAccount ?: viewModel::signOut,
            openNotificationId = openNotificationId,
            onNotificationOpened = onNotificationOpened,
        )
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

@Composable
private fun TeacherShell(
    state: TeacherUiState,
    snackbar: SnackbarHostState,
    teacherViewModel: TeacherViewModel,
    onSwitchAccount: () -> Unit,
    openNotificationId: String?,
    onNotificationOpened: () -> Unit,
    noticeViewModel: NoticeViewModel = viewModel(),
) {
    val dashboard = state.dashboard ?: return
    val preferences by AppPreferences.state.collectAsStateWithLifecycle()
    var tab by rememberSaveable {
        mutableStateOf(
            if (preferences.startTab == StartTabPreference.ATTENDANCE) {
                TeacherTab.ATTENDANCE
            } else {
                TeacherTab.HOME
            },
        )
    }

    var moreScreen by rememberSaveable {
        mutableStateOf("MENU")
    }

    val noticeState by noticeViewModel.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(openNotificationId) {
        if (!openNotificationId.isNullOrBlank()) {
            tab = TeacherTab.NOTICES
            noticeViewModel.refresh()
            onNotificationOpened()
        }
    }

    Scaffold(
        containerColor = SchoolDbBackground,
        bottomBar = {
            SchoolDbBottomBar(
                selectedTab = tab,
                unreadNotices = if (preferences.showNoticeBadges) noticeState.unreadCount else 0,
                onTabSelected = {
                    tab = it
                    moreScreen = "MENU"
                },
            )
        },
    ) { padding ->

        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            when (tab) {
                TeacherTab.HOME -> {
                    TeacherHome(
                        state = state,
                        snackbar = snackbar,
                        onRefresh = teacherViewModel::refresh,
                        onOpenAttendance = teacherViewModel::openAttendance,
                        onOpenDailyAttendance = teacherViewModel::openDailyAttendance,
                        onSignOut = teacherViewModel::signOut,
                    )
                }

                TeacherTab.ATTENDANCE -> {
                    AttendanceHub(
                        dashboard = dashboard,
                        loading = state.loading,
                        onRefresh = teacherViewModel::refresh,
                        onOpenAttendance = teacherViewModel::openAttendance,
                        onOpenDailyAttendance = teacherViewModel::openDailyAttendance,
                    )
                }

                TeacherTab.HOMEWORK -> {
                    HomeworkScreen(
                        onBack = {
                            tab = TeacherTab.HOME
                        },
                    )
                }

                TeacherTab.NOTICES -> {
                    NoticeScreen(
                        noticeState,
                        noticeViewModel,
                    )
                }

                TeacherTab.MORE -> {
                    when (moreScreen) {
                        "TIMETABLE" -> {
                            TeacherTimetableScreen(
                                dashboard = dashboard,
                                onBack = { moreScreen = "MENU" },
                            )
                        }

                        "STUDENTS" -> {
                            TeacherStudentsScreen(
                                dashboard = dashboard,
                                onBack = { moreScreen = "MENU" },
                            )
                        }

                        "RESULTS" -> {
                            ResultsScreen(
                                onBack = { moreScreen = "MENU" },
                            )
                        }

                        "PROFILE" -> {
                            ProfileScreen(
                                onBack = { moreScreen = "MENU" },
                            )
                        }

                        "SETTINGS" -> {
                            SettingsScreen(
                                onBack = { moreScreen = "MENU" },
                                onSignOut = teacherViewModel::signOut,
                            )
                        }

                        else -> {
                            TeacherMoreScreen(
                                onOpenTimetable = { moreScreen = "TIMETABLE" },
                                onOpenStudents = { moreScreen = "STUDENTS" },
                                onOpenResults = { moreScreen = "RESULTS" },
                                onOpenProfile = { moreScreen = "PROFILE" },
                                onOpenSettings = { moreScreen = "SETTINGS" },
                                onSignOut = onSwitchAccount,
                            )
                        }
                    }
                }
            }
        }
    }
}

/* ==========================================================================
   PREMIUM BOTTOM NAVIGATION
   ========================================================================== */

@Composable
private fun SchoolDbBottomBar(
    selectedTab: TeacherTab,
    unreadNotices: Int,
    onTabSelected: (TeacherTab) -> Unit,
) {
    val navigationColors = NavigationBarItemDefaults.colors(
        selectedIconColor = SchoolDbIndigo,
        selectedTextColor = SchoolDbIndigo,
        indicatorColor = SchoolDbIndigoSoft,
        unselectedIconColor = SchoolDbSlate400,
        unselectedTextColor = SchoolDbSlate500,
    )

    NavigationBar(
        containerColor = Color.White,
        tonalElevation = 0.dp,
        modifier = Modifier.shadow(
            elevation = 8.dp,
            ambientColor = Color(0x120F172A),
            spotColor = Color(0x120F172A),
        ),
    ) {

        NavigationBarItem(
            selected = selectedTab == TeacherTab.HOME,
            onClick = {
                onTabSelected(TeacherTab.HOME)
            },
            icon = {
                Icon(
                    imageVector = Icons.Outlined.Home,
                    contentDescription = "Home",
                    modifier = Modifier.size(23.dp),
                )
            },
            label = {
                Text(
                    text = "Home",
                    fontSize = 11.sp,
                    fontWeight =
                        if (selectedTab == TeacherTab.HOME) {
                            FontWeight.SemiBold
                        } else {
                            FontWeight.Medium
                        },
                )
            },
            colors = navigationColors,
        )

        NavigationBarItem(
            selected = selectedTab == TeacherTab.ATTENDANCE,
            onClick = {
                onTabSelected(TeacherTab.ATTENDANCE)
            },
            icon = {
                Icon(
                    imageVector = Icons.AutoMirrored.Outlined.FactCheck,
                    contentDescription = "Attendance",
                    modifier = Modifier.size(23.dp),
                )
            },
            label = {
                Text(
                    text = "Attendance",
                    fontSize = 11.sp,
                    fontWeight =
                        if (selectedTab == TeacherTab.ATTENDANCE) {
                            FontWeight.SemiBold
                        } else {
                            FontWeight.Medium
                        },
                )
            },
            colors = navigationColors,
        )

        NavigationBarItem(
            selected = selectedTab == TeacherTab.HOMEWORK,
            onClick = {
                onTabSelected(TeacherTab.HOMEWORK)
            },
            icon = {
                Icon(
                    imageVector = Icons.AutoMirrored.Outlined.Assignment,
                    contentDescription = "Homework",
                    modifier = Modifier.size(23.dp),
                )
            },
            label = {
                Text(
                    text = "Homework",
                    fontSize = 11.sp,
                    fontWeight =
                        if (selectedTab == TeacherTab.HOMEWORK) {
                            FontWeight.SemiBold
                        } else {
                            FontWeight.Medium
                        },
                )
            },
            colors = navigationColors,
        )

        NavigationBarItem(
            selected = selectedTab == TeacherTab.NOTICES,
            onClick = {
                onTabSelected(TeacherTab.NOTICES)
            },
            icon = {
                BadgedBox(
                    badge = {
                        if (unreadNotices > 0) {
                            Badge(
                                containerColor = SchoolDbDangerBadge,
                                contentColor = Color.White,
                            ) {
                                Text(
                                    text = unreadNotices
                                        .coerceAtMost(99)
                                        .toString(),
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Bold,
                                )
                            }
                        }
                    },
                ) {
                    Icon(
                        imageVector = Icons.Outlined.Notifications,
                        contentDescription = "Notices",
                        modifier = Modifier.size(23.dp),
                    )
                }
            },
            label = {
                Text(
                    text = "Notices",
                    fontSize = 11.sp,
                    fontWeight =
                        if (selectedTab == TeacherTab.NOTICES) {
                            FontWeight.SemiBold
                        } else {
                            FontWeight.Medium
                        },
                )
            },
            colors = navigationColors,
        )

        NavigationBarItem(
            selected = selectedTab == TeacherTab.MORE,
            onClick = {
                onTabSelected(TeacherTab.MORE)
            },
            icon = {
                Icon(
                    imageVector = Icons.Outlined.GridView,
                    contentDescription = "More",
                    modifier = Modifier.size(23.dp),
                )
            },
            label = {
                Text(
                    text = "More",
                    fontSize = 11.sp,
                    fontWeight =
                        if (selectedTab == TeacherTab.MORE) {
                            FontWeight.SemiBold
                        } else {
                            FontWeight.Medium
                        },
                )
            },
            colors = navigationColors,
        )
    }
}


/* ==========================================================================
   MORE
   ========================================================================== */

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TeacherMoreScreen(
    onOpenTimetable: () -> Unit,
    onOpenStudents: () -> Unit,
    onOpenResults: () -> Unit,
    onOpenProfile: () -> Unit,
    onOpenSettings: () -> Unit,
    onSignOut: () -> Unit,
) {
    Scaffold(
        containerColor = SchoolDbBackground,
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = "More",
                            fontWeight = FontWeight.Bold,
                            color = SchoolDbSlate900,
                        )

                        Text(
                            text = "Teaching tools & account",
                            style = MaterialTheme.typography.labelMedium,
                            color = SchoolDbSlate400,
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = SchoolDbBackground,
                ),
            )
        },
    ) { padding ->

        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentPadding = PaddingValues(
                horizontal = 18.dp,
                vertical = 12.dp,
            ),
            verticalArrangement = Arrangement.spacedBy(18.dp),
        ) {

            item {
                MoreSectionTitle("TEACHING")
            }

            item {
                MoreMenuCard {
                    MoreMenuItem(
                        icon = Icons.Outlined.Schedule,
                        title = "My Timetable",
                        subtitle = "View your teaching schedule",
                        onClick = onOpenTimetable,
                    )

                    SchoolDbMenuDivider()

                    MoreMenuItem(
                        icon = Icons.Outlined.School,
                        title = "My Students",
                        subtitle = "Students from your classes",
                        onClick = onOpenStudents,
                    )

                    SchoolDbMenuDivider()

                    MoreMenuItem(
                        icon = Icons.AutoMirrored.Outlined.FactCheck,
                        title = "Results & Marks",
                        subtitle = "Enter and review student marks",
                        onClick = onOpenResults,
                    )
                }
            }

            item {
                MoreSectionTitle("ACCOUNT")
            }

            item {
                MoreMenuCard {
                    MoreMenuItem(
                        icon = Icons.Outlined.Person,
                        title = "My Profile",
                        subtitle = "Personal and teacher information",
                        onClick = onOpenProfile,
                    )

                    SchoolDbMenuDivider()

                    MoreMenuItem(
                        icon = Icons.Outlined.Settings,
                        title = "Settings",
                        subtitle = "App preferences",
                        onClick = onOpenSettings,
                    )
                }
            }

            item {
                TextButton(
                    onClick = onSignOut,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.Logout,
                        contentDescription = null,
                        tint = SchoolDbDanger,
                    )

                    Spacer(
                        modifier = Modifier.width(10.dp),
                    )

                    Text(
                        text = "Switch account or role",
                        color = SchoolDbDanger,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
            }

            item {
                Spacer(
                    modifier = Modifier.height(8.dp),
                )
            }
        }
    }
}

@Composable
private fun TeacherTimetableScreen(
    dashboard: TeacherDashboard,
    onBack: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(SchoolDbBackground)
            .padding(18.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(
                onClick = onBack,
            ) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = "Back",
                    tint = SchoolDbSlate900,
                )
            }

            Column {
                Text(
                    text = "My Timetable",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = SchoolDbSlate900,
                )

                Text(
                    text = dashboard.schoolName,
                    style = MaterialTheme.typography.bodySmall,
                    color = SchoolDbSlate500,
                )
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        Text(
            text = "TODAY",
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            color = SchoolDbIndigo,
            letterSpacing = 1.sp,
        )

        Spacer(modifier = Modifier.height(4.dp))

        Text(
            text = "${dashboard.day} · ${dashboard.date}",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
            color = SchoolDbSlate900,
        )

        Spacer(modifier = Modifier.height(14.dp))

        if (dashboard.periods.isEmpty()) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(
                    containerColor = Color.White,
                ),
            ) {
                Text(
                    text = "No classes assigned for today.",
                    modifier = Modifier.padding(20.dp),
                    color = SchoolDbSlate500,
                )
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                items(
                    items = dashboard.periods,
                    key = { it.timetableId },
                ) { period ->

                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(18.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = Color.White,
                        ),
                        border = BorderStroke(
                            width = 1.dp,
                            color = SchoolDbSlate200,
                        ),
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(44.dp)
                                    .background(
                                        SchoolDbIndigoSoft,
                                        RoundedCornerShape(12.dp),
                                    ),
                                contentAlignment = Alignment.Center,
                            ) {
                                Icon(
                                    imageVector = Icons.Outlined.Schedule,
                                    contentDescription = null,
                                    tint = SchoolDbIndigo,
                                )
                            }

                            Column(
                                modifier = Modifier
                                    .weight(1f)
                                    .padding(start = 14.dp),
                            ) {
                                Text(
                                    text = period.subjectName,
                                    fontWeight = FontWeight.SemiBold,
                                    color = SchoolDbSlate900,
                                )

                                Spacer(modifier = Modifier.height(3.dp))

                                Text(
                                    text = "${period.className} · ${period.sectionName}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = SchoolDbSlate500,
                                )

                                Spacer(modifier = Modifier.height(3.dp))

                                Text(
                                    text = "${period.startTime} - ${period.endTime}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = SchoolDbSlate500,
                                )
                            }

                            Text(
                                text = period.periodName,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = SchoolDbIndigo,
                                modifier = Modifier
                                    .background(
                                        SchoolDbIndigoSoft,
                                        RoundedCornerShape(8.dp),
                                    )
                                    .padding(
                                        horizontal = 8.dp,
                                        vertical = 5.dp,
                                    ),
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun MoreSectionTitle(
    title: String,
) {
    Text(
        text = title,
        fontSize = 10.sp,
        fontWeight = FontWeight.Bold,
        letterSpacing = 1.6.sp,
        color = SchoolDbSlate400,
        modifier = Modifier.padding(
            horizontal = 4.dp,
        ),
    )
}

@Composable
private fun MoreMenuCard(
    content: @Composable ColumnScope.() -> Unit,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(
            containerColor = Color.White,
        ),
        border = BorderStroke(
            width = 1.dp,
            color = SchoolDbSlate200,
        ),
        elevation = CardDefaults.cardElevation(
            defaultElevation = 1.dp,
        ),
    ) {
        Column(
            content = content,
        )
    }
}

@Composable
private fun MoreMenuItem(
    icon: ImageVector,
    title: String,
    subtitle: String,
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(
                onClick = onClick,
            )
            .padding(
                horizontal = 16.dp,
                vertical = 15.dp,
            ),
        verticalAlignment = Alignment.CenterVertically,
    ) {

        Box(
            modifier = Modifier
                .size(42.dp)
                .background(
                    color = SchoolDbIndigoSoft,
                    shape = RoundedCornerShape(12.dp),
                ),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = SchoolDbIndigo,
                modifier = Modifier.size(20.dp),
            )
        }

        Column(
            modifier = Modifier
                .weight(1f)
                .padding(
                    start = 14.dp,
                ),
        ) {
            Text(
                text = title,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                color = SchoolDbSlate800,
            )

            Spacer(
                modifier = Modifier.height(2.dp),
            )

            Text(
                text = subtitle,
                fontSize = 12.sp,
                color = SchoolDbSlate400,
            )
        }

        Text(
            text = "›",
            fontSize = 24.sp,
            color = SchoolDbSlate300,
        )
    }
}

@Composable
private fun SchoolDbMenuDivider() {
    HorizontalDivider(
        color = SchoolDbSlate100,
    )
}

/* ==========================================================================
   ATTENDANCE HUB
   ========================================================================== */

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
                        Text(
                            text = "Attendance",
                            fontWeight = FontWeight.Bold,
                        )

                        Text(
                            text =
                                "${dashboard.day.lowercase().replaceFirstChar(Char::uppercase)} · ${dashboard.date}",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                },
                actions = {
                    IconButton(
                        onClick = onRefresh,
                        enabled = !loading,
                    ) {
                        Icon(
                            imageVector = Icons.Default.Refresh,
                            contentDescription = "Refresh",
                        )
                    }
                },
            )
        },
    ) { padding ->

        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentPadding = PaddingValues(18.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            when (dashboard.attendanceMode) {

                "ONCE_DAILY" -> {
                    item {
                        Text(
                            text = "Daily attendance",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                        )
                    }

                    if (dashboard.dailyTargets.isEmpty()) {
                        item {
                            AttendanceInfoCard(
                                "No class or section is assigned to your teacher account.",
                            )
                        }
                    } else {
                        items(
                            items = dashboard.dailyTargets,
                            key = {
                                "attendance-${it.classId}-${it.sectionId}"
                            },
                        ) { target ->
                            DailyAttendanceCard(
                                target = target,
                                onOpenAttendance = onOpenDailyAttendance,
                            )
                        }
                    }
                }

                "EVERY_PERIOD" -> {
                    item {
                        Text(
                            text = "Period attendance",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                        )
                    }

                    if (dashboard.periods.isEmpty()) {
                        item {
                            AttendanceInfoCard(
                                "There are no timetable periods assigned today.",
                            )
                        }
                    } else {
                        items(
                            items = dashboard.periods,
                            key = {
                                "attendance-${it.timetableId}"
                            },
                        ) { period ->
                            PeriodCard(
                                period = period,
                                onOpenAttendance = onOpenAttendance,
                            )
                        }
                    }
                }

                "MORNING_AFTERNOON" -> {
                    item {
                        AttendanceInfoCard(
                            "Morning and afternoon attendance will appear here when sessions are assigned.",
                        )
                    }
                }

                else -> {
                    item {
                        AttendanceInfoCard(
                            "No active attendance mode is configured.",
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun AttendanceInfoCard(
    message: String,
) {
    Card(
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface,
        ),
    ) {
        Text(
            text = message,
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp),
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

/* ==========================================================================
   TEACHER HOME
   ========================================================================== */

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
        snackbarHost = {
            SnackbarHost(
                hostState = snackbar,
            )
        },
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = "SchoolDB",
                            fontWeight = FontWeight.Bold,
                        )

                        state.dashboard?.let {
                            Text(
                                text = it.schoolName,
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }

                        if (state.dashboard == null) {
                            state.context?.let {
                                Text(
                                    text = it.schoolName,
                                    style = MaterialTheme.typography.labelMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                    }
                },
                actions = {
                    IconButton(
                        onClick = onRefresh,
                        enabled = !state.loading,
                    ) {
                        Icon(
                            imageVector = Icons.Default.Refresh,
                            contentDescription = "Refresh",
                        )
                    }

                    IconButton(
                        onClick = onSignOut,
                    ) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.Logout,
                            contentDescription = "Sign out",
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                ),
            )
        },
    ) { padding ->

        when {
            state.loading && state.context == null -> {
                LoadingPage(
                    modifier = Modifier.padding(padding),
                )
            }

            state.error != null -> {
                ErrorPage(
                    message = state.error,
                    onRetry = onRefresh,
                    modifier = Modifier.padding(padding),
                )
            }

            state.context != null &&
                state.context.role != "TEACHER" -> {
                RoleHome(
                    context = state.context,
                    modifier = Modifier.padding(padding),
                )
            }

            state.dashboard == null -> {
                ErrorPage(
                    message = "Your teacher profile could not be loaded.",
                    onRetry = onRefresh,
                    modifier = Modifier.padding(padding),
                )
            }

            else -> {
                DashboardContent(
                    dashboard = state.dashboard,
                    loading = state.loading,
                    onOpenAttendance = onOpenAttendance,
                    onOpenDailyAttendance = onOpenDailyAttendance,
                    modifier = Modifier.padding(padding),
                )
            }
        }
    }
}

/* ==========================================================================
   NON-TEACHER PLACEHOLDER
   ========================================================================== */

@Composable
private fun RoleHome(
    context: MobileContext,
    modifier: Modifier = Modifier,
) {
    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(18.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {

        item {
            Card(
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                ),
                shape = RoundedCornerShape(22.dp),
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(22.dp),
                ) {
                    Text(
                        text = "Welcome back,",
                        color = MaterialTheme.colorScheme.onPrimary.copy(
                            alpha = 0.8f,
                        ),
                    )

                    Text(
                        text = context.userName,
                        color = MaterialTheme.colorScheme.onPrimary,
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                    )

                    Spacer(
                        modifier = Modifier.height(12.dp),
                    )

                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(
                            imageVector = Icons.Default.Person,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.onPrimary,
                        )

                        Spacer(
                            modifier = Modifier.width(8.dp),
                        )

                        Text(
                            text = context.role.displayRole,
                            color = MaterialTheme.colorScheme.onPrimary,
                        )
                    }
                }
            }
        }

        item {
            Card(
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                ),
                shape = RoundedCornerShape(18.dp),
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(20.dp),
                ) {
                    Text(
                        text = "Mobile access is ready",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                    )

                    Spacer(
                        modifier = Modifier.height(8.dp),
                    )

                    Text(
                        text =
                            "This first mobile workspace is built for teachers to view classes and record attendance.",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )

                    Spacer(
                        modifier = Modifier.height(12.dp),
                    )

                    Text(
                        text =
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
    get() =
        lowercase()
            .split("_")
            .joinToString(" ") { word ->
                word.replaceFirstChar(Char::uppercase)
            }

/* ==========================================================================
   DASHBOARD
   ========================================================================== */

@Composable
private fun DashboardContent(
    dashboard: TeacherDashboard,
    loading: Boolean,
    onOpenAttendance: (TeachingPeriod) -> Unit,
    onOpenDailyAttendance: (DailyAttendanceTarget) -> Unit,
    modifier: Modifier = Modifier,
) {
    val dailyMode =
        dashboard.attendanceMode == "ONCE_DAILY"

    val itemCount =
        if (dailyMode) {
            dashboard.dailyTargets.size
        } else {
            dashboard.periods.size
        }

    val completed =
        if (dailyMode) {
            dashboard.dailyTargets.count {
                it.attendanceCount > 0 ||
                    it.attendanceLocked
            }
        } else {
            dashboard.periods.count {
                it.attendanceCount > 0 ||
                    it.attendanceLocked
            }
        }

    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(18.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {

        item {
            Card(
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                ),
                shape = RoundedCornerShape(22.dp),
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(22.dp),
                ) {
                    Text(
                        text = "Good day,",
                        color = MaterialTheme.colorScheme.onPrimary.copy(
                            alpha = 0.8f,
                        ),
                    )

                    Text(
                        text = dashboard.teacherName,
                        color = MaterialTheme.colorScheme.onPrimary,
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                    )

                    Spacer(
                        modifier = Modifier.height(14.dp),
                    )

                    Row(
                        horizontalArrangement = Arrangement.spacedBy(22.dp),
                    ) {
                        SummaryLabel(
                            icon = Icons.Default.Schedule,
                            value = "$itemCount",
                            label = "Classes",
                        )

                        SummaryLabel(
                            icon = Icons.Default.CheckCircle,
                            value = "$completed",
                            label = "Marked",
                        )
                    }
                }
            }
        }

        if (dailyMode) {
            item {
                Column(
                    modifier = Modifier.padding(
                        top = 2.dp,
                    ),
                ) {
                    Text(
                        text = "Daily attendance",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                    )

                    Text(
                        text = "Mark attendance once for the whole day",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }

            if (dashboard.dailyTargets.isEmpty()) {
                item {
                    AttendanceInfoCard(
                        "No class or section is assigned to your teacher account.",
                    )
                }
            } else {
                items(
                    items = dashboard.dailyTargets,
                    key = {
                        "daily-${it.classId}-${it.sectionId}"
                    },
                ) { target ->
                    DailyAttendanceCard(
                        target = target,
                        onOpenAttendance = onOpenDailyAttendance,
                    )
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
                    Text(
                        text = "Today’s classes",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                    )

                    Text(
                        text =
                            "${dashboard.day.lowercase().replaceFirstChar(Char::uppercase)} · ${dashboard.date}",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }

                if (loading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        strokeWidth = 2.dp,
                    )
                }
            }
        }

        if (dashboard.periods.isEmpty()) {
            item {
                EmptySchedule()
            }
        } else {
            items(
                items = dashboard.periods,
                key = {
                    it.timetableId
                },
            ) { period ->
                PeriodCard(
                    period = period,
                    onOpenAttendance = onOpenAttendance,
                )
            }
        }

        item {
            Column(
                modifier = Modifier.padding(
                    top = 6.dp,
                ),
            ) {
                Text(
                    text = "Upcoming classes",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                )

                dashboard.upcoming?.let { upcoming ->
                    Text(
                        text =
                            "${upcoming.day.lowercase().replaceFirstChar(Char::uppercase)} · ${upcoming.date}",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }

        dashboard.upcoming?.let { upcoming ->
            items(
                items = upcoming.periods,
                key = {
                    "upcoming-${it.timetableId}"
                },
            ) { period ->
                UpcomingPeriodCard(
                    period = period,
                )
            }
        } ?: item {
            Card(
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                ),
            ) {
                Text(
                    text =
                        "No upcoming classes are assigned to your timetable.",
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(20.dp),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }

        item {
            Spacer(
                modifier = Modifier.height(12.dp),
            )
        }
    }
}

/* ==========================================================================
   DAILY ATTENDANCE CARD
   ========================================================================== */

@Composable
private fun DailyAttendanceCard(
    target: DailyAttendanceTarget,
    onOpenAttendance: (DailyAttendanceTarget) -> Unit,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface,
        ),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(18.dp),
        ) {

            Text(
                text =
                    "${target.className} · Section ${target.sectionName}",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
            )

            Spacer(
                modifier = Modifier.height(12.dp),
            )

            if (target.attendanceLocked) {
                Text(
                    text = "Attendance locked",
                    color = MaterialTheme.colorScheme.secondary,
                    fontWeight = FontWeight.SemiBold,
                )
            } else {
                Button(
                    onClick = {
                        onOpenAttendance(target)
                    },
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Icon(
                        imageVector = Icons.Default.Groups,
                        contentDescription = null,
                        modifier = Modifier.size(19.dp),
                    )

                    Spacer(
                        modifier = Modifier.width(8.dp),
                    )

                    Text(
                        text =
                            if (target.attendanceCount > 0) {
                                "Edit daily attendance"
                            } else {
                                "Take daily attendance"
                            },
                    )
                }
            }
        }
    }
}

/* ==========================================================================
   PERIOD CARDS
   ========================================================================== */

@Composable
private fun UpcomingPeriodCard(
    period: TeachingPeriod,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface,
        ),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(18.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {

            Column(
                modifier = Modifier.weight(1f),
            ) {
                Text(
                    text = period.subjectName,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                )

                Text(
                    text =
                        "${period.className} · Section ${period.sectionName}",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )

                Spacer(
                    modifier = Modifier.height(5.dp),
                )

                Text(
                    text =
                        "${period.startTime} – ${period.endTime}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            Text(
                text = period.periodName,
                color = MaterialTheme.colorScheme.primary,
                style = MaterialTheme.typography.labelLarge,
            )
        }
    }
}

@Composable
private fun SummaryLabel(
    icon: ImageVector,
    value: String,
    label: String,
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.onPrimary,
            modifier = Modifier.size(22.dp),
        )

        Column(
            modifier = Modifier.padding(
                start = 9.dp,
            ),
        ) {
            Text(
                text = value,
                color = MaterialTheme.colorScheme.onPrimary,
                fontWeight = FontWeight.Bold,
            )

            Text(
                text = label,
                color = MaterialTheme.colorScheme.onPrimary.copy(
                    alpha = 0.75f,
                ),
                fontSize = 12.sp,
            )
        }
    }
}

@Composable
private fun PeriodCard(
    period: TeachingPeriod,
    onOpenAttendance: (TeachingPeriod) -> Unit,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface,
        ),
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
        ) {

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {

                Column(
                    modifier = Modifier.weight(1f),
                ) {
                    Text(
                        text = period.subjectName,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                    )

                    Text(
                        text =
                            "${period.className} · Section ${period.sectionName}",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }

                Text(
                    text = period.periodName,
                    color = MaterialTheme.colorScheme.primary,
                    style = MaterialTheme.typography.labelLarge,
                )
            }

            Spacer(
                modifier = Modifier.height(10.dp),
            )

            Text(
                text =
                    "${period.startTime} – ${period.endTime}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )

            Spacer(
                modifier = Modifier.height(14.dp),
            )

            if (period.attendanceLocked) {
                Text(
                    text = "Attendance locked",
                    color = MaterialTheme.colorScheme.secondary,
                    fontWeight = FontWeight.SemiBold,
                )
            } else {
                Button(
                    onClick = {
                        onOpenAttendance(period)
                    },
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Icon(
                        imageVector = Icons.Default.Groups,
                        contentDescription = null,
                        modifier = Modifier.size(19.dp),
                    )

                    Spacer(
                        modifier = Modifier.width(8.dp),
                    )

                    Text(
                        text =
                            if (period.attendanceCount > 0) {
                                "Edit attendance"
                            } else {
                                "Take attendance"
                            },
                    )
                }
            }
        }
    }
}

/* ==========================================================================
   ATTENDANCE SCREEN
   ========================================================================== */

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
        snackbarHost = {
            SnackbarHost(
                hostState = snackbar,
            )
        },
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = sheet.title,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )

                        Text(
                            text = sheet.subtitle,
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                },
                navigationIcon = {
                    IconButton(
                        onClick = onBack,
                        enabled = !saving,
                    ) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back",
                        )
                    }
                },
            )
        },
        bottomBar = {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        MaterialTheme.colorScheme.surface,
                    )
                    .padding(16.dp),
            ) {
                Button(
                    onClick = onSave,
                    enabled =
                        !saving &&
                            sheet.students.isNotEmpty(),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp),
                ) {
                    if (saving) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            color = MaterialTheme.colorScheme.onPrimary,
                            strokeWidth = 2.dp,
                        )
                    } else {
                        Text(
                            text = "Save attendance",
                            fontWeight = FontWeight.SemiBold,
                        )
                    }
                }
            }
        },
    ) { padding ->

        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {

            item {
                AttendanceSummary(
                    students = sheet.students,
                )
            }

            items(
                items = sheet.students,
                key = {
                    it.studentId
                },
            ) { student ->
                StudentAttendanceCard(
                    student = student,
                    onStatusChange = onStatusChange,
                )
            }
        }
    }
}

/* ==========================================================================
   ATTENDANCE SUMMARY
   ========================================================================== */

@Composable
private fun AttendanceSummary(
    students: List<StudentAttendance>,
) {
    val present =
        students.count {
            it.status == AttendanceStatus.PRESENT
        }

    val absent =
        students.count {
            it.status == AttendanceStatus.ABSENT
        }

    Card(
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer,
        ),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceAround,
        ) {
            CountLabel(
                count = students.size,
                label = "Students",
            )

            CountLabel(
                count = present,
                label = "Present",
            )

            CountLabel(
                count = absent,
                label = "Absent",
            )
        }
    }
}

@Composable
private fun CountLabel(
    count: Int,
    label: String,
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = "$count",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
        )

        Text(
            text = label,
            style = MaterialTheme.typography.labelMedium,
        )
    }
}

/* ==========================================================================
   STUDENT ATTENDANCE CARD
   ========================================================================== */

@Composable
private fun StudentAttendanceCard(
    student: StudentAttendance,
    onStatusChange: (String, AttendanceStatus) -> Unit,
) {
    Card(
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface,
        ),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(15.dp),
        ) {

            Row(
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(
                    modifier = Modifier
                        .size(38.dp)
                        .background(
                            MaterialTheme.colorScheme.primaryContainer,
                            CircleShape,
                        ),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text =
                            if (student.rollNo > 0) {
                                student.rollNo.toString()
                            } else {
                                student.fullName.take(1)
                            },
                        color = MaterialTheme.colorScheme.onPrimaryContainer,
                        fontWeight = FontWeight.Bold,
                    )
                }

                Column(
                    modifier = Modifier
                        .padding(
                            start = 12.dp,
                        )
                        .weight(1f),
                ) {
                    Text(
                        text = student.fullName,
                        fontWeight = FontWeight.SemiBold,
                    )

                    Text(
                        text = student.admissionNo,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        style = MaterialTheme.typography.bodySmall,
                    )
                }
            }

            HorizontalDivider(
                modifier = Modifier.padding(
                    vertical = 10.dp,
                ),
            )

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(
                        rememberScrollState(),
                    ),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                AttendanceStatus.entries.forEach { status ->
                    FilterChip(
                        selected =
                            student.status == status,
                        onClick = {
                            onStatusChange(
                                student.studentId,
                                status,
                            )
                        },
                        label = {
                            Text(
                                text = status.label,
                            )
                        },
                    )
                }
            }
        }
    }
}

private val AttendanceStatus.label: String
    get() =
        when (this) {
            AttendanceStatus.PRESENT -> "Present"
            AttendanceStatus.ABSENT -> "Absent"
            AttendanceStatus.LATE -> "Late"
            AttendanceStatus.LEAVE -> "Leave"
        }

/* ==========================================================================
   EMPTY / LOADING / ERROR
   ========================================================================== */

@Composable
private fun EmptySchedule() {
    Card(
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface,
        ),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(28.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Icon(
                imageVector = Icons.Default.School,
                contentDescription = null,
                modifier = Modifier.size(42.dp),
                tint = MaterialTheme.colorScheme.primary,
            )

            Spacer(
                modifier = Modifier.height(12.dp),
            )

            Text(
                text = "No classes today",
                fontWeight = FontWeight.Bold,
            )

            Text(
                text =
                    "Your assigned timetable periods will appear here.",
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun LoadingPage(
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier.fillMaxSize(),
        contentAlignment = Alignment.Center,
    ) {
        CircularProgressIndicator()
    }
}

@Composable
private fun ErrorPage(
    message: String,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = "Couldn’t load your dashboard",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
        )

        Spacer(
            modifier = Modifier.height(8.dp),
        )

        Text(
            text = message,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        Spacer(
            modifier = Modifier.height(18.dp),
        )

        Button(
            onClick = onRetry,
        ) {
            Text(
                text = "Try again",
            )
        }
    }
}
