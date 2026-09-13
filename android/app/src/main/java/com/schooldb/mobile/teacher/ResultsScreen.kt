package com.schooldb.mobile.teacher

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.outlined.Assessment
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Groups
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel

private val ResultsIndigo = Color(0xFF4F46E5)
private val ResultsIndigoSoft = Color(0xFFEEF2FF)
private val ResultsBackground = Color(0xFFF8FAFC)
private val ResultsSlate900 = Color(0xFF0F172A)
private val ResultsSlate600 = Color(0xFF475569)
private val ResultsSlate500 = Color(0xFF64748B)
private val ResultsSlate200 = Color(0xFFE2E8F0)

@Composable
fun ResultsScreen(
    onBack: () -> Unit,
    viewModel: ResultsViewModel = viewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbar = remember { SnackbarHostState() }

    LaunchedEffect(state.message) {
        state.message?.let {
            snackbar.showSnackbar(it)
            viewModel.clearMessage()
        }
    }

    val sheet = state.sheet
    if (sheet == null) {
        ResultsScheduleList(
            state = state,
            snackbar = snackbar,
            onBack = onBack,
            onRefresh = viewModel::refresh,
            onOpen = viewModel::open,
        )
    } else {
        MarksEntryScreen(
            state = state,
            sheet = sheet,
            snackbar = snackbar,
            onBack = viewModel::closeSheet,
            onMarksChange = viewModel::setMarks,
            onStatusChange = viewModel::setStatus,
            onSave = viewModel::save,
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ResultsScheduleList(
    state: ResultsUiState,
    snackbar: SnackbarHostState,
    onBack: () -> Unit,
    onRefresh: () -> Unit,
    onOpen: (ResultSchedule) -> Unit,
) {
    Scaffold(
        containerColor = ResultsBackground,
        snackbarHost = { SnackbarHost(snackbar) },
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Results & Marks", fontWeight = FontWeight.Bold)
                        Text(
                            "Choose an exam schedule",
                            style = MaterialTheme.typography.labelMedium,
                            color = ResultsSlate500,
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = onRefresh, enabled = !state.loading) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = ResultsBackground),
            )
        },
    ) { padding ->
        when {
            state.loading && state.schedules.isEmpty() -> Box(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentAlignment = Alignment.Center,
            ) { CircularProgressIndicator() }

            state.error != null && state.schedules.isEmpty() -> ResultsError(
                message = state.error,
                modifier = Modifier.fillMaxSize().padding(padding),
                onRetry = onRefresh,
            )

            else -> LazyColumn(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentPadding = PaddingValues(start = 18.dp, end = 18.dp, top = 12.dp, bottom = 28.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                if (state.loading) {
                    item { CircularProgressIndicator(modifier = Modifier.size(24.dp)) }
                }
                if (state.error != null) {
                    item { ResultsInfoCard(state.error) }
                }
                if (state.schedules.isEmpty()) {
                    item {
                        ResultsInfoCard(
                            "No exam schedules are available for your assigned classes and subjects.",
                        )
                    }
                } else {
                    item {
                        Text(
                            "EXAM SCHEDULES",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 1.2.sp,
                            color = ResultsIndigo,
                        )
                    }
                    items(
                        items = state.schedules,
                        key = { "${it.id}:${it.sectionId}" },
                    ) { schedule ->
                        ScheduleCard(schedule = schedule, onClick = { onOpen(schedule) })
                    }
                }
            }
        }
    }
}

@Composable
private fun ScheduleCard(schedule: ResultSchedule, onClick: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        border = BorderStroke(1.dp, ResultsSlate200),
    ) {
        Column(Modifier.fillMaxWidth().padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier.size(42.dp).background(ResultsIndigoSoft, CircleShape),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(Icons.Outlined.Assessment, contentDescription = null, tint = ResultsIndigo)
                }
                Column(Modifier.weight(1f).padding(start = 12.dp)) {
                    Text(
                        schedule.examName,
                        fontWeight = FontWeight.Bold,
                        color = ResultsSlate900,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        schedule.subjectName,
                        fontSize = 13.sp,
                        color = ResultsSlate600,
                    )
                }
                Text(
                    if (schedule.editable) "ENTRY OPEN" else "VIEW ONLY",
                    fontSize = 9.sp,
                    fontWeight = FontWeight.Bold,
                    color = ResultsIndigo,
                    modifier = Modifier.background(ResultsIndigoSoft, RoundedCornerShape(8.dp))
                        .padding(horizontal = 7.dp, vertical = 4.dp),
                )
            }
            Spacer(Modifier.height(14.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                ResultMeta(Icons.Outlined.Groups, schedule.classLabel)
                ResultMeta(Icons.Outlined.CalendarMonth, schedule.examDate)
                Text(
                    "Max ${schedule.maxMarks.displayNumber()}",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = ResultsSlate600,
                )
            }
        }
    }
}

