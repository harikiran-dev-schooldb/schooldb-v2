package com.schooldb.support

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.clerk.api.Clerk
import com.schooldb.support.tickets.*
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { MaterialTheme { SupportApp() } }
    }
}

@Composable
private fun SupportApp() {
    val preferences = LocalContext.current.getSharedPreferences("support_session", 0)
    val api = remember { SupportRepository() }
    val scope = rememberCoroutineScope()
    var school by remember { mutableStateOf(preferences.getString("school", "").orEmpty()) }
    var phone by remember { mutableStateOf("") }
    var code by remember { mutableStateOf("") }
    var page by remember { mutableStateOf("loading") }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf("") }
    var challenge by remember { mutableStateOf("") }
    var accounts by remember { mutableStateOf<List<Pair<String, String>>>(emptyList()) }
    var tickets by remember { mutableStateOf<List<TicketSummary>>(emptyList()) }
    var admin by remember { mutableStateOf(false) }
    var summary by remember { mutableStateOf(listOf(0, 0, 0, 0)) }
    var detail by remember { mutableStateOf<TicketDetail?>(null) }
    var staff by remember { mutableStateOf<List<StaffOption>>(emptyList()) }

    fun run(action: suspend () -> Unit) {
        if (busy) return
        busy = true
        error = ""
        scope.launch {
            try { action() } catch (e: Exception) { error = e.message ?: "Request failed." }
            finally { busy = false }
        }
    }
    suspend fun loadTickets() {
        val result = api.tickets(school)
        tickets = result.tickets
        admin = result.isAdmin
        summary = listOf(result.open, result.inProgress, result.urgent, result.resolved)
        page = "list"
    }
    suspend fun loadDetail(id: String) {
        detail = api.detail(school, id)
        if (admin) staff = api.staff(school)
        page = "detail"
    }
    suspend fun finishLogin(token: String) {
        api.activate(token)
        preferences.edit().putString("school", school).apply()
        loadTickets()
    }
    LaunchedEffect(Unit) {
        if (BuildConfig.CLERK_PUBLISHABLE_KEY.isBlank()) {
            error = "Configure CLERK_PUBLISHABLE_KEY before signing in."
            page = "login"
        } else {
            Clerk.isInitialized.first { it }
            if (Clerk.activeSession != null && school.isNotBlank()) {
                try { loadTickets() } catch (_: Exception) { page = "login" }
            } else page = "login"
        }
    }

    Scaffold(topBar = {
        if (page in listOf("list", "create", "detail")) {
            Surface(tonalElevation = 3.dp) {
                Row(Modifier.fillMaxWidth().padding(16.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text(if (page == "list") "School Support" else if (page == "create") "Raise ticket" else "Ticket details",
                        style = MaterialTheme.typography.titleLarge)
                    TextButton(onClick = {
                        if (page == "list") run {
                            api.signOut()
                            preferences.edit().remove("school").apply()
                            tickets = emptyList()
                            page = "login"
                        } else page = "list"
                    }) { Text(if (page == "list") "Sign out" else "Back") }
                }
            }
        }
    }) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            if (error.isNotBlank()) Text(error, Modifier.padding(16.dp), color = MaterialTheme.colorScheme.error)
            if (busy) LinearProgressIndicator(Modifier.fillMaxWidth())
            when (page) {
                "loading" -> CircularProgressIndicator(Modifier.padding(24.dp))
                "login" -> Column(Modifier.padding(24.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    Text("Sign in to School Support", style = MaterialTheme.typography.headlineMedium)
                    OutlinedTextField(school, { school = it.trim() }, label = { Text("School code") }, modifier = Modifier.fillMaxWidth())
                    OutlinedTextField(phone, { phone = it.filter(Char::isDigit).take(10) }, label = { Text("Mobile number") }, modifier = Modifier.fillMaxWidth())
                    Button(onClick = { run { api.sendCode(school, phone); page = "otp" } },
                        enabled = !busy && school.isNotBlank() && phone.length == 10) { Text("Send WhatsApp code") }
                }
                "otp" -> Column(Modifier.padding(24.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    Text("Enter your code", style = MaterialTheme.typography.headlineMedium)
                    Text("Sent to +91 ••••••" + phone.takeLast(4))
                    OutlinedTextField(code, { code = it.filter(Char::isDigit).take(6) }, label = { Text("Six-digit code") })
                    Button(onClick = { run {
                        val response = api.verifyCode(school, phone, code)
                        if (response.optBoolean("requiresAccountSelection")) {
                            challenge = response.getString("challengeId")
                            val options = response.getJSONArray("accounts")
                            accounts = (0 until options.length()).map { index ->
                                val item = options.getJSONObject(index)
                                item.getString("id") to (item.optString("name") + " · " + item.optString("role"))
                            }
                            page = "accounts"
                        } else finishLogin(response.getString("token"))
                    } }, enabled = !busy && code.length == 6) { Text("Verify and continue") }
                    TextButton(onClick = { page = "login" }) { Text("Change number") }
                }
                "accounts" -> Column(Modifier.padding(24.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Choose your account", style = MaterialTheme.typography.headlineMedium)
                    accounts.forEach { (id, label) ->
                        OutlinedButton(onClick = { run {
                            finishLogin(api.selectAccount(school, challenge, id).getString("token"))
                        } }, enabled = !busy) { Text(label) }
                    }
                }
                "list" -> Column(Modifier.fillMaxSize().padding(16.dp)) {
                    Text(summary[0].toString() + " open  ·  " + summary[1].toString() +
                        " in progress  ·  " + summary[2].toString() + " urgent  ·  " + summary[3].toString() + " resolved")
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(onClick = { page = "create" }) { Text("Raise ticket") }
                        OutlinedButton(onClick = { run { loadTickets() } }, enabled = !busy) { Text("Refresh") }
                    }
                    if (tickets.isEmpty()) Text("No tickets yet. Raise the first one.", Modifier.padding(top = 20.dp))
                    LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(tickets, key = { it.id }) { ticket ->
                            Card(Modifier.fillMaxWidth().clickable { run { loadDetail(ticket.id) } }) {
                                Column(Modifier.padding(16.dp)) {
                                    Text(ticket.subject, style = MaterialTheme.typography.titleMedium)
                                    Text(ticket.ticketNo + " · " + ticket.status.name.replace('_', ' ') + " · " + ticket.priority.name)
                                }
                            }
                        }
                    }
                }
                "create" -> CreateTicket(api, school, busy) { subject, description, type, priority, studentId -> run {
                    loadDetail(api.create(school, subject, description, type, priority, studentId))
                } }
                "detail" -> detail?.let { ticket -> TicketDetails(ticket, admin, busy, staff,
                    onReply = { body -> run { api.reply(school, ticket.id, body); loadDetail(ticket.id) } },
                    onStatus = { status -> run { api.updateStatus(school, ticket.id, status); loadDetail(ticket.id) } },
                    onPriority = { priority -> run { api.updatePriority(school, ticket.id, priority); loadDetail(ticket.id) } },
                    onAssign = { userId -> run { api.assign(school, ticket.id, userId); loadDetail(ticket.id) } }) }
            }
        }
    }
}

