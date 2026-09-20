package com.schooldb.support

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.ArrowBack
import androidx.compose.material.icons.outlined.ChevronRight
import androidx.compose.material.icons.outlined.Logout
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.clerk.api.Clerk
import com.schooldb.support.tickets.*
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { SupportTheme { SupportApp() } }
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

    Scaffold(
        modifier = Modifier.fillMaxSize().background(Canvas).safeDrawingPadding(),
        containerColor = Canvas,
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
        topBar = {
        if (page in listOf("list", "create", "detail")) {
            Surface(color = Canvas) {
                Row(Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        if (page == "list") BrandMark(Modifier.size(42.dp))
                        else IconButton(onClick = { page = "list" }, modifier = Modifier.size(42.dp)) {
                            Icon(Icons.Outlined.ArrowBack, contentDescription = "Back", tint = Ink)
                        }
                        Column {
                            Text(if (page == "list") "SCHOOLDB" else "SCHOOL SUPPORT",
                                style = MaterialTheme.typography.labelSmall, color = Muted, fontWeight = FontWeight.Bold)
                            Text(if (page == "list") "Support desk" else if (page == "create") "New ticket" else "Ticket details",
                                style = MaterialTheme.typography.titleMedium, color = Ink, fontWeight = FontWeight.Bold)
                        }
                    }
                    if (page == "list") IconButton(onClick = {
                        if (page == "list") run {
                            api.signOut()
                            preferences.edit().remove("school").apply()
                            tickets = emptyList()
                            page = "login"
                        }
                    }) { Icon(Icons.Outlined.Logout, contentDescription = "Sign out", tint = Ink) }
                }
            }
        }
    }) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            if (error.isNotBlank()) Surface(Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 8.dp),
                color = Color(0xFFFFF0F0), shape = RoundedCornerShape(14.dp)) {
                Text(error, Modifier.padding(14.dp), color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodyMedium)
            }
            if (busy) LinearProgressIndicator(Modifier.fillMaxWidth())
            when (page) {
                "loading" -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
                "login" -> AuthShell("Your school, supported.", "Sign in with the mobile number registered at your school.") {
                    Text("WELCOME BACK", style = MaterialTheme.typography.labelSmall, color = Indigo, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(12.dp))
                    SupportField(school, { school = it.trim() }, "School code")
                    Spacer(Modifier.height(12.dp))
                    SupportField(phone, { phone = it.filter(Char::isDigit).take(10) }, "Mobile number")
                    Spacer(Modifier.height(20.dp))
                    PrimaryAction("Send WhatsApp code", !busy && school.isNotBlank() && phone.length == 10,
                        onClick = { run { api.sendCode(school, phone); page = "otp" } })
                }
                "otp" -> AuthShell("Check WhatsApp", "Enter the six-digit code sent to +91 ••••••" + phone.takeLast(4) + ".") {
                    Text("VERIFY MOBILE", style = MaterialTheme.typography.labelSmall, color = Indigo, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(12.dp))
                    SupportField(code, { code = it.filter(Char::isDigit).take(6) }, "Six-digit code")
                    Spacer(Modifier.height(20.dp))
                    PrimaryAction("Verify and continue", !busy && code.length == 6, onClick = { run {
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
                    } })
                    TextButton(onClick = { page = "login" }, modifier = Modifier.align(Alignment.CenterHorizontally)) { Text("Change number") }
                }
                "accounts" -> AuthShell("Choose an account", "Select how you want to work in " + school + ".") {
                    accounts.forEach { (id, label) ->
                        SurfaceCard(Modifier.fillMaxWidth().padding(bottom = 10.dp).clickable { run {
                            finishLogin(api.selectAccount(school, challenge, id).getString("token"))
                        } }) {
                            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                                Column(Modifier.weight(1f)) {
                                    Text(label.substringBefore(" · "), style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.SemiBold, color = Ink)
                                    Text(label.substringAfter(" · ", "School account").replace('_', ' '),
                                        style = MaterialTheme.typography.bodySmall, color = Muted)
                                }
                                Icon(Icons.Outlined.ChevronRight, contentDescription = null, tint = Muted)
                            }
                        }
                    }
                }
                "list" -> TicketDashboard(school, tickets, summary, busy,
                    onCreate = { page = "create" },
                    onRefresh = { run { loadTickets() } },
                    onTicket = { id -> run { loadDetail(id) } })
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
private fun TicketDashboard(school: String, tickets: List<TicketSummary>, summary: List<Int>, busy: Boolean,
    onCreate: () -> Unit, onRefresh: () -> Unit, onTicket: (String) -> Unit) {
    var filter by remember { mutableStateOf("All") }
    val visible = tickets.filter { ticket -> when (filter) {
        "Open" -> ticket.status == TicketStatus.OPEN || ticket.status == TicketStatus.REOPENED
        "Active" -> ticket.status in listOf(TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS, TicketStatus.WAITING)
        "Resolved" -> ticket.status == TicketStatus.RESOLVED || ticket.status == TicketStatus.CLOSED
        else -> true
    } }
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(start = 20.dp, end = 20.dp, bottom = 28.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)) {
        item {
            Column(Modifier.padding(top = 14.dp)) {
                Text("OVERVIEW · " + school.uppercase(), style = MaterialTheme.typography.labelSmall,
                    color = Indigo, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(5.dp))
                Text("Stay ahead of every issue.", style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold, color = Ink)
                Text("Your school support desk, all in one place.", color = Muted,
                    style = MaterialTheme.typography.bodyMedium)
            }
        }
        item {
            Box(Modifier.fillMaxWidth().background(
                Brush.linearGradient(listOf(Navy, Color(0xFF303E80), Violet)), RoundedCornerShape(24.dp))) {
                Column(Modifier.padding(22.dp)) {
                    Pill("SUPPORT DESK", Color(0xFFAFC4FF))
                    Spacer(Modifier.height(18.dp))
                    val activeTickets = summary[0] + summary[1]
                    Text("$activeTickets ${if (activeTickets == 1) "ticket needs" else "tickets need"} attention",
                        style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, color = Color.White)
                    Spacer(Modifier.height(5.dp))
                    Text("Capture a concern and keep the right people in the loop.",
                        style = MaterialTheme.typography.bodyMedium, color = Color(0xFFCDD8FF))
                    Spacer(Modifier.height(18.dp))
                    Button(onClick = onCreate, shape = RoundedCornerShape(13.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color.White, contentColor = Navy)) {
                        Icon(Icons.Outlined.Add, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Raise a ticket", fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }
        item {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    MetricCard("Open", summary[0], Indigo, Modifier.weight(1f))
                    MetricCard("In progress", summary[1], Color(0xFF3D71C9), Modifier.weight(1f))
                }
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    MetricCard("Urgent", summary[2], Color(0xFFD05F50), Modifier.weight(1f))
                    MetricCard("Resolved", summary[3], Color(0xFF1D9D73), Modifier.weight(1f))
                }
            }
        }
        item {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween) {
                SectionTitle("Tickets", "Follow progress and respond quickly")
                IconButton(onClick = onRefresh, enabled = !busy) {
                    Icon(Icons.Outlined.Refresh, contentDescription = "Refresh tickets", tint = Indigo)
                }
            }
        }
        item {
            Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("All", "Open", "Active", "Resolved").forEach { value ->
                    FilterChip(selected = filter == value, onClick = { filter = value }, label = { Text(value) },
                        shape = RoundedCornerShape(12.dp))
                }
            }
        }
        if (visible.isEmpty()) item {
            SurfaceCard(Modifier.fillMaxWidth()) {
                Text(if (tickets.isEmpty()) "No tickets yet" else "No " + filter.lowercase() + " tickets",
                    style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                Spacer(Modifier.height(4.dp))
                Text(if (tickets.isEmpty()) "Raise the first ticket to start tracking a concern."
                    else "Try another filter to see more tickets.", color = Muted)
            }
        }
        items(visible, key = { it.id }) { ticket -> TicketCard(ticket) { onTicket(ticket.id) } }
    }
}