@Composable
private fun ResultMeta(icon: androidx.compose.ui.graphics.vector.ImageVector, text: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(icon, contentDescription = null, modifier = Modifier.size(15.dp), tint = ResultsSlate500)
        Spacer(Modifier.width(5.dp))
        Text(text, fontSize = 12.sp, color = ResultsSlate500)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun MarksEntryScreen(
    state: ResultsUiState,
    sheet: ResultSheet,
    snackbar: SnackbarHostState,
    onBack: () -> Unit,
    onMarksChange: (String, String) -> Unit,
    onStatusChange: (String, String) -> Unit,
    onSave: () -> Unit,
) {
    Scaffold(
        containerColor = ResultsBackground,
        snackbarHost = { SnackbarHost(snackbar) },
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(sheet.schedule.examName, fontWeight = FontWeight.Bold)
                        Text(
                            "${sheet.schedule.classLabel} · ${sheet.schedule.subjectName}",
                            style = MaterialTheme.typography.labelMedium,
                            color = ResultsSlate500,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack, enabled = !state.saving) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    if (sheet.schedule.editable) {
                        TextButton(onClick = onSave, enabled = !state.saving) {
                            Text(if (state.saving) "Saving…" else "Save", fontWeight = FontWeight.Bold)
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = ResultsBackground),
            )
        },
    ) { padding ->
        if (state.loading) {
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
            return@Scaffold
        }

        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(padding),
            contentPadding = PaddingValues(start = 18.dp, end = 18.dp, top = 10.dp, bottom = 28.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            item { MarksSummaryCard(sheet) }
            if (state.error != null) {
                item { ResultsInfoCard(state.error) }
            }
            if (sheet.students.isEmpty()) {
                item { ResultsInfoCard("There are no active students in this class and section.") }
            } else {
                items(sheet.students, key = { it.enrollmentId }) { student ->
                    MarkStudentCard(
                        student = student,
                        maxMarks = sheet.schedule.maxMarks,
                        editable = sheet.schedule.editable && !state.saving,
                        onMarksChange = { onMarksChange(student.enrollmentId, it) },
                        onStatusChange = { onStatusChange(student.enrollmentId, it) },
                    )
                }
                if (sheet.schedule.editable) {
                    item {
                        Button(
                            onClick = onSave,
                            enabled = !state.saving,
                            modifier = Modifier.fillMaxWidth().height(52.dp),
                        ) {
                            if (state.saving) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(20.dp),
                                    strokeWidth = 2.dp,
                                    color = Color.White,
                                )
                                Spacer(Modifier.width(8.dp))
                            }
                            Text(if (state.saving) "Saving marks…" else "Save all marks")
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun MarksSummaryCard(sheet: ResultSheet) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = ResultsIndigoSoft),
        border = BorderStroke(1.dp, ResultsIndigo.copy(alpha = 0.25f)),
        shape = RoundedCornerShape(16.dp),
    ) {
        Column(Modifier.fillMaxWidth().padding(15.dp)) {
            Text(
                "${sheet.students.size} students · Maximum ${sheet.schedule.maxMarks.displayNumber()}",
                fontWeight = FontWeight.Bold,
                color = ResultsSlate900,
            )
            Text(
                sheet.schedule.passMarks?.let { "Pass mark ${it.displayNumber()}" }
                    ?: "No pass mark configured",
                fontSize = 12.sp,
                color = ResultsSlate500,
            )
            if (!sheet.schedule.editable) {
                Spacer(Modifier.height(6.dp))
                Text("This exam is complete. Marks are view-only.", fontSize = 12.sp, color = ResultsIndigo)
            }
        }
    }
}

@Composable
private fun MarkStudentCard(
    student: ResultStudent,
    maxMarks: Double,
    editable: Boolean,
    onMarksChange: (String) -> Unit,
    onStatusChange: (String) -> Unit,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        border = BorderStroke(1.dp, ResultsSlate200),
        shape = RoundedCornerShape(17.dp),
    ) {
        Column(Modifier.fillMaxWidth().padding(14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier.size(40.dp).background(ResultsIndigoSoft, CircleShape),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        student.fullName.trim().firstOrNull()?.uppercase() ?: "S",
                        fontWeight = FontWeight.Bold,
                        color = ResultsIndigo,
                    )
                }
                Column(Modifier.weight(1f).padding(horizontal = 11.dp)) {
                    Text(
                        student.fullName,
                        fontWeight = FontWeight.SemiBold,
                        color = ResultsSlate900,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        "${student.rollNo?.let { "Roll $it · " }.orEmpty()}Adm. ${student.admissionNo}",
                        fontSize = 11.sp,
                        color = ResultsSlate500,
                    )
                }
                OutlinedTextField(
                    value = student.marks,
                    onValueChange = onMarksChange,
                    modifier = Modifier.width(94.dp),
                    enabled = editable && student.status == "PRESENT",
                    singleLine = true,
                    label = { Text("/${maxMarks.displayNumber()}") },
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Decimal,
                        imeAction = ImeAction.Next,
                    ),
                )
            }
            Spacer(Modifier.height(8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterChip(
                    selected = student.status == "PRESENT",
                    onClick = { onStatusChange("PRESENT") },
                    enabled = editable,
                    label = { Text("Present") },
                )
                FilterChip(
                    selected = student.status == "ABSENT",
                    onClick = { onStatusChange("ABSENT") },
                    enabled = editable,
                    label = { Text("Absent") },
                )
                FilterChip(
                    selected = student.status == "EXEMPTED",
                    onClick = { onStatusChange("EXEMPTED") },
                    enabled = editable,
                    label = { Text("Exempt") },
                )
            }
        }
    }
}

@Composable
private fun ResultsInfoCard(message: String) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        border = BorderStroke(1.dp, ResultsSlate200),
        shape = RoundedCornerShape(18.dp),
    ) {
        Text(message, modifier = Modifier.padding(22.dp), color = ResultsSlate600)
    }
}

@Composable
private fun ResultsError(message: String, modifier: Modifier, onRetry: () -> Unit) {
    Column(
        modifier = modifier.padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text("Couldn’t load results", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(8.dp))
        Text(message, color = ResultsSlate500)
        Spacer(Modifier.height(16.dp))
        Button(onClick = onRetry) { Text("Try again") }
    }
}