@Composable
private fun CreateTicket(api: SupportRepository, school: String, busy: Boolean,
    submit: (String, String, TicketType, TicketPriority, String?) -> Unit) {
    val scope = rememberCoroutineScope()
    var subject by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var type by remember { mutableStateOf(TicketType.GENERAL) }
    var priority by remember { mutableStateOf(TicketPriority.NORMAL) }
    var search by remember { mutableStateOf("") }
    var options by remember { mutableStateOf<List<StudentOption>>(emptyList()) }
    var selected by remember { mutableStateOf<StudentOption?>(null) }
    var searchError by remember { mutableStateOf("") }
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)) {
        OutlinedTextField(subject, { subject = it }, label = { Text("Subject") }, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(description, { description = it }, label = { Text("Describe the issue") }, minLines = 4, modifier = Modifier.fillMaxWidth())
        Text("Type")
        OptionMenu(type.name.replace('_', ' '), TicketType.entries.map { it.name }) { type = TicketType.valueOf(it) }
        Text("Priority")
        OptionMenu(priority.name, TicketPriority.entries.map { it.name }) { priority = TicketPriority.valueOf(it) }
        if (type == TicketType.STUDENT) {
            OutlinedTextField(search, { search = it; selected = null }, label = { Text("Student name or admission number") }, modifier = Modifier.fillMaxWidth())
            OutlinedButton(onClick = { scope.launch {
                try { options = api.searchStudents(school, search); searchError = "" }
                catch (e: Exception) { searchError = e.message ?: "Search failed." }
            } }, enabled = search.length >= 2) { Text("Search students") }
            if (searchError.isNotBlank()) Text(searchError, color = MaterialTheme.colorScheme.error)
            options.forEach { option ->
                TextButton(onClick = { selected = option; options = emptyList() }) {
                    Text(option.fullName + " · " + option.admissionNo + (option.className?.let { " · " + it } ?: ""))
                }
            }
            selected?.let { Text("Selected: " + it.fullName + " (" + it.admissionNo + ")") }
        }
        Button(onClick = { submit(subject.trim(), description.trim(), type, priority, selected?.id) },
            enabled = !busy && subject.trim().length >= 3 && description.trim().length >= 10 &&
                (type != TicketType.STUDENT || selected != null), modifier = Modifier.fillMaxWidth()) { Text("Create ticket") }
    }
}

