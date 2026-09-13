package com.schooldb.mobile.teacher

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.outlined.People
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

private val StudentsIndigo = Color(0xFF4F46E5)
private val StudentsIndigoSoft = Color(0xFFEEF2FF)
private val StudentsBackground = Color(0xFFF8FAFC)
private val StudentsSlate900 = Color(0xFF0F172A)
private val StudentsSlate600 = Color(0xFF475569)
private val StudentsSlate500 = Color(0xFF64748B)
private val StudentsSlate300 = Color(0xFFCBD5E1)
private val StudentsSlate200 = Color(0xFFE2E8F0)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TeacherStudentsScreen(
    dashboard: TeacherDashboard,
    onBack: () -> Unit,
) {
    val groups = remember(dashboard.studentGroups) {
        dashboard.studentGroups.sortedWith(
            compareBy<TeacherStudentGroup>(
                { it.className },
                { it.sectionName },
            ),
        )
    }

    var selectedKey by rememberSaveable {
        mutableStateOf(
            groups.firstOrNull()?.let {
                "${it.classId}:${it.sectionId}"
            },
        )
    }

    val selected = groups.firstOrNull {
        "${it.classId}:${it.sectionId}" == selectedKey
    } ?: groups.firstOrNull()

    var query by rememberSaveable {
        mutableStateOf("")
    }

    val students = selected?.students.orEmpty()
    val filteredStudents = remember(students, query) {
        val value = query.trim()
        if (value.isBlank()) {
            students
        } else {
            students.filter {
                it.fullName.contains(value, ignoreCase = true) ||
                    it.admissionNo.contains(value, ignoreCase = true) ||
                    (it.rollNo?.toString()?.contains(value) == true)
            }
        }
    }

    Scaffold(
        containerColor = StudentsBackground,
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = "My Students",
                            fontWeight = FontWeight.Bold,
                            color = StudentsSlate900,
                        )
                        Text(
                            text = dashboard.schoolName,
                            style = MaterialTheme.typography.labelMedium,
                            color = StudentsSlate500,
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back",
                            tint = StudentsSlate900,
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = StudentsBackground,
                ),
            )
        },
    ) { padding ->
        if (groups.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(18.dp),
            ) {
                EmptyStudentsCard(
                    title = "No assigned classes",
                    message = "No active class or section allocation is available for this teacher.",
                )
            }
            return@Scaffold
        }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(
                        start = 18.dp,
                        end = 18.dp,
                        top = 12.dp,
                        bottom = 10.dp,
                    ),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Text(
                    text = "ASSIGNED CLASSES",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.3.sp,
                    color = StudentsIndigo,
                )

                LazyRow(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    contentPadding = PaddingValues(end = 8.dp),
                ) {
                    items(
                        items = groups,
                        key = { "${it.classId}:${it.sectionId}" },
                    ) { group ->
                        val active =
                            group.classId == selected?.classId &&
                                group.sectionId == selected?.sectionId

                        Card(
                            onClick = {
                                selectedKey = "${group.classId}:${group.sectionId}"
                                query = ""
                            },
                            shape = RoundedCornerShape(14.dp),
                            colors = CardDefaults.cardColors(
                                containerColor = if (active) {
                                    StudentsIndigoSoft
                                } else {
                                    Color.White
                                },
                            ),
                            border = BorderStroke(
                                width = 1.dp,
                                color = if (active) {
                                    StudentsIndigo
                                } else {
                                    StudentsSlate200
                                },
                            ),
                        ) {
                            Row(
                                modifier = Modifier.padding(
                                    horizontal = 14.dp,
                                    vertical = 11.dp,
                                ),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Icon(
                                    imageVector = Icons.Outlined.People,
                                    contentDescription = null,
                                    modifier = Modifier.size(18.dp),
                                    tint = if (active) {
                                        StudentsIndigo
                                    } else {
                                        StudentsSlate500
                                    },
                                )
                                Text(
                                    text = "${group.className} · ${group.sectionName}",
                                    modifier = Modifier.padding(start = 7.dp),
                                    fontSize = 13.sp,
                                    fontWeight = if (active) {
                                        FontWeight.SemiBold
                                    } else {
                                        FontWeight.Medium
                                    },
                                    color = StudentsSlate900,
                                )
                            }
                        }
                    }
                }

                selected?.let { group ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = StudentsIndigoSoft,
                        ),
                        border = BorderStroke(
                            width = 1.dp,
                            color = StudentsIndigo.copy(alpha = 0.25f),
                        ),
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(14.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Icon(
                                imageVector = Icons.Outlined.People,
                                contentDescription = null,
                                tint = StudentsIndigo,
                            )
                            Column(
                                modifier = Modifier.padding(start = 10.dp),
                            ) {
                                Text(
                                    text = "${group.className} · Section ${group.sectionName}",
                                    fontWeight = FontWeight.Bold,
                                    color = StudentsSlate900,
                                )
                                Text(
                                    text = "${students.size} student${if (students.size == 1) "" else "s"}",
                                    fontSize = 12.sp,
                                    color = StudentsSlate500,
                                )
                            }
                        }
                    }
                }

                OutlinedTextField(
                    value = query,
                    onValueChange = { query = it },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    leadingIcon = {
                        Icon(
                            imageVector = Icons.Outlined.Search,
                            contentDescription = null,
                        )
                    },
                    placeholder = {
                        Text("Search name, admission no. or roll no.")
                    },
                    shape = RoundedCornerShape(16.dp),
                )
            }

            if (filteredStudents.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f)
                        .padding(horizontal = 18.dp),
                ) {
                    EmptyStudentsCard(
                        title = if (query.isBlank()) {
                            "No students"
                        } else {
                            "No matching students"
                        },
                        message = if (query.isBlank()) {
                            "There are no active students in this class and section."
                        } else {
                            "Try another name, admission number or roll number."
                        },
                    )
                }
            } else {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    contentPadding = PaddingValues(
                        start = 18.dp,
                        end = 18.dp,
                        top = 2.dp,
                        bottom = 88.dp,
                    ),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    items(
                        items = filteredStudents,
                        key = { it.enrollmentId },
                    ) { student ->
                        StudentRow(student)
                    }
                }
            }
        }
    }
}