@Composable
private fun MetricCard(label: String, value: Int, tint: Color, modifier: Modifier = Modifier) {
    SurfaceCard(modifier) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(10.dp).background(tint, CircleShape))
            Spacer(Modifier.width(10.dp))
            Text(value.toString(), style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold, color = Ink)
        }
        Spacer(Modifier.height(5.dp))
        Text(label, style = MaterialTheme.typography.bodySmall, color = Muted)
    }
}

@Composable
private fun TicketCard(ticket: TicketSummary, onClick: () -> Unit) {
    SurfaceCard(Modifier.fillMaxWidth().clickable(onClick = onClick)) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Top) {
            Column(Modifier.weight(1f)) {
                Text(ticket.ticketNo, style = MaterialTheme.typography.labelSmall,
                    color = Muted, fontWeight = FontWeight.SemiBold)
                Spacer(Modifier.height(6.dp))
                Text(ticket.subject, style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold, color = Ink, maxLines = 2, overflow = TextOverflow.Ellipsis)
            }
            Icon(Icons.Outlined.ChevronRight, contentDescription = null, tint = Muted)
        }
        ticket.studentName?.let {
            Spacer(Modifier.height(5.dp))
            Text("Student · " + it, style = MaterialTheme.typography.bodySmall, color = Muted,
                maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        Spacer(Modifier.height(14.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Pill(ticket.status.name.replace('_', ' '), statusTint(ticket.status.name))
            if (ticket.priority == TicketPriority.URGENT || ticket.priority == TicketPriority.HIGH)
                Pill(ticket.priority.name, priorityTint(ticket.priority.name))
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
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Spacer(Modifier.height(2.dp))
        SectionTitle("Tell us what happened", "Add the details your team needs to take action.")
        SurfaceCard(Modifier.fillMaxWidth()) {
            Text("ISSUE DETAILS", style = MaterialTheme.typography.labelSmall, color = Indigo,
                fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(12.dp))
            SupportField(subject, { subject = it }, "Subject")
            Spacer(Modifier.height(12.dp))
            SupportField(description, { description = it }, "Describe the issue", minLines = 4)
            Spacer(Modifier.height(16.dp))
            Text("Category", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(7.dp))
            OptionMenu(type.name.replace('_', ' '), TicketType.entries.map { it.name }) { type = TicketType.valueOf(it) }
            Spacer(Modifier.height(14.dp))
            Text("Priority", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(7.dp))
            OptionMenu(priority.name, TicketPriority.entries.map { it.name }) { priority = TicketPriority.valueOf(it) }
        }
        if (type == TicketType.STUDENT) {
            SurfaceCard(Modifier.fillMaxWidth()) {
                SectionTitle("Link a student", "Search by name or admission number")
                Spacer(Modifier.height(12.dp))
                SupportField(search, { search = it; selected = null }, "Student name or admission number")
                Spacer(Modifier.height(8.dp))
                OutlinedButton(onClick = { scope.launch {
                    try { options = api.searchStudents(school, search); searchError = "" }
                    catch (e: Exception) { searchError = e.message ?: "Search failed." }
                } }, enabled = search.length >= 2, modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(13.dp)) {
                    Icon(Icons.Outlined.Search, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("Find student")
                }
                if (searchError.isNotBlank()) Text(searchError, color = MaterialTheme.colorScheme.error)
                options.forEach { option ->
                    Row(Modifier.fillMaxWidth().clickable { selected = option; options = emptyList() }
                        .padding(vertical = 11.dp), verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(option.fullName, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
                            Text(option.admissionNo + (option.className?.let { " · " + it } ?: ""),
                                style = MaterialTheme.typography.bodySmall, color = Muted)
                        }
                        Icon(Icons.Outlined.ChevronRight, contentDescription = null, tint = Muted)
                    }
                }
                selected?.let {
                    Spacer(Modifier.height(8.dp))
                    Pill(it.fullName + " · " + it.admissionNo, Indigo)
                }
            }
        }
        PrimaryAction("Create ticket",
            !busy && subject.trim().length >= 3 && description.trim().length >= 10 &&
                (type != TicketType.STUDENT || selected != null),
            onClick = { submit(subject.trim(), description.trim(), type, priority, selected?.id) })
        Text("Your ticket will be visible to the support team at " + school + ".",
            style = MaterialTheme.typography.bodySmall, color = Muted)
        Spacer(Modifier.height(20.dp))
    }
}

@Composable
private fun TicketDetails(ticket: TicketDetail, admin: Boolean, busy: Boolean, staff: List<StaffOption>,
    onReply: (String) -> Unit, onStatus: (TicketStatus) -> Unit,
    onPriority: (TicketPriority) -> Unit, onAssign: (String?) -> Unit) {
    var reply by remember(ticket.id) { mutableStateOf("") }
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Spacer(Modifier.height(2.dp))
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(ticket.ticketNo, style = MaterialTheme.typography.labelSmall, color = Indigo,
                fontWeight = FontWeight.Bold)
            Text(ticket.subject, style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold, color = Ink)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Pill(ticket.status.replace('_', ' '), statusTint(ticket.status))
                Pill(ticket.priority, priorityTint(ticket.priority))
            }
        }
        ticket.studentName?.let { student -> SurfaceCard(Modifier.fillMaxWidth()) {
            Text("LINKED STUDENT", style = MaterialTheme.typography.labelSmall, color = Muted,
                fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(6.dp))
            Text(student, style = MaterialTheme.typography.titleMedium, color = Ink,
                fontWeight = FontWeight.SemiBold)
        } }
        SurfaceCard(Modifier.fillMaxWidth()) {
            SectionTitle("Issue", ticket.type.replace('_', ' ').lowercase().replaceFirstChar { it.uppercase() })
            Spacer(Modifier.height(12.dp))
            Text(ticket.description, style = MaterialTheme.typography.bodyLarge, color = Ink)
        }
        if (admin) SurfaceCard(Modifier.fillMaxWidth()) {
            SectionTitle("Manage ticket", "Keep ownership and progress clear")
            Spacer(Modifier.height(16.dp))
            Text("STATUS", style = MaterialTheme.typography.labelSmall, color = Muted, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(6.dp))
            OptionMenu(ticket.status.replace('_', ' '), TicketStatus.entries.map { it.name }) { onStatus(TicketStatus.valueOf(it)) }
            Spacer(Modifier.height(12.dp))
            Text("PRIORITY", style = MaterialTheme.typography.labelSmall, color = Muted, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(6.dp))
            OptionMenu(ticket.priority, TicketPriority.entries.map { it.name }) { onPriority(TicketPriority.valueOf(it)) }
            Spacer(Modifier.height(12.dp))
            Text("ASSIGNED TO", style = MaterialTheme.typography.labelSmall, color = Muted, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(6.dp))
            var staffMenu by remember { mutableStateOf(false) }
            Box {
                OutlinedButton(onClick = { staffMenu = true }, enabled = !busy,
                    modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(13.dp)) {
                    Text(ticket.assignedToName ?: "Unassigned", modifier = Modifier.weight(1f), color = Ink)
                    Icon(Icons.Outlined.ChevronRight, contentDescription = null, tint = Muted)
                }
                DropdownMenu(expanded = staffMenu, onDismissRequest = { staffMenu = false }) {
                    DropdownMenuItem(text = { Text("Unassigned") }, onClick = { staffMenu = false; onAssign(null) })
                    staff.forEach { person ->
                        DropdownMenuItem(text = { Text(person.name + " · " + person.role) },
                            onClick = { staffMenu = false; onAssign(person.id) })
                    }
                }
            }
        }
        SurfaceCard(Modifier.fillMaxWidth()) {
            SectionTitle("Conversation", ticket.messages.size.toString() + " replies")
            Spacer(Modifier.height(14.dp))
            if (ticket.messages.isEmpty()) Text("No replies yet. Start the conversation below.",
                style = MaterialTheme.typography.bodyMedium, color = Muted)
            ticket.messages.forEach { message ->
                Row(Modifier.fillMaxWidth().padding(bottom = 12.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Box(Modifier.size(30.dp).background(Indigo.copy(alpha = 0.12f), CircleShape),
                        contentAlignment = Alignment.Center) {
                        Text(message.author.take(1).uppercase(), color = Indigo, fontWeight = FontWeight.Bold)
                    }
                    Column(Modifier.weight(1f)) {
                        Text(message.author, style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.Bold, color = Ink)
                        Text(message.body, style = MaterialTheme.typography.bodyMedium, color = Ink)
                    }
                }
            }
            if (ticket.status != "CLOSED") {
                Spacer(Modifier.height(8.dp))
                SupportField(reply, { reply = it }, "Write a reply", minLines = 3)
                Spacer(Modifier.height(10.dp))
                PrimaryAction("Send reply", !busy && reply.isNotBlank(), onClick = { onReply(reply.trim()); reply = "" })
            }
        }
        Spacer(Modifier.height(20.dp))
    }
}

@Composable
private fun OptionMenu(selected: String, values: List<String>, choose: (String) -> Unit) {
    var open by remember { mutableStateOf(false) }
    Box(Modifier.fillMaxWidth()) {
        OutlinedButton(onClick = { open = true }, modifier = Modifier.fillMaxWidth().heightIn(min = 52.dp),
            shape = RoundedCornerShape(13.dp), border = BorderStroke(1.dp, Line)) {
            Text(selected, modifier = Modifier.weight(1f), color = Ink, fontWeight = FontWeight.SemiBold)
            Icon(Icons.Outlined.ChevronRight, contentDescription = null, tint = Muted)
        }
        DropdownMenu(expanded = open, onDismissRequest = { open = false }) {
            values.forEach { value -> DropdownMenuItem(text = { Text(value.replace('_', ' ')) }, onClick = { open = false; choose(value) }) }
        }
    }
}

@Composable
private fun AuthShell(title: String, subtitle: String, content: @Composable ColumnScope.() -> Unit) {
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 24.dp),
        verticalArrangement = Arrangement.spacedBy(0.dp)) {
        Spacer(Modifier.height(46.dp))
        BrandMark(Modifier.size(64.dp))
        Spacer(Modifier.height(18.dp))
        Text("SCHOOLDB  /  SUPPORT", style = MaterialTheme.typography.labelSmall,
            color = Indigo, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(10.dp))
        Text(title, style = MaterialTheme.typography.headlineLarge, color = Ink,
            fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(8.dp))
        Text(subtitle, style = MaterialTheme.typography.bodyLarge, color = Muted)
        Spacer(Modifier.height(30.dp))
        SurfaceCard(Modifier.fillMaxWidth(), content)
        Spacer(Modifier.height(30.dp))
        Text("Secure access for your school team", style = MaterialTheme.typography.bodySmall,
            color = Muted, modifier = Modifier.align(Alignment.CenterHorizontally))
        Spacer(Modifier.height(30.dp))
    }
}

@Composable
private fun SupportField(value: String, onValueChange: (String) -> Unit, label: String, minLines: Int = 1) {
    OutlinedTextField(value = value, onValueChange = onValueChange, label = { Text(label) },
        modifier = Modifier.fillMaxWidth(), minLines = minLines, singleLine = minLines == 1,
        shape = RoundedCornerShape(14.dp),
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = Indigo,
            unfocusedBorderColor = Line,
            focusedContainerColor = Color.White,
            unfocusedContainerColor = Color.White,
            focusedLabelColor = Indigo,
            unfocusedLabelColor = Muted,
        ))
}

@Composable
private fun PrimaryAction(label: String, enabled: Boolean, onClick: () -> Unit) {
    Button(onClick = onClick, enabled = enabled, modifier = Modifier.fillMaxWidth().heightIn(min = 54.dp),
        shape = RoundedCornerShape(14.dp), colors = ButtonDefaults.buttonColors(containerColor = Indigo)) {
        Text(label, fontWeight = FontWeight.SemiBold)
    }
}
