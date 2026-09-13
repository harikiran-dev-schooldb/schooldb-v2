package com.schooldb.mobile.family

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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import java.text.NumberFormat
import java.time.OffsetDateTime
import java.time.format.DateTimeFormatter
import java.util.Locale

private val FamilyIndigo = Color(0xFF4F46E5)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FamilyDashboardScreen(
    onSwitchAccount: () -> Unit,
    refreshKey: Int = 0,
    viewModel: FamilyViewModel = viewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val dashboard = state.dashboard
    val selectedStudent = dashboard?.students?.firstOrNull { it.id == state.selectedStudentId }

    androidx.compose.runtime.LaunchedEffect(refreshKey) {
        if (refreshKey > 0) viewModel.refresh()
    }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            dashboard?.schoolName ?: "SchoolDB",
                            fontWeight = FontWeight.Bold,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                        Text(
                            if (dashboard?.role == "STUDENT") "Student space" else "Parent space",
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            fontSize = 12.sp,
                        )
                    }
                },
                actions = {
                    TextButton(onClick = onSwitchAccount) {
                        Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = null)
                        Spacer(Modifier.width(6.dp))
                        Text("Switch account")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                ),
            )
        },
    ) { padding ->
        when {
            state.loading && dashboard == null -> Box(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentAlignment = Alignment.Center,
            ) { CircularProgressIndicator() }

            state.error != null && dashboard == null -> FamilyError(
                message = state.error.orEmpty(),
                onRefresh = viewModel::refresh,
                modifier = Modifier.padding(padding),
            )

            selectedStudent != null -> LazyColumn(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentPadding = PaddingValues(bottom = 28.dp),
            ) {
                item {
                    Column(Modifier.padding(horizontal = 20.dp, vertical = 18.dp)) {
                        Text(
                            "Hello, ${dashboard.userName}",
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            fontSize = 14.sp,
                        )
                        Text(
                            if (dashboard.students.size > 1) "Choose a child" else "Student overview",
                            fontWeight = FontWeight.Bold,
                            fontSize = 24.sp,
                        )
                    }
                }

                if (dashboard.students.size > 1) {
                    item {
                        LazyRow(
                            contentPadding = PaddingValues(horizontal = 20.dp),
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                        ) {
                            items(dashboard.students, key = { it.id }) { student ->
                                StudentSelector(
                                    student = student,
                                    selected = student.id == selectedStudent.id,
                                    onClick = { viewModel.selectStudent(student.id) },
                                )
                            }
                        }
                        Spacer(Modifier.height(18.dp))
                    }
                }

                item {
                    StudentSummary(selectedStudent)
                    Text(
                        "Today at a glance",
                        modifier = Modifier.padding(start = 20.dp, end = 20.dp, top = 24.dp, bottom = 12.dp),
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp,
                    )
                    Metrics(selectedStudent)
                }

                item {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(start = 20.dp, end = 12.dp, top = 18.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text("Recent homework", modifier = Modifier.weight(1f), fontWeight = FontWeight.Bold, fontSize = 18.sp)
                        IconButton(onClick = viewModel::refresh) {
                            Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                        }
                    }
                }

                if (selectedStudent.recentHomework.isEmpty()) {
                    item {
                        Text(
                            "No active homework for this child.",
                            modifier = Modifier.padding(horizontal = 20.dp, vertical = 16.dp),
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                } else {
                    items(selectedStudent.recentHomework, key = { it.id }) { homework ->
                        HomeworkCard(homework)
                    }
                }
            }

            else -> FamilyError(
                message = "No active student is linked to this account.",
                onRefresh = viewModel::refresh,
                modifier = Modifier.padding(padding),
            )
        }
    }
}

@Composable
private fun StudentSelector(student: FamilyStudent, selected: Boolean, onClick: () -> Unit) {
    Card(
        onClick = onClick,
        shape = RoundedCornerShape(18.dp),
        border = BorderStroke(1.dp, if (selected) FamilyIndigo else MaterialTheme.colorScheme.outlineVariant),
        colors = CardDefaults.cardColors(
            containerColor = if (selected) FamilyIndigo.copy(alpha = 0.10f) else MaterialTheme.colorScheme.surface,
        ),
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Card(shape = CircleShape, colors = CardDefaults.cardColors(containerColor = FamilyIndigo)) {
                Icon(
                    Icons.Default.Person,
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.padding(8.dp),
                )
            }
            Column(Modifier.padding(start = 10.dp)) {
                Text(student.fullName, fontWeight = FontWeight.SemiBold, maxLines = 1)
                Text(
                    listOfNotNull(student.className, student.sectionName?.let { "Sec $it" }).joinToString(" · "),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontSize = 12.sp,
                )
            }
        }
    }
}

