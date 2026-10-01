package com.schooldb.mobile.admin

import androidx.activity.compose.BackHandler
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Assignment
import androidx.compose.material.icons.filled.Campaign
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.schooldb.mobile.network.ApiException
import com.schooldb.mobile.network.AuthenticatedApiClient
import java.io.IOException
import java.time.LocalDate
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject

internal data class AdminSectionOption(val id: String, val name: String)
internal data class AdminClassOption(
    val id: String,
    val name: String,
    val sections: List<AdminSectionOption>,
)
internal data class AdminBranchOption(
    val id: String,
    val name: String,
    val classes: List<AdminClassOption>,
)
internal data class AdminSyllabusOption(
    val id: String,
    val name: String,
    val branches: List<AdminBranchOption>,
)

private data class ComposerOption(val id: String, val label: String)

internal data class AdminContentComposerState(
    val syllabi: List<AdminSyllabusOption> = emptyList(),
    val loading: Boolean = true,
    val saving: Boolean = false,
    val completed: Boolean = false,
    val error: String? = null,
)

internal class AdminContentRepository(
    private val api: AuthenticatedApiClient = AuthenticatedApiClient(),
) {
    suspend fun options(): List<AdminSyllabusOption> {
        val rows = api.get("api/v1/mobile/admin/content-options").getJSONArray("syllabi")
        return (0 until rows.length()).map { syllabusIndex ->
            val syllabus = rows.getJSONObject(syllabusIndex)
            val branches = syllabus.getJSONArray("branches")
            AdminSyllabusOption(
                id = syllabus.getString("id"),
                name = syllabus.getString("name"),
                branches = (0 until branches.length()).map { branchIndex ->
                    val branch = branches.getJSONObject(branchIndex)
                    val classes = branch.getJSONArray("classes")
                    AdminBranchOption(
                        id = branch.getString("id"),
                        name = branch.getString("name"),
                        classes = (0 until classes.length()).map { classIndex ->
                            val schoolClass = classes.getJSONObject(classIndex)
                            val sections = schoolClass.getJSONArray("sections")
                            AdminClassOption(
                                id = schoolClass.getString("id"),
                                name = schoolClass.getString("name"),
                                sections = (0 until sections.length()).map { sectionIndex ->
                                    sections.getJSONObject(sectionIndex).let {
                                        AdminSectionOption(it.getString("id"), it.getString("name"))
                                    }
                                },
                            )
                        },
                    )
                },
            )
        }
    }

    suspend fun publishAnnouncement(
        title: String,
        body: String,
        category: String,
        priority: String,
        targetType: String,
        targetId: String,
    ) {
        api.post(
            "api/v1/mobile/admin/announcements",
            JSONObject()
                .put("title", title)
                .put("body", body)
                .put("category", category)
                .put("priority", priority)
                .put("targetType", targetType)
                .put("targetId", targetId),
        )
    }

    suspend fun publishHomework(
        classId: String,
        sectionId: String,
        title: String,
        description: String,
        dueDate: String,
    ) {
        api.post(
            "api/v1/mobile/admin/homework",
            JSONObject()
                .put("classId", classId)
                .put("sectionId", sectionId)
                .put("title", title)
                .put("description", description)
                .put("dueDate", dueDate),
        )
    }
}

