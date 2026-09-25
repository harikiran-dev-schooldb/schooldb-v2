package com.schooldb.mobile.admin

import androidx.activity.compose.BackHandler
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
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.composables.icons.lucide.ArrowLeft
import com.composables.icons.lucide.CalendarCheck
import com.composables.icons.lucide.GraduationCap
import com.composables.icons.lucide.Lucide
import com.composables.icons.lucide.RefreshCw
import com.composables.icons.lucide.Users
import com.composables.icons.lucide.WalletCards
import com.schooldb.mobile.network.ApiException
import com.schooldb.mobile.network.AuthenticatedApiClient
import java.io.IOException
import java.text.NumberFormat
import java.util.Locale
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

internal data class StudentParent(val name: String, val relationship: String, val phone: String, val email: String)
internal data class StudentResult(
    val id: String, val exam: String, val subject: String, val obtained: Double?, val maximum: Double, val status: String,
)
internal data class AdminStudent(
    val name: String,
    val admissionNo: String,
    val status: String,
    val gender: String,
    val dob: String,
    val joinedDate: String,
    val phone: String,
    val email: String,
    val address: String,
    val bloodGroup: String,
    val medical: String,
    val className: String,
    val sectionName: String,
    val academicYear: String,
    val rollNo: String,
    val house: String,
    val parents: List<StudentParent>,
    val attendanceTotal: Int,
    val attendancePresent: Int,
    val attendanceAbsent: Int,
    val attendanceLate: Int,
    val attendancePercentage: Double,
    val feePayable: Double,
    val feePaid: Double,
    val feeOutstanding: Double,
    val pendingInstallments: Int,
    val results: List<StudentResult>,
)
internal data class AdminStudentState(
    val student: AdminStudent? = null,
    val loading: Boolean = true,
    val error: String? = null,
)

internal class AdminStudentViewModel : ViewModel() {
    private val api = AuthenticatedApiClient()
    private val mutableState = MutableStateFlow(AdminStudentState())
    val state = mutableState.asStateFlow()

    fun load(id: String, forceRefresh: Boolean = false) {
        mutableState.value = mutableState.value.copy(loading = true, error = null)
        viewModelScope.launch {
            try {
                val data = withContext(Dispatchers.IO) {
                    api.get("api/v1/mobile/admin/students/$id", cacheTtlMillis = 120_000L, forceRefresh = forceRefresh)
                }
                val profile = data.getJSONObject("student")
                val enrollment = data.optJSONObject("enrollment")
                val attendance = data.getJSONObject("attendance")
                val fees = data.getJSONObject("fees")
                val parentRows = data.getJSONArray("parents")
                val resultRows = data.getJSONArray("recentResults")
                val address = listOf(
                    profile.clean("address"), profile.clean("city"), profile.clean("state"), profile.clean("pincode"),
                ).filter(String::isNotBlank).joinToString(", ")
                val medical = listOf(profile.clean("medicalConditions"), profile.clean("allergies"))
                    .filter(String::isNotBlank).joinToString(" · ")
                mutableState.value = AdminStudentState(
                    student = AdminStudent(
                        name = profile.clean("fullName").ifBlank { profile.clean("admissionNo") },
                        admissionNo = profile.clean("admissionNo"),
                        status = profile.clean("status"),
                        gender = profile.clean("gender"),
                        dob = profile.clean("dob"),
                        joinedDate = profile.clean("joinedDate"),
                        phone = profile.clean("phone"),
                        email = profile.clean("email"),
                        address = address,
                        bloodGroup = profile.clean("bloodGroup"),
                        medical = medical,
                        className = enrollment?.clean("className").orEmpty(),
                        sectionName = enrollment?.clean("sectionName").orEmpty(),
                        academicYear = enrollment?.clean("academicYear").orEmpty(),
                        rollNo = enrollment?.optInt("rollNo", -1)?.takeIf { it >= 0 }?.toString().orEmpty(),
                        house = enrollment?.clean("houseName").orEmpty(),
                        parents = (0 until parentRows.length()).map { index ->
                            parentRows.getJSONObject(index).let { row ->
                                StudentParent(row.clean("name"), row.clean("relationship"), row.clean("phone"), row.clean("email"))
                            }
                        },
                        attendanceTotal = attendance.optInt("total"),
                        attendancePresent = attendance.optInt("present"),
                        attendanceAbsent = attendance.optInt("absent"),
                        attendanceLate = attendance.optInt("late"),
                        attendancePercentage = attendance.optDouble("percentage"),
                        feePayable = fees.optDouble("payable"),
                        feePaid = fees.optDouble("paid"),
                        feeOutstanding = fees.optDouble("outstanding"),
                        pendingInstallments = fees.optInt("pendingInstallments"),
                        results = (0 until resultRows.length()).map { index ->
                            resultRows.getJSONObject(index).let { row ->
                                StudentResult(
                                    id = row.getString("id"), exam = row.clean("exam"), subject = row.clean("subject"),
                                    obtained = if (row.isNull("obtained")) null else row.optDouble("obtained"),
                                    maximum = row.optDouble("maximum"), status = row.clean("status"),
                                )
                            }
                        },
                    ),
                    loading = false,
                )
            } catch (error: Exception) {
                mutableState.value = mutableState.value.copy(
                    loading = false,
                    error = when (error) {
                        is ApiException -> error.message
                        is IOException -> "Could not reach SchoolDB. Check your connection."
                        else -> "Could not load this student."
                    },
                )
            }
        }
    }
}