@Composable
private fun StudentRow(
    student: TeacherStudent,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(
            containerColor = Color.White,
        ),
        border = BorderStroke(
            width = 1.dp,
            color = StudentsSlate200,
        ),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(15.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .background(
                        color = StudentsIndigoSoft,
                        shape = CircleShape,
                    ),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = student.fullName
                        .trim()
                        .firstOrNull()
                        ?.uppercase()
                        ?: "S",
                    fontWeight = FontWeight.Bold,
                    color = StudentsIndigo,
                )
            }

            Column(
                modifier = Modifier
                    .weight(1f)
                    .padding(start = 13.dp),
            ) {
                Text(
                    text = student.fullName,
                    fontWeight = FontWeight.SemiBold,
                    color = StudentsSlate900,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Spacer(
                    modifier = Modifier.height(3.dp),
                )
                Text(
                    text = "Admission No. ${student.admissionNo}",
                    fontSize = 12.sp,
                    color = StudentsSlate500,
                )
            }

            Column(
                horizontalAlignment = Alignment.End,
            ) {
                Text(
                    text = student.rollNo?.let {
                        "Roll $it"
                    } ?: "No roll no.",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = StudentsSlate600,
                )
                Spacer(
                    modifier = Modifier.height(4.dp),
                )
                Text(
                    text = student.status,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    color = StudentsIndigo,
                    modifier = Modifier
                        .background(
                            color = StudentsIndigoSoft,
                            shape = RoundedCornerShape(8.dp),
                        )
                        .padding(
                            horizontal = 7.dp,
                            vertical = 4.dp,
                        ),
                )
            }
        }
    }
}

@Composable
private fun EmptyStudentsCard(
    title: String,
    message: String,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(
            containerColor = Color.White,
        ),
        border = BorderStroke(
            width = 1.dp,
            color = StudentsSlate200,
        ),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Icon(
                imageVector = Icons.Outlined.People,
                contentDescription = null,
                tint = StudentsSlate300,
                modifier = Modifier.size(36.dp),
            )
            Spacer(
                modifier = Modifier.height(10.dp),
            )
            Text(
                text = title,
                fontWeight = FontWeight.SemiBold,
                color = StudentsSlate900,
            )
            Spacer(
                modifier = Modifier.height(4.dp),
            )
            Text(
                text = message,
                style = MaterialTheme.typography.bodySmall,
                color = StudentsSlate500,
            )
        }
    }
}