internal class AdminContentComposerViewModel(
    private val repository: AdminContentRepository = AdminContentRepository(),
) : ViewModel() {
    private val mutableState = MutableStateFlow(AdminContentComposerState())
    val state = mutableState.asStateFlow()

    init { loadOptions() }

    fun loadOptions() {
        mutableState.value = mutableState.value.copy(loading = true, error = null)
        viewModelScope.launch {
            try {
                val options = withContext(Dispatchers.IO) { repository.options() }
                mutableState.value = mutableState.value.copy(syllabi = options, loading = false)
            } catch (error: Exception) {
                fail(error)
            }
        }
    }

    fun consumeCompletion() {
        mutableState.value = mutableState.value.copy(completed = false)
    }

    fun publishAnnouncement(
        title: String,
        body: String,
        category: String,
        priority: String,
        targetType: String,
        targetId: String,
    ) {
        if (title.trim().length < 3) return showError("Enter an announcement title.")
        if (body.trim().length < 3) return showError("Enter the announcement message.")
        if (targetType != "SCHOOL" && targetId.isBlank()) return showError("Choose the announcement audience.")
        save {
            repository.publishAnnouncement(
                title.trim(), body.trim(), category, priority, targetType, targetId,
            )
        }
    }

    fun publishHomework(
        classId: String,
        sectionId: String,
        title: String,
        description: String,
        dueDate: String,
    ) {
        if (classId.isBlank()) return showError("Choose a class.")
        if (title.isBlank()) return showError("Enter a homework title.")
        val parsedDate = runCatching { LocalDate.parse(dueDate) }.getOrNull()
            ?: return showError("Enter the due date as YYYY-MM-DD.")
        if (parsedDate.isBefore(LocalDate.now())) return showError("Due date cannot be before today.")
        save { repository.publishHomework(classId, sectionId, title.trim(), description.trim(), dueDate) }
    }

    private fun save(action: suspend () -> Unit) {
        mutableState.value = mutableState.value.copy(saving = true, error = null)
        viewModelScope.launch {
            try {
                withContext(Dispatchers.IO) { action() }
                mutableState.value = mutableState.value.copy(saving = false, completed = true)
            } catch (error: Exception) {
                fail(error)
            }
        }
    }

    private fun fail(error: Exception) {
        val message = when (error) {
            is ApiException -> error.message
            is IOException -> "Could not reach SchoolDB. Check your connection."
            else -> "Could not save your changes. Please try again."
        }
        mutableState.value = mutableState.value.copy(loading = false, saving = false, error = message)
    }

    private fun showError(message: String) {
        mutableState.value = mutableState.value.copy(error = message)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun AdminAnnouncementComposerScreen(
    onBack: () -> Unit,
    onPublished: () -> Unit,
    viewModel: AdminContentComposerViewModel = viewModel(key = "admin-announcement-composer"),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var title by rememberSaveable { mutableStateOf("") }
    var body by rememberSaveable { mutableStateOf("") }
    var category by rememberSaveable { mutableStateOf("GENERAL") }
    var priority by rememberSaveable { mutableStateOf("NORMAL") }
    var audience by rememberSaveable { mutableStateOf("SCHOOL") }
    var syllabusId by rememberSaveable { mutableStateOf("") }
    var branchId by rememberSaveable { mutableStateOf("") }
    var classId by rememberSaveable { mutableStateOf("") }
    var sectionId by rememberSaveable { mutableStateOf("") }
    var confirm by rememberSaveable { mutableStateOf(false) }

    AutoSelectSyllabus(state.syllabi, syllabusId) { syllabusId = it }
    val branches = state.syllabi.find { it.id == syllabusId }?.branches.orEmpty()
    val classes = branches.find { it.id == branchId }?.classes.orEmpty()
    val sections = classes.find { it.id == classId }?.sections.orEmpty()
    val targetId = when (audience) {
        "SYLLABUS" -> syllabusId
        "BRANCH" -> branchId
        "CLASS" -> classId
        "SECTION" -> sectionId
        else -> ""
    }

    BackHandler(enabled = !state.saving, onBack = onBack)
    LaunchedEffect(state.completed) {
        if (state.completed) {
            viewModel.consumeCompletion()
            onPublished()
        }
    }

    AdminComposerScaffold("Create announcement", onBack, state.saving) { padding ->
        ComposerBody(state, padding, viewModel::loadOptions, allowEmptyOptions = true) {
            item {
                OutlinedTextField(title, { title = it.take(160) }, label = { Text("Title") },
                    placeholder = { Text("What should families know?") }, singleLine = true,
                    modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp),
                    colors = composerTextFieldColors())
            }
            item {
                OutlinedTextField(body, { body = it.take(10000) }, label = { Text("Message") },
                    placeholder = { Text("Write your announcement") }, minLines = 5,
                    modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp),
                    colors = composerTextFieldColors())
            }
            item {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    ComposerPicker("Category", category,
                        listOf("GENERAL", "FEES", "EXAM", "HOMEWORK", "ATTENDANCE", "EMERGENCY").map { ComposerOption(it, it.lowercase().replaceFirstChar(Char::uppercase)) },
                        Modifier.weight(1f)) { category = it }
                    ComposerPicker("Priority", priority,
                        listOf("NORMAL", "IMPORTANT", "URGENT").map { ComposerOption(it, it.lowercase().replaceFirstChar(Char::uppercase)) },
                        Modifier.weight(1f)) { priority = it }
                }
            }
            item {
                ComposerPicker("Audience", audience, listOf(
                    ComposerOption("SCHOOL", "Whole school"), ComposerOption("SYLLABUS", "Syllabus"),
                    ComposerOption("BRANCH", "Academic branch"), ComposerOption("CLASS", "Class"),
                    ComposerOption("SECTION", "Section"),
                )) {
                    audience = it
                    syllabusId = if (state.syllabi.size == 1) state.syllabi.first().id else ""
                    branchId = ""; classId = ""; sectionId = ""
                }
            }
            if (audience != "SCHOOL") item {
                ComposerPicker("Syllabus", syllabusId, state.syllabi.map { ComposerOption(it.id, it.name) }) {
                    syllabusId = it; branchId = ""; classId = ""; sectionId = ""
                }
            }
            if (audience in setOf("BRANCH", "CLASS", "SECTION")) item {
                ComposerPicker("Academic branch", branchId, branches.map { ComposerOption(it.id, it.name) }, enabled = syllabusId.isNotBlank()) {
                    branchId = it; classId = ""; sectionId = ""
                }
            }
            if (audience in setOf("CLASS", "SECTION")) item {
                ComposerPicker("Class", classId, classes.map { ComposerOption(it.id, it.name) }, enabled = branchId.isNotBlank()) {
                    classId = it; sectionId = ""
                }
            }
            if (audience == "SECTION") item {
                ComposerPicker("Section", sectionId, sections.map { ComposerOption(it.id, it.name) }, enabled = classId.isNotBlank()) {
                    sectionId = it
                }
            }
            state.error?.let { error -> item { ComposerError(error) } }
            item {
                Button(onClick = { confirm = true }, enabled = !state.saving,
                    modifier = Modifier.fillMaxWidth().height(54.dp), shape = RoundedCornerShape(16.dp)) {
                    Icon(Icons.Default.Campaign, null)
                    Spacer(Modifier.size(8.dp))
                    Text("Publish announcement", fontWeight = FontWeight.Bold)
                }
            }
        }
    }

    if (confirm) {
        AlertDialog(
            onDismissRequest = { confirm = false },
            title = { Text("Publish this announcement?") },
            text = { Text("It will be sent immediately to ${audienceLabel(audience, targetId, state.syllabi)}.") },
            confirmButton = {
                Button(onClick = {
                    confirm = false
                    viewModel.publishAnnouncement(title, body, category, priority, audience, targetId)
                }) { Text("Publish") }
            },
            dismissButton = { TextButton(onClick = { confirm = false }) { Text("Cancel") } },
            shape = RoundedCornerShape(28.dp),
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun AdminHomeworkComposerScreen(
    onBack: () -> Unit,
    onPublished: () -> Unit,
    viewModel: AdminContentComposerViewModel = viewModel(key = "admin-homework-composer"),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var syllabusId by rememberSaveable { mutableStateOf("") }
    var branchId by rememberSaveable { mutableStateOf("") }
    var classId by rememberSaveable { mutableStateOf("") }
    var sectionId by rememberSaveable { mutableStateOf("") }
    var title by rememberSaveable { mutableStateOf("") }
    var description by rememberSaveable { mutableStateOf("") }
    var dueDate by rememberSaveable { mutableStateOf(LocalDate.now().plusDays(1).toString()) }
    var confirm by rememberSaveable { mutableStateOf(false) }

    AutoSelectSyllabus(state.syllabi, syllabusId) { syllabusId = it }
    val branches = state.syllabi.find { it.id == syllabusId }?.branches.orEmpty()
    val classes = branches.find { it.id == branchId }?.classes.orEmpty()
    val sections = classes.find { it.id == classId }?.sections.orEmpty()
    val selectedClass = classes.find { it.id == classId }
    val selectedSection = sections.find { it.id == sectionId }

    BackHandler(enabled = !state.saving, onBack = onBack)
    LaunchedEffect(state.completed) {
        if (state.completed) {
            viewModel.consumeCompletion()
            onPublished()
        }
    }

    AdminComposerScaffold("Create homework", onBack, state.saving) { padding ->
        ComposerBody(state, padding, viewModel::loadOptions) {
            item {
                OutlinedTextField(title, { title = it.take(200) }, label = { Text("Title") },
                    placeholder = { Text("What should students complete?") }, singleLine = true,
                    modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp),
                    colors = composerTextFieldColors())
            }
            item {
                ComposerPicker("Syllabus", syllabusId, state.syllabi.map { ComposerOption(it.id, it.name) }) {
                    syllabusId = it; branchId = ""; classId = ""; sectionId = ""
                }
            }
            item {
                ComposerPicker("Academic branch", branchId, branches.map { ComposerOption(it.id, it.name) }, enabled = syllabusId.isNotBlank()) {
                    branchId = it; classId = ""; sectionId = ""
                }
            }
            item {
                ComposerPicker("Class", classId, classes.map { ComposerOption(it.id, it.name) }, enabled = branchId.isNotBlank()) {
                    classId = it; sectionId = ""
                }
            }
            item {
                ComposerPicker("Section", sectionId,
                    listOf(ComposerOption("", "All sections")) + sections.map { ComposerOption(it.id, it.name) },
                    enabled = classId.isNotBlank()) { sectionId = it }
            }
            item {
                OutlinedTextField(description, { description = it.take(2000) }, label = { Text("Instructions") },
                    placeholder = { Text("Write clear homework instructions") }, minLines = 5,
                    modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp),
                    colors = composerTextFieldColors())
            }
            item {
                OutlinedTextField(dueDate, { dueDate = it.take(10) }, label = { Text("Due date") },
                    supportingText = { Text("YYYY-MM-DD") }, singleLine = true,
                    modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp),
                    colors = composerTextFieldColors())
            }
            state.error?.let { error -> item { ComposerError(error) } }
            item {
                Button(onClick = { confirm = true }, enabled = !state.saving,
                    modifier = Modifier.fillMaxWidth().height(54.dp), shape = RoundedCornerShape(16.dp)) {
                    if (state.saving) CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp)
                    else Icon(Icons.AutoMirrored.Filled.Assignment, null)
                    Spacer(Modifier.size(8.dp))
                    Text("Publish homework", fontWeight = FontWeight.Bold)
                }
            }
        }
    }

    if (confirm) {
        AlertDialog(
            onDismissRequest = { confirm = false },
            title = { Text("Publish this homework?") },
            text = { Text("It will be visible to ${selectedClass?.name ?: "the selected class"}${selectedSection?.let { " · ${it.name}" } ?: " · all sections"}.") },
            confirmButton = {
                Button(onClick = {
                    confirm = false
                    viewModel.publishHomework(classId, sectionId, title, description, dueDate)
                }) { Text("Publish") }
            },
            dismissButton = { TextButton(onClick = { confirm = false }) { Text("Cancel") } },
            shape = RoundedCornerShape(28.dp),
        )
    }
}

