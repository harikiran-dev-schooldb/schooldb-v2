package com.schooldb.mobile.admin

import androidx.activity.compose.BackHandler
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
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
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
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.schooldb.mobile.network.ApiException
import com.schooldb.mobile.network.AuthenticatedApiClient
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminTicketScreen(id: String, onBack: () -> Unit) {
    val viewModel: AdminTicketViewModel = viewModel(key = "admin-ticket-$id")
    val state by viewModel.state.collectAsStateWithLifecycle()
    var note by rememberSaveable(id) { mutableStateOf("") }
    BackHandler(onBack = onBack)
    LaunchedEffect(id) { viewModel.load(id) }

    Scaffold(topBar = {
        TopAppBar(title = { Text(state.ticket?.number ?: "Ticket", fontWeight = FontWeight.Bold) },
            navigationIcon = {
                IconButton(onClick = onBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                }
            })
    }) { padding ->
        val ticket = state.ticket
        if (ticket == null && state.loading) {
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
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
                    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
                        shape = RoundedCornerShape(20.dp)) {
                        Column(Modifier.fillMaxWidth().padding(20.dp)) {
                            Text(ticket.number, style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.primary)
                            Text(ticket.subject, style = MaterialTheme.typography.headlineSmall,
                                fontWeight = FontWeight.Bold)
                            Text("${ticket.status.replace('_', ' ')} · ${ticket.priority}")
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
                        fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(8.dp))
                    Row(modifier = Modifier.horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf("OPEN", "IN_PROGRESS", "RESOLVED").forEach { status ->
                            FilterChip(selected = ticket.status == status,
                                onClick = { viewModel.updateStatus(id, status) },
                                enabled = !state.saving,
                                label = { Text(status.replace('_', ' ')) })
                        }
                    }
                }
                item { Text("Replies", style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold) }
                items(ticket.notes, key = { it.id }) { message ->
                    TicketTextCard(message.author, message.body)
                }
                if (ticket.status != "CLOSED") item {
                    OutlinedTextField(value = note, onValueChange = { note = it.take(5000) },
                        label = { Text("Add reply") }, modifier = Modifier.fillMaxWidth(),
                        minLines = 3, maxLines = 6)
                    Spacer(Modifier.height(8.dp))
                    Button(onClick = { viewModel.addNote(id, note) { note = "" } },
                        enabled = note.isNotBlank() && !state.saving) { Text("Send reply") }
                }
                if (state.loading || state.saving) item { CircularProgressIndicator() }
                state.error?.let { message -> item { Text(message, color = MaterialTheme.colorScheme.error) } }
            }
        }
    }
}

@Composable
private fun TicketTextCard(title: String, body: String) {
    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        shape = RoundedCornerShape(16.dp)) {
        Column(Modifier.fillMaxWidth().padding(17.dp)) {
            Text(title, style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(5.dp))
            Text(body, style = MaterialTheme.typography.bodyMedium)
        }
    }
}