private fun org.json.JSONObject.clean(key: String): String =
    optString(key).takeUnless { it == "null" }.orEmpty()

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminStudentScreen(id: String, onBack: () -> Unit) {
    val viewModel: AdminStudentViewModel = viewModel(key = "admin-student-$id")
    val state by viewModel.state.collectAsStateWithLifecycle()
    BackHandler(onBack = onBack)
    LaunchedEffect(id) { viewModel.load(id) }

    Scaffold(containerColor = MaterialTheme.colorScheme.background, topBar = {
        Column(Modifier.fillMaxWidth().statusBarsPadding().padding(horizontal = 18.dp, vertical = 10.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                StudentRoundButton(onClick = onBack) { Icon(Lucide.ArrowLeft, contentDescription = "Back") }
                StudentRoundButton(onClick = { viewModel.load(id, true) }, enabled = !state.loading) {
                    Icon(Lucide.RefreshCw, contentDescription = "Refresh student")
                }
            }
            Spacer(Modifier.height(14.dp))
            Text("Student profile", fontSize = 32.sp, lineHeight = 36.sp, fontWeight = FontWeight.ExtraBold)
            Text("Academic, attendance and fee overview", color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }) { padding ->
        PullToRefreshBox(
            isRefreshing = state.loading && state.student != null,
            onRefresh = { viewModel.load(id, true) },
            modifier = Modifier.fillMaxSize().padding(padding),
        ) {
            val student = state.student
            if (student == null && state.loading) {
                AdminSectionSkeleton()
            } else if (student == null) {
                Column(Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(state.error ?: "Student unavailable", color = MaterialTheme.colorScheme.error)
                    Spacer(Modifier.height(12.dp))
                    Button(onClick = { viewModel.load(id, true) }) { Text("Try again") }
                }
            } else {
                StudentProfileContent(student)
            }
        }
    }
}

@Composable
private fun StudentProfileContent(student: AdminStudent) {
    val currency = NumberFormat.getCurrencyInstance(Locale.forLanguageTag("en-IN"))
    LazyColumn(
        Modifier.fillMaxSize(), contentPadding = PaddingValues(start = 18.dp, end = 18.dp, top = 6.dp, bottom = 32.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            Card(shape = RoundedCornerShape(26.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)) {
                Box(Modifier.fillMaxWidth().background(Brush.linearGradient(listOf(
                    MaterialTheme.colorScheme.primaryContainer, MaterialTheme.colorScheme.tertiaryContainer,
                ))).padding(20.dp)) {
                    Column {
                        Surface(Modifier.size(62.dp), shape = CircleShape, color = MaterialTheme.colorScheme.onPrimaryContainer) {
                            Box(contentAlignment = Alignment.Center) {
                                Text(student.name.split(" ").take(2).mapNotNull { it.firstOrNull() }.joinToString("").uppercase(),
                                    color = MaterialTheme.colorScheme.primaryContainer, fontSize = 22.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                        Spacer(Modifier.height(16.dp))
                        Text(student.name, fontSize = 26.sp, lineHeight = 30.sp, fontWeight = FontWeight.ExtraBold)
                        Text("${student.admissionNo} · ${student.status.replace('_', ' ')}",
                            color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.78f))
                        if (student.className.isNotBlank()) {
                            Spacer(Modifier.height(10.dp))
                            Text("${student.className} · ${student.sectionName}", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
        item {
            StudentInfoCard("Enrollment", Lucide.GraduationCap, listOf(
                "Academic year" to student.academicYear,
                "Class & section" to listOf(student.className, student.sectionName).filter(String::isNotBlank).joinToString(" · "),
                "Roll number" to student.rollNo,
                "House" to student.house,
                "Joined" to student.joinedDate,
            ))
        }
        item {
            StudentInfoCard("Personal details", Lucide.Users, listOf(
                "Date of birth" to student.dob,
                "Gender" to student.gender,
                "Blood group" to student.bloodGroup,
                "Phone" to student.phone,
                "Email" to student.email,
                "Address" to student.address,
                "Medical" to student.medical,
            ))
        }
        item {
            StudentMetricCard("Attendance", Lucide.CalendarCheck,
                main = if (student.attendanceTotal > 0) "${student.attendancePercentage}%" else "No records",
                detail = "${student.attendancePresent} present · ${student.attendanceAbsent} absent · ${student.attendanceLate} late")
        }
        item {
            StudentMetricCard("Fees", Lucide.WalletCards,
                main = currency.format(student.feeOutstanding),
                detail = "Outstanding · ${currency.format(student.feePaid)} paid of ${currency.format(student.feePayable)}")
        }
        item { Text("Parent contacts", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold) }
        if (student.parents.isEmpty()) item { EmptyStudentCard("No parent contact has been added.") }
        items(student.parents) { parent ->
            StudentInfoCard(parent.name, Lucide.Users, listOf(
                "Relationship" to parent.relationship, "Phone" to parent.phone, "Email" to parent.email,
            ))
        }
        item { Text("Recent results", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold) }
        if (student.results.isEmpty()) item { EmptyStudentCard("No exam results have been entered.") }
        items(student.results, key = { it.id }) { result ->
            Surface(color = MaterialTheme.colorScheme.surface, shape = RoundedCornerShape(20.dp), tonalElevation = 1.dp) {
                Row(Modifier.fillMaxWidth().padding(17.dp), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text(result.subject, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text(result.exam, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Text(if (result.obtained == null) result.status.replace('_', ' ')
                        else "${result.obtained.asMarks()} / ${result.maximum.asMarks()}", fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

private fun Double.asMarks(): String = if (this % 1.0 == 0.0) toInt().toString() else String.format(Locale.US, "%.1f", this)

@Composable
private fun StudentRoundButton(onClick: () -> Unit, enabled: Boolean = true, content: @Composable () -> Unit) {
    Surface(onClick = onClick, enabled = enabled, modifier = Modifier.size(46.dp), shape = CircleShape,
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.76f)) {
        Box(contentAlignment = Alignment.Center) { content() }
    }
}

@Composable
private fun StudentInfoCard(title: String, icon: ImageVector, values: List<Pair<String, String>>) {
    val visible = values.filter { it.second.isNotBlank() }
    Surface(color = MaterialTheme.colorScheme.surface, shape = RoundedCornerShape(20.dp), tonalElevation = 1.dp) {
        Column(Modifier.fillMaxWidth().padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(20.dp))
                Spacer(Modifier.size(10.dp))
                Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            }
            if (visible.isEmpty()) Text("No details added", color = MaterialTheme.colorScheme.onSurfaceVariant)
            visible.forEach { (label, value) ->
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text(label, Modifier.weight(0.42f), color = MaterialTheme.colorScheme.onSurfaceVariant,
                        style = MaterialTheme.typography.bodySmall)
                    Text(value, Modifier.weight(0.58f), fontWeight = FontWeight.Medium, textAlign = androidx.compose.ui.text.style.TextAlign.End)
                }
            }
        }
    }
}

@Composable
private fun StudentMetricCard(title: String, icon: ImageVector, main: String, detail: String) {
    Surface(color = MaterialTheme.colorScheme.surface, shape = RoundedCornerShape(20.dp), tonalElevation = 1.dp) {
        Row(Modifier.fillMaxWidth().padding(18.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(24.dp))
            Spacer(Modifier.size(14.dp))
            Column {
                Text(title, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text(main, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.ExtraBold)
                Text(detail, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}

@Composable
private fun EmptyStudentCard(message: String) {
    Surface(color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.55f), shape = RoundedCornerShape(18.dp)) {
        Text(message, Modifier.fillMaxWidth().padding(18.dp), color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}