@Composable
private fun AutoSelectSyllabus(
    syllabi: List<AdminSyllabusOption>,
    selectedId: String,
    onSelect: (String) -> Unit,
) {
    LaunchedEffect(syllabi, selectedId) {
        if (selectedId.isBlank() && syllabi.size == 1) onSelect(syllabi.first().id)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AdminComposerScaffold(
    title: String,
    onBack: () -> Unit,
    saving: Boolean,
    content: @Composable (PaddingValues) -> Unit,
) {
    Scaffold(containerColor = MaterialTheme.colorScheme.background, topBar = {
        AdminPremiumPageHeader(
            title = title,
            subtitle = if (title.contains("announcement", ignoreCase = true)) {
                "Compose a clear update and choose exactly who should receive it."
            } else {
                "Publish classwork with a clear audience and due date."
            },
            eyebrow = if (title.contains("announcement", ignoreCase = true)) {
                "COMMUNICATION HUB"
            } else {
                "ACADEMIC COMMAND"
            },
            onBack = onBack,
            backEnabled = !saving,
        )
    }, content = content)
}

@Composable
private fun ComposerBody(
    state: AdminContentComposerState,
    padding: PaddingValues,
    onRetry: () -> Unit,
    allowEmptyOptions: Boolean = false,
    content: androidx.compose.foundation.lazy.LazyListScope.() -> Unit,
) {
    when {
        state.loading -> Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
            CircularProgressIndicator()
        }
        state.syllabi.isEmpty() && (state.error != null || !allowEmptyOptions) -> Column(
            Modifier.fillMaxSize().padding(padding).padding(24.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(state.error ?: "Add an active syllabus before creating content.",
                color = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(Modifier.height(12.dp))
            OutlinedButton(onClick = onRetry) { Text("Try again") }
        }
        else -> LazyColumn(
            modifier = Modifier.fillMaxSize().padding(padding),
            contentPadding = PaddingValues(18.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            item {
                Surface(shape = RoundedCornerShape(20.dp), color = Color.White,
                    border = BorderStroke(1.dp, AdminWebBorder)) {
                    Column(Modifier.fillMaxWidth().background(Brush.linearGradient(listOf(
                        Color.White, AdminWebTint, Color(0xFFF5F3FF),
                    ))).padding(16.dp)) {
                        Text("CONTENT DETAILS", color = AdminWebIndigo,
                            style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.ExtraBold)
                        Text("Choose the audience and add clear information.", color = AdminWebNavy,
                            style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Text("The selected syllabus, branch, class and section control who receives it.",
                            color = AdminWebSlate, style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
            content()
        }
    }
}

@Composable
private fun ComposerPicker(
    label: String,
    selectedId: String,
    options: List<ComposerOption>,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    onSelect: (String) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }
    val selected = options.find { it.id == selectedId }
    Column(modifier) {
        Text(label, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.SemiBold)
        Spacer(Modifier.height(6.dp))
        Box {
            OutlinedButton(
                onClick = { expanded = true },
                enabled = enabled && options.isNotEmpty(),
                modifier = Modifier.fillMaxWidth().height(50.dp),
                shape = RoundedCornerShape(14.dp),
                border = BorderStroke(1.dp, if (enabled) Color(0xFFC7D2FE) else Color(0xFFE2E8F0)),
                colors = ButtonDefaults.outlinedButtonColors(
                    containerColor = Color.White,
                    disabledContainerColor = Color(0xFFF8FAFC),
                ),
            ) {
                Text(selected?.label ?: "Select ${label.lowercase()}", color = if (enabled) AdminWebNavy else AdminWebSlate,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
            }
            DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                options.forEach { option ->
                    DropdownMenuItem(text = { Text(option.label) }, onClick = {
                        onSelect(option.id); expanded = false
                    })
                }
            }
        }
    }
}

@Composable
private fun ComposerError(message: String) {
    Surface(color = Color(0xFFFEF2F2), shape = RoundedCornerShape(16.dp),
        border = BorderStroke(1.dp, Color(0xFFFECACA))) {
        Text(message, Modifier.fillMaxWidth().padding(14.dp), color = Color(0xFFB91C1C),
            style = MaterialTheme.typography.bodyMedium)
    }
}

@Composable
private fun composerTextFieldColors() = OutlinedTextFieldDefaults.colors(
    focusedBorderColor = AdminWebIndigo,
    unfocusedBorderColor = AdminWebBorder,
    focusedContainerColor = Color.White,
    unfocusedContainerColor = Color.White,
)

private fun audienceLabel(
    audience: String,
    targetId: String,
    syllabi: List<AdminSyllabusOption>,
): String {
    if (audience == "SCHOOL") return "the whole school"
    syllabi.forEach { syllabus ->
        if (audience == "SYLLABUS" && syllabus.id == targetId) return syllabus.name
        syllabus.branches.forEach { branch ->
            if (audience == "BRANCH" && branch.id == targetId) return branch.name
            branch.classes.forEach { schoolClass ->
                if (audience == "CLASS" && schoolClass.id == targetId) return schoolClass.name
                schoolClass.sections.find { it.id == targetId }?.let { if (audience == "SECTION") return "${schoolClass.name} · ${it.name}" }
            }
        }
    }
    return "the selected audience"
}