@Composable
private fun TicketDetails(ticket: TicketDetail, admin: Boolean, busy: Boolean, staff: List<StaffOption>,
    onReply: (String) -> Unit, onStatus: (TicketStatus) -> Unit,
    onPriority: (TicketPriority) -> Unit, onAssign: (String?) -> Unit) {
    var reply by remember(ticket.id) { mutableStateOf("") }
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text(ticket.subject, style = MaterialTheme.typography.headlineSmall)
        Text(ticket.ticketNo + " · " + ticket.type + " · " + ticket.priority + " · " + ticket.status.replace('_', ' '))
        ticket.studentName?.let { Text("Student: " + it) }
        Card(Modifier.fillMaxWidth()) { Text(ticket.description, Modifier.padding(16.dp)) }
        if (admin) {
            Text("Update status")
            OptionMenu(ticket.status.replace('_', ' '), TicketStatus.entries.map { it.name }) { onStatus(TicketStatus.valueOf(it)) }
            Text("Priority")
            OptionMenu(ticket.priority, TicketPriority.entries.map { it.name }) { onPriority(TicketPriority.valueOf(it)) }
            Text("Assigned to: " + (ticket.assignedToName ?: "Unassigned"))
            var staffMenu by remember { mutableStateOf(false) }
            Box {
                OutlinedButton(onClick = { staffMenu = true }, enabled = !busy) { Text("Assign staff") }
                DropdownMenu(expanded = staffMenu, onDismissRequest = { staffMenu = false }) {
                    DropdownMenuItem(text = { Text("Unassigned") }, onClick = { staffMenu = false; onAssign(null) })
                    staff.forEach { person ->
                        DropdownMenuItem(text = { Text(person.name + " · " + person.role) },
                            onClick = { staffMenu = false; onAssign(person.id) })
                    }
                }
            }
        }
        Text("Replies", style = MaterialTheme.typography.titleMedium)
        if (ticket.messages.isEmpty()) Text("No replies yet.")
        ticket.messages.forEach { message -> Card(Modifier.fillMaxWidth()) {
            Column(Modifier.padding(12.dp)) { Text(message.author); Text(message.body) }
        } }
        if (ticket.status != "CLOSED") {
            OutlinedTextField(reply, { reply = it }, label = { Text("Write a reply") }, modifier = Modifier.fillMaxWidth())
            Button(onClick = { onReply(reply.trim()); reply = "" }, enabled = !busy && reply.isNotBlank()) { Text("Send reply") }
        }
    }
}

@Composable
private fun OptionMenu(selected: String, values: List<String>, choose: (String) -> Unit) {
    var open by remember { mutableStateOf(false) }
    Box {
        OutlinedButton(onClick = { open = true }) { Text(selected) }
        DropdownMenu(expanded = open, onDismissRequest = { open = false }) {
            values.forEach { value -> DropdownMenuItem(text = { Text(value.replace('_', ' ')) }, onClick = { open = false; choose(value) }) }
        }
    }
}
