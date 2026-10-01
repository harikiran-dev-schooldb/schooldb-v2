package com.schooldb.mobile.admin

import androidx.activity.compose.BackHandler
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.ui.draw.clip
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.schooldb.mobile.network.ApiException
import com.schooldb.mobile.network.AuthenticatedApiClient
import com.composables.icons.lucide.ArrowLeft
import com.composables.icons.lucide.Lucide
import java.io.IOException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject

internal data class TicketNote(val id: String, val author: String, val body: String)
internal data class AdminTicket(
    val number: String,
    val subject: String,
    val description: String,
    val status: String,
    val priority: String,
    val parentName: String,
    val parentPhone: String,
    val student: String,
    val notes: List<TicketNote>,
)
internal data class AdminTicketState(
    val ticket: AdminTicket? = null,
    val loading: Boolean = true,
    val saving: Boolean = false,
    val error: String? = null,
)

internal class AdminTicketViewModel : ViewModel() {
    private val api = AuthenticatedApiClient()
    private val mutableState = MutableStateFlow(AdminTicketState())
    val state = mutableState.asStateFlow()

    fun load(id: String) {
        mutableState.value = mutableState.value.copy(loading = true, error = null)
        viewModelScope.launch {
            try {
                val data = withContext(Dispatchers.IO) { api.get("api/v1/support/tickets/$id") }
                val messages = data.getJSONArray("messages")
                val ticket = AdminTicket(
                    number = data.getString("ticketNo"),
                    subject = data.getString("subject"),
                    description = data.getString("description"),
                    status = data.getString("status"),
                    priority = data.getString("priority"),
                    parentName = data.optString("parentName").takeUnless { it == "null" }.orEmpty(),
                    parentPhone = data.optString("parentPhone").takeUnless { it == "null" }.orEmpty(),
                    student = data.optJSONObject("student")?.optString("fullName").orEmpty(),
                    notes = (0 until messages.length()).map { index ->
                        val message = messages.getJSONObject(index)
                        val author = message.optJSONObject("author")
                        TicketNote(
                            id = message.getString("id"),
                            author = listOf(author?.optString("firstName"), author?.optString("lastName"))
                                .filterNotNull().filter(String::isNotBlank).joinToString(" ").ifBlank { "Staff" },
                            body = message.getString("body"),
                        )
                    },
                )
                mutableState.value = AdminTicketState(ticket = ticket, loading = false)
            } catch (error: Exception) {
                mutableState.value = mutableState.value.copy(loading = false, error = message(error))
            }
        }
    }

    fun updateStatus(id: String, status: String) {
        if (mutableState.value.saving) return
        mutableState.value = mutableState.value.copy(saving = true, error = null)
        viewModelScope.launch {
            try {
                withContext(Dispatchers.IO) {
                    api.post("api/v1/support/tickets/$id", JSONObject().put("status", status))
                }
                mutableState.value = mutableState.value.copy(saving = false)
                load(id)
            } catch (error: Exception) {
                mutableState.value = mutableState.value.copy(saving = false, error = message(error))
            }
        }
    }

    fun addNote(id: String, body: String, onSaved: () -> Unit) {
        if (mutableState.value.saving || body.isBlank()) return
        mutableState.value = mutableState.value.copy(saving = true, error = null)
        viewModelScope.launch {
            try {
                withContext(Dispatchers.IO) {
                    api.post("api/v1/support/tickets/$id/messages", JSONObject().put("body", body.trim()))
                }
                mutableState.value = mutableState.value.copy(saving = false)
                onSaved()
                load(id)
            } catch (error: Exception) {
                mutableState.value = mutableState.value.copy(saving = false, error = message(error))
            }
        }
    }

    private fun message(error: Exception) = when (error) {
        is ApiException -> error.message
        is IOException -> "Could not reach SchoolDB. Check your connection."
        else -> "Could not update this ticket."
    }
}