@Composable
private fun StudentSummary(student: FamilyStudent) {
    Card(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = FamilyIndigo),
    ) {
        Column(Modifier.padding(20.dp)) {
            Text(student.relationship, color = Color.White.copy(alpha = 0.75f), fontSize = 12.sp)
            Text(student.fullName, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 23.sp)
            Spacer(Modifier.height(8.dp))
            Text(
                listOfNotNull(
                    student.className,
                    student.sectionName?.let { "Section $it" },
                    student.rollNo?.let { "Roll $it" },
                ).joinToString(" · ").ifBlank { "Enrollment details unavailable" },
                color = Color.White.copy(alpha = 0.88f),
                fontSize = 14.sp,
            )
            if (student.admissionNo.isNotBlank()) {
                Text("Admission no. ${student.admissionNo}", color = Color.White.copy(alpha = 0.72f), fontSize = 12.sp)
            }
        }
    }
}

@Composable
private fun Metrics(student: FamilyStudent) {
    Column(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            MetricCard(
                label = "Attendance",
                value = student.attendancePercentage?.let { "${formatPercent(it)}%" } ?: "—",
                detail = "${student.attendanceAttended} of ${student.attendanceTotal} days",
                modifier = Modifier.weight(1f),
            )
            MetricCard(
                label = "Homework",
                value = student.pendingHomeworkCount.toString(),
                detail = "active assignments",
                modifier = Modifier.weight(1f),
            )
        }
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            MetricCard(
                label = "Fees due",
                value = formatCurrency(student.outstandingFee),
                detail = if (student.outstandingFee > 0) "outstanding" else "nothing pending",
                modifier = Modifier.weight(1f),
            )
            MetricCard(
                label = "Results",
                value = student.completedResultCount.toString(),
                detail = "completed exams",
                modifier = Modifier.weight(1f),
            )
        }
    }
}

@Composable
private fun MetricCard(label: String, value: String, detail: String, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
    ) {
        Column(Modifier.padding(16.dp)) {
            Text(label, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
            Text(value, fontWeight = FontWeight.Bold, fontSize = 22.sp)
            Text(detail, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
        }
    }
}

@Composable
private fun HomeworkCard(homework: FamilyHomework) {
    Card(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 5.dp),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
    ) {
        Column(Modifier.padding(16.dp)) {
            Text(homework.subjectName, color = FamilyIndigo, fontWeight = FontWeight.SemiBold, fontSize = 12.sp)
            Text(homework.title, fontWeight = FontWeight.SemiBold, maxLines = 2, overflow = TextOverflow.Ellipsis)
            if (homework.dueDate.isNotBlank()) {
                Text("Due ${formatDate(homework.dueDate)}", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
            }
        }
    }
}

@Composable
private fun FamilyError(message: String, onRefresh: () -> Unit, modifier: Modifier = Modifier) {
    Box(modifier = modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(28.dp)) {
            Text(message, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(Modifier.height(12.dp))
            TextButton(onClick = onRefresh) {
                Icon(Icons.Default.Refresh, contentDescription = null)
                Spacer(Modifier.width(6.dp))
                Text("Try again")
            }
        }
    }
}

private fun formatPercent(value: Double): String =
    if (value % 1.0 == 0.0) value.toInt().toString() else String.format(Locale.US, "%.1f", value)

private fun formatCurrency(value: Double): String =
    NumberFormat.getCurrencyInstance(Locale.forLanguageTag("en-IN")).apply { maximumFractionDigits = 0 }.format(value)

private fun formatDate(value: String): String = runCatching {
    OffsetDateTime.parse(value).format(DateTimeFormatter.ofPattern("d MMM"))
}.getOrDefault(value.take(10))