@Composable
fun AdminTicketScreen(id: String, onBack: () -> Unit) {
    val viewModel: AdminTicketViewModel = viewModel(key = "admin-ticket-$id")
    val state by viewModel.state.collectAsStateWithLifecycle()
    var note by rememberSaveable(id) { mutableStateOf("") }
    BackHandler(onBack = onBack)
    LaunchedEffect(id) { viewModel.load(id) }

    Scaffold(containerColor = MaterialTheme.colorScheme.background, topBar = {
        AdminPremiumPageHeader(
            title = "Support ticket",
            subtitle = state.ticket?.number ?: "Loading ticket",
            eyebrow = "SUPPORT DESK",
            onBack = onBack,
        )
    }) { padding ->
        val ticket = state.ticket
        if (ticket == null && state.loading) {
            AdminTicketSkeleton(Modifier.padding(padding))
        } else if (ticket == null) {
            Column(Modifier.fillMaxSize().padding(padding).padding(24.dp),
                verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally) {
                Text(state.error ?: "Ticket unavailable", color = MaterialTheme.colorScheme.error)
                Spacer(Modifier.height(12.dp))
                Button(onClick = { viewModel.load(id) }) { Text("Try again") }
            }
        } else {
            LazyColumn(Modifier.fillMaxSize().padding(padding), contentPadding = PaddingValues(18.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)) {
                item {
                    Card(colors = CardDefaults.cardColors(containerColor = Color.White),
                        border = BorderStroke(1.dp, AdminWebBorder), shape = RoundedCornerShape(22.dp)) {
                        Column(Modifier.fillMaxWidth().background(Brush.linearGradient(listOf(
                            Color.White, AdminWebTint, Color(0xFFF5F3FF),
                        ))).padding(20.dp)) {
                            Text(ticket.number, style = MaterialTheme.typography.labelMedium,
                                color = AdminWebIndigo, fontWeight = FontWeight.ExtraBold)
                            Text(ticket.subject, color = AdminWebNavy,
                                style = MaterialTheme.typography.headlineSmall,
                                fontWeight = FontWeight.Bold)
                            Spacer(Modifier.height(8.dp))
                            Surface(shape = RoundedCornerShape(50.dp), color = Color.White.copy(alpha = .86f),
                                border = BorderStroke(1.dp, AdminWebBorder)) {
                                Text("${ticket.status.replace('_', ' ')} · ${ticket.priority}",
                                    Modifier.padding(horizontal = 11.dp, vertical = 6.dp),
                                    color = AdminWebIndigo, style = MaterialTheme.typography.labelMedium)
                            }
                        }
                    }
                }
                item { TicketTextCard("Description", ticket.description) }
                if (ticket.student.isNotBlank()) item { TicketTextCard("Student", ticket.student) }
                if (ticket.parentName.isNotBlank() || ticket.parentPhone.isNotBlank()) item {
                    TicketTextCard("Parent contact", listOf(ticket.parentName, ticket.parentPhone)
                        .filter(String::isNotBlank).joinToString(" · "))
                }
                item {
                    Text("Update status", style = MaterialTheme.typography.titleMedium,
                        color = AdminWebNavy, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(8.dp))
                    Row(modifier = Modifier.horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf("OPEN", "IN_PROGRESS", "RESOLVED").forEach { status ->
                            FilterChip(selected = ticket.status == status,
                                onClick = { viewModel.updateStatus(id, status) },
                                enabled = !state.saving,
                                colors = FilterChipDefaults.filterChipColors(
                                    containerColor = Color.White,
                                    selectedContainerColor = Color(0xFFEEF2FF),
                                    selectedLabelColor = AdminWebIndigo,
                                ),
                                border = FilterChipDefaults.filterChipBorder(
                                    enabled = !state.saving,
                                    selected = ticket.status == status,
                                    borderColor = AdminWebBorder,
                                    selectedBorderColor = Color(0xFFC7D2FE),
                                ),
                                label = { Text(status.replace('_', ' ')) })
                        }
                    }
                }
                item { Text("Replies", color = AdminWebNavy, style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold) }
                items(ticket.notes, key = { it.id }) { message ->
                    TicketTextCard(message.author, message.body)
                }
                if (ticket.status != "CLOSED") item {
                    OutlinedTextField(value = note, onValueChange = { note = it.take(5000) },
                        label = { Text("Add reply") }, modifier = Modifier.fillMaxWidth(),
                        minLines = 3, maxLines = 6, shape = RoundedCornerShape(16.dp))
                    Spacer(Modifier.height(8.dp))
                    Button(onClick = { viewModel.addNote(id, note) { note = "" } },
                        modifier = Modifier.fillMaxWidth().height(50.dp),
                        shape = RoundedCornerShape(16.dp),
                        enabled = note.isNotBlank() && !state.saving) { Text("Send reply") }
                }
                if (state.loading || state.saving) item { CircularProgressIndicator() }
                state.error?.let { message -> item { Text(message, color = MaterialTheme.colorScheme.error) } }
            }
        }
    }
}

@Composable
private fun AdminTicketSkeleton(modifier: Modifier = Modifier) {
    val transition = rememberInfiniteTransition(label = "ticket-skeleton")
    val pulse by transition.animateFloat(
        initialValue = 0.42f,
        targetValue = 0.82f,
        animationSpec = infiniteRepeatable(tween(850), repeatMode = RepeatMode.Reverse),
        label = "ticket-skeleton-pulse",
    )
    val fill = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = pulse)
    LazyColumn(modifier.fillMaxSize(), contentPadding = PaddingValues(18.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item { Box(Modifier.fillMaxWidth().height(136.dp).clip(RoundedCornerShape(20.dp)).background(fill)) }
        items(3) {
            Box(Modifier.fillMaxWidth().height(92.dp).clip(RoundedCornerShape(16.dp)).background(fill))
        }
        item { Box(Modifier.fillMaxWidth(0.42f).height(22.dp).clip(RoundedCornerShape(11.dp)).background(fill)) }
    }
}

@Composable
private fun TicketTextCard(title: String, body: String) {
    Card(colors = CardDefaults.cardColors(containerColor = Color.White),
        border = BorderStroke(1.dp, AdminWebBorder), shape = RoundedCornerShape(18.dp)) {
        Column(Modifier.fillMaxWidth().padding(17.dp)) {
            Text(title, style = MaterialTheme.typography.labelMedium,
                color = AdminWebIndigo, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(5.dp))
            Text(body, style = MaterialTheme.typography.bodyMedium)
        }
    }
}
