package com.schooldb.support

import android.Manifest
import android.os.Build
import android.os.Bundle
import android.content.Intent
import android.net.Uri
import android.content.pm.PackageManager
import android.util.Log
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.core.content.ContextCompat
import com.google.firebase.messaging.FirebaseMessaging
import java.util.UUID
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
import androidx.compose.material.icons.outlined.Dashboard
import androidx.compose.material.icons.outlined.ConfirmationNumber
import androidx.compose.material.icons.outlined.BarChart
import androidx.compose.material.icons.outlined.Logout
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material.icons.outlined.QrCode2
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
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
import androidx.activity.compose.BackHandler

class MainActivity : ComponentActivity() {
    private val notificationTicketId = mutableStateOf<String?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        notificationTicketId.value = intent.getStringExtra("ticketId")
        setContent { SupportTheme { SupportApp(notificationTicketId.value) { notificationTicketId.value = null } } }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        notificationTicketId.value = intent.getStringExtra("ticketId")
    }
}

@Composable
private fun SupportApp(notificationTicketId: String?, onNotificationConsumed: () -> Unit) {
    val context = LocalContext.current
    val preferences = context.getSharedPreferences("support_session", 0)
    val api = remember { SupportRepository() }
    val scope = rememberCoroutineScope()
    var school by remember { mutableStateOf(preferences.getString("school", "").orEmpty()) }
    var phone by remember { mutableStateOf("") }
    var code by remember { mutableStateOf("") }
    var page by remember { mutableStateOf("loading") }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf("") }
    var notice by remember { mutableStateOf("") }
    var challenge by remember { mutableStateOf("") }
    var accounts by remember { mutableStateOf<List<Pair<String, String>>>(emptyList()) }
    var tickets by remember { mutableStateOf<List<TicketSummary>>(emptyList()) }
    var admin by remember { mutableStateOf(false) }
    var canManageAdmins by remember { mutableStateOf(false) }
    var adminAccounts by remember { mutableStateOf<AdminAccounts?>(null) }
    var selectedAdmin by remember { mutableStateOf<AdminAccount?>(null) }
    var summary by remember { mutableStateOf(listOf(0, 0, 0, 0)) }
    var detail by remember { mutableStateOf<TicketDetail?>(null) }
    var staff by remember { mutableStateOf<List<StaffOption>>(emptyList()) }
    var analytics by remember { mutableStateOf<SupportAnalytics?>(null) }
    var analyticsLoading by remember { mutableStateOf(false) }
    var analyticsError by remember { mutableStateOf<String?>(null) }
    var analyticsRefresh by remember { mutableIntStateOf(0) }
    var dashboardTab by remember { mutableStateOf("Overview") }
    var requestedTicketFilter by remember { mutableStateOf<String?>(null) }
    var serverTicketFilter by remember { mutableStateOf("ALL") }
    var ticketQuery by remember { mutableStateOf("") }
    var ticketPage by remember { mutableIntStateOf(1) }
    var ticketTotal by remember { mutableIntStateOf(0) }
    var ticketTotalPages by remember { mutableIntStateOf(1) }

    val notificationPermission = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { }
    LaunchedEffect(page, school) {
        if (page == "list" && school.isNotBlank() && BuildConfig.FIREBASE_CONFIGURED) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
                ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
            ) {
                notificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
            val pushPreferences = context.getSharedPreferences("support_push", 0)
            val installationId = pushPreferences.getString("installation_id", null)
                ?: UUID.randomUUID().toString().also {
                    pushPreferences.edit().putString("installation_id", it).apply()
                }
            FirebaseMessaging.getInstance().token.addOnSuccessListener { token ->
                Log.i("SupportPush", "Firebase token available; registering support device")
                pushPreferences.edit().putString("pending_fcm_token", token).apply()
                scope.launch {
                    try {
                        api.registerPushDevice(school, installationId, token)
                        Log.i("SupportPush", "Support device registered")
                        if (pushPreferences.getString("pending_fcm_token", null) == token) {
                            pushPreferences.edit().remove("pending_fcm_token").apply()
                        }
                    } catch (exception: Exception) {
                        Log.e("SupportPush", "Support device registration failed", exception)
                    }
                }
            }.addOnFailureListener { exception ->
                Log.e("SupportPush", "Firebase token request failed", exception)
            }
        }
    }

    BackHandler(enabled = page != "login" && (page != "list" || dashboardTab != "Overview")) {
    when {
        page == "list" && dashboardTab != "Overview" -> dashboardTab = "Overview"
        else -> when (page) {
        "otp" -> page = "login"
        "accounts" -> page = "otp"
        "create", "detail", "admins" -> page = "list"
        "adminForm" -> page = "admins"
        else -> page = "list"
    }
    }
}

    fun run(action: suspend () -> Unit) {
        if (busy) return
        busy = true
        error = ""
        notice = ""
        scope.launch {
            try { action() } catch (e: Exception) { error = e.message ?: "Request failed." }
            finally { busy = false }
        }
    }
    suspend fun loadTickets(filter: String = serverTicketFilter, query: String = ticketQuery, targetPage: Int = ticketPage) {
        val result = api.tickets(school, filter, query, targetPage)
        tickets = result.tickets
        ticketPage = result.page
        ticketTotal = result.total
        ticketTotalPages = result.totalPages
        admin = result.isAdmin
        canManageAdmins = result.canManageAdmins
        summary = listOf(result.open, result.inProgress, result.urgent, result.resolved)
        page = "list"
    }
    suspend fun loadDetail(id: String) {
        detail = api.detail(school, id)
        page = "detail"
    }
    LaunchedEffect(page, school, admin, analyticsRefresh) {
        if (page == "list" && admin && school.isNotBlank() && analytics == null) {
            analyticsLoading = true
            analyticsError = null
            try {
                analytics = api.analytics(school)
            } catch (e: Exception) {
                analyticsError = e.message ?: "Could not load analytics."
            } finally {
                analyticsLoading = false
            }
        }
    }
    LaunchedEffect(page, school, admin) {
        if (page == "detail" && admin && staff.isEmpty()) {
            try { staff = api.staff(school) }
            catch (e: Exception) { error = e.message ?: "Could not load staff options." }
        }
    }
    LaunchedEffect(notificationTicketId, page, school) {
        val ticketId = notificationTicketId
        if (ticketId != null && school.isNotBlank() && Clerk.activeSession != null &&
            page !in listOf("loading", "login", "otp", "accounts")) {
            try {
                loadDetail(ticketId)
                onNotificationConsumed()
            } catch (e: Exception) {
                error = e.message ?: "Could not open the ticket from the notification."
                onNotificationConsumed()
            }
        }
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
        bottomBar = {
            if (page == "list") {
                NavigationBar(containerColor = Color.White) {
                    listOf(
                        Triple("Overview", Icons.Outlined.Dashboard, "Overview"),
                        Triple("Tickets", Icons.Outlined.ConfirmationNumber, "Tickets"),
                        Triple("Analytics", Icons.Outlined.BarChart, "Analytics"),
                    ).forEach { (tab, icon, label) ->
                        NavigationBarItem(
                            selected = dashboardTab == tab,
                            onClick = { dashboardTab = tab },
                            icon = { Icon(icon, contentDescription = label) },
                            label = { Text(label) },
                        )
                    }
                }
            }
        },
        topBar = {
        if (page in listOf("list", "create", "detail", "admins", "adminForm")) {
            Surface(color = Canvas) {
                Row(Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        if (page == "list") BrandMark(Modifier.size(42.dp))
                        else IconButton(onClick = { page = if (page == "adminForm") "admins" else "list" }, modifier = Modifier.size(42.dp)) {
                            Icon(Icons.Outlined.ArrowBack, contentDescription = "Back", tint = Ink)
                        }
                        Column {
                            Text(if (page == "list") "SCHOOLDB" else "SCHOOL SUPPORT",
                                style = MaterialTheme.typography.labelSmall, color = Muted, fontWeight = FontWeight.Bold)
                            Text(when (page) {
                                "list" -> "Support desk"
                                "create" -> "New ticket"
                                "detail" -> "Ticket details"
                                "admins" -> "Administrators"
                                else -> if (selectedAdmin == null) "Add administrator" else "Edit administrator"
                            },
                                style = MaterialTheme.typography.titleMedium, color = Ink, fontWeight = FontWeight.Bold)
                        }
                    }
                    if (page == "list") IconButton(onClick = {
                        if (page == "list") run {
                            val pushPreferences = context.getSharedPreferences("support_push", 0)
                            pushPreferences.getString("installation_id", null)?.let { installationId ->
                                try { api.unregisterPushDevice(school, installationId) } catch (_: Exception) { }
                            }
                            api.signOut()
                            preferences.edit().remove("school").apply()
                            tickets = emptyList()
                            analytics = null
                            staff = emptyList()
                            adminAccounts = null
                            canManageAdmins = false
                            page = "login"
                        }
                    }) { Icon(Icons.Outlined.Logout, contentDescription = "Sign out", tint = Ink) }
                }
            }
        }
    }) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            if (notice.isNotBlank()) Surface(Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 8.dp),
                color = Color(0xFFE9F7EF), shape = RoundedCornerShape(14.dp)) {
                Text(notice, Modifier.padding(14.dp), color = Color(0xFF16704C),
                    style = MaterialTheme.typography.bodyMedium)
            }
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
                "list" -> TicketDashboard(school, tickets, summary, admin, canManageAdmins, analytics,
                    analyticsLoading, analyticsError, busy,
                    selectedTab = dashboardTab,
                    query = ticketQuery,
                    page = ticketPage,
                    total = ticketTotal,
                    totalPages = ticketTotalPages,
                    onQueryChange = { ticketQuery = it },
                    onSearch = {
                        ticketPage = 1
                        run { loadTickets(serverTicketFilter, ticketQuery, 1) }
                    },
                    onPage = { nextPage ->
                        ticketPage = nextPage
                        run { loadTickets(serverTicketFilter, ticketQuery, nextPage) }
                    },
                    requestedFilter = requestedTicketFilter,
                    onFilterConsumed = { requestedTicketFilter = null },
                    onOpenQueue = { filter ->
                        requestedTicketFilter = filter
                        ticketPage = 1
                        serverTicketFilter = when (filter) {
                            "Waiting > 2 days" -> "WAITING_OVERDUE"
                            "New today" -> "NEW_TODAY"
                            else -> filter.uppercase().replace(' ', '_')
                        }
                        dashboardTab = "Tickets"
                        run { loadTickets(serverTicketFilter, ticketQuery, 1) }
                    },
                    onCreate = { page = "create" },
                    onManageAdmins = { run {
                        adminAccounts = api.adminAccounts(school)
                        page = "admins"
                    } },
                    onRefresh = {
                        analytics = null
                        analyticsRefresh++
                        run { loadTickets() }
                    },
                    onTicket = { id -> run { loadDetail(id) } })
                "create" -> CreateTicket(api, school, busy) { subject, description, type, priority, studentId -> run {
                    val createdId = api.create(school, subject, description, type, priority, studentId)
                    notice = "Ticket created successfully."
                    try {
                        loadDetail(createdId)
                    } catch (_: Exception) {
                        page = "list"
                        loadTickets()
                    }
                } }
                "detail" -> detail?.let { ticket -> TicketDetails(ticket, admin, busy, staff,
                    onReply = { body -> run { api.reply(school, ticket.id, body); loadDetail(ticket.id) } },
                    onStatus = { status -> run { api.updateStatus(school, ticket.id, status); loadDetail(ticket.id) } },
                    onPriority = { priority -> run { api.updatePriority(school, ticket.id, priority); loadDetail(ticket.id) } },
                    onAssign = { userId -> run { api.assign(school, ticket.id, userId); loadDetail(ticket.id) } }) }
                "admins" -> adminAccounts?.let { result -> AdminAccountsScreen(result, busy,
                    onCreate = { selectedAdmin = null; page = "adminForm" },
                    onEdit = { selectedAdmin = it; page = "adminForm" },
                    onRefresh = { run { adminAccounts = api.adminAccounts(school) } }) }
                "adminForm" -> AdminAccountForm(selectedAdmin, busy) { fullName, mobile, role, active -> run {
                    api.saveAdminAccount(school, selectedAdmin?.id, fullName, mobile, role, active)
                    adminAccounts = api.adminAccounts(school)
                    page = "admins"
                    notice = if (selectedAdmin == null) "Administrator account created." else "Administrator account updated."
                } }
            }
        }
    }
}

@Composable
private fun TicketDashboard(school: String, tickets: List<TicketSummary>, summary: List<Int>,
    admin: Boolean, canManageAdmins: Boolean, analytics: SupportAnalytics?, analyticsLoading: Boolean,
    analyticsError: String?, busy: Boolean,
    selectedTab: String, query: String, page: Int, total: Int, totalPages: Int,
    onQueryChange: (String) -> Unit, onSearch: () -> Unit, onPage: (Int) -> Unit,
    requestedFilter: String?, onFilterConsumed: () -> Unit,
    onOpenQueue: (String) -> Unit,
    onCreate: () -> Unit, onManageAdmins: () -> Unit,
    onRefresh: () -> Unit, onTicket: (String) -> Unit) {
    val context = LocalContext.current
    var filter by remember { mutableStateOf("All") }
    LaunchedEffect(requestedFilter) {
        requestedFilter?.let {
            filter = it
            onFilterConsumed()
        }
    }
    val visible = tickets.filter { ticket -> when (filter) {
        "Open" -> ticket.status == TicketStatus.OPEN || ticket.status == TicketStatus.REOPENED
        "Active" -> ticket.status in listOf(TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS, TicketStatus.WAITING)
        "Waiting" -> ticket.status == TicketStatus.WAITING
        "Waiting > 2 days" -> ticket.status == TicketStatus.WAITING
        "Urgent" -> ticket.priority == TicketPriority.URGENT && ticket.status !in listOf(TicketStatus.RESOLVED, TicketStatus.CLOSED)
        "Unassigned" -> ticket.status in listOf(TicketStatus.OPEN, TicketStatus.REOPENED) &&
            ticket.status !in listOf(TicketStatus.RESOLVED, TicketStatus.CLOSED)
        "New today" -> true
        "Resolved" -> ticket.status == TicketStatus.RESOLVED || ticket.status == TicketStatus.CLOSED
        else -> true
    } }
    PullToRefreshBox(
        isRefreshing = busy,
        onRefresh = onRefresh,
        modifier = Modifier.fillMaxSize(),
    ) {
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(start = 20.dp, end = 20.dp, bottom = 28.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)) {
        if (selectedTab == "Overview") {

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
                    if (admin) {
                        Spacer(Modifier.height(8.dp))
                        TextButton(onClick = {
                            val url = BuildConfig.API_BASE_URL.trimEnd('/') + "/$school/parent-query/qr"
                            context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                        }) {
                            Icon(Icons.Outlined.QrCode2, contentDescription = null, tint = Color.White)
                            Spacer(Modifier.width(8.dp))
                            Text("Parent query QR", color = Color.White, fontWeight = FontWeight.SemiBold)
                        }
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
        if (canManageAdmins) item {
            SurfaceCard(Modifier.fillMaxWidth().clickable(onClick = onManageAdmins)) {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text("Manage administrators", style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold, color = Ink)
                        Spacer(Modifier.height(4.dp))
                        Text("Create and update school admin access", style = MaterialTheme.typography.bodySmall,
                            color = Muted)
                    }
                    Icon(Icons.Outlined.ChevronRight, contentDescription = null, tint = Indigo)
                }
            }
        }
        if (admin && analytics != null && selectedTab == "Overview") {
            item {
                SectionTitle("Needs attention", "School-wide issues requiring action")
            }
            item {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        MetricCard("Unassigned", analytics.attention.unassigned, Color(0xFFE58B2A), Modifier.weight(1f)) { onOpenQueue("Unassigned") }
                        MetricCard("Waiting > 2 days", analytics.attention.waitingOverTwoDays, Color(0xFFB16A2D), Modifier.weight(1f)) { onOpenQueue("Waiting > 2 days") }
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        MetricCard("New today", analytics.attention.newToday, Color(0xFF3D71C9), Modifier.weight(1f)) { onOpenQueue("New today") }
                        MetricCard("Urgent active", analytics.attention.urgent, Color(0xFFD05F50), Modifier.weight(1f)) { onOpenQueue("Urgent") }
                    }
                }
            }
            item {
                SectionTitle("This month", "Principal / Admin support performance")
            }
            item {
                SurfaceCard(Modifier.fillMaxWidth()) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        AnalyticsValue("Total", analytics.month.total.toString(), Modifier.weight(1f))
                        AnalyticsValue("Resolved", analytics.month.resolved.toString(), Modifier.weight(1f))
                        AnalyticsValue("Pending", analytics.month.pending.toString(), Modifier.weight(1f))
                    }
                    Spacer(Modifier.height(18.dp))
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        AnalyticsValue("Resolution", formatPercent(analytics.month.resolutionRate), Modifier.weight(1f))
                        AnalyticsValue("Avg. resolution", formatResolutionTime(analytics.month.averageResolutionHours), Modifier.weight(1f))
                    }
                }
            }
            if (analytics.byType.isNotEmpty()) {
                item {
                    SurfaceCard(Modifier.fillMaxWidth()) {
                        SectionTitle("Issues by category", "Tickets created this month")
                        Spacer(Modifier.height(14.dp))
                        analytics.byType.forEach { category ->
                            AnalyticsRow(category.type.replace('_', ' ').lowercase().replaceFirstChar { it.uppercase() }, category.count.toString())
                        }
                    }
                }
            }
            if (analytics.staffWorkload.isNotEmpty()) {
                item {
                    SurfaceCard(Modifier.fillMaxWidth()) {
                        SectionTitle("Staff workload", "Currently active assigned tickets")
                        Spacer(Modifier.height(14.dp))
                        analytics.staffWorkload.forEach { person ->
                            AnalyticsRow(person.name, person.active.toString() + " active")
                        }
                    }
                }
            }
        }

        }
        if (selectedTab == "Analytics") {
            item {
                Column(Modifier.padding(top = 14.dp)) {
                    Text("ANALYTICS · " + school.uppercase(), style = MaterialTheme.typography.labelSmall,
                        color = Indigo, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(5.dp))
                    Text("Support performance", style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold, color = Ink)
                    Text("School-wide ticket trends, workload and resolution performance.",
                        color = Muted, style = MaterialTheme.typography.bodyMedium)
                }
            }
            if (!admin) {
                item {
                    SurfaceCard(Modifier.fillMaxWidth()) {
                        Text("Analytics is available to Principal and School Admin accounts.",
                            style = MaterialTheme.typography.bodyMedium, color = Muted)
                    }
                }
            } else if (analytics == null) {
                item {
                    SurfaceCard(Modifier.fillMaxWidth()) {
                        Text(if (analyticsLoading) "Loading analytics…" else "Analytics is not available yet.",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold, color = Ink)
                        Spacer(Modifier.height(4.dp))
                        Text(analyticsError ?: if (analyticsLoading) "Your tickets are ready while we load school insights."
                            else "Pull down to retry.",
                            style = MaterialTheme.typography.bodyMedium, color = Muted)
                    }
                }
            } else {
                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        MetricCard("Total this month", analytics.month.total, Indigo, Modifier.weight(1f))
                        MetricCard("Pending", analytics.month.pending, Color(0xFFE58B2A), Modifier.weight(1f))
                    }
                }
                item {
                    SurfaceCard(Modifier.fillMaxWidth()) {
                        SectionTitle("Resolution performance", "This month")
                        Spacer(Modifier.height(14.dp))
                        Row(Modifier.fillMaxWidth()) {
                            AnalyticsValue("Resolved", analytics.month.resolved.toString(), Modifier.weight(1f))
                            AnalyticsValue("Resolution rate", formatPercent(analytics.month.resolutionRate), Modifier.weight(1f))
                        }
                        Spacer(Modifier.height(18.dp))
                        AnalyticsValue("Average resolution", formatResolutionTime(analytics.month.averageResolutionHours))
                    }
                }
                item {
                    SectionTitle("Attention queue", "Current school-wide workload")
                }
                item {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            MetricCard("Urgent", analytics.attention.urgent, Color(0xFFD05F50), Modifier.weight(1f)) { onOpenQueue("Urgent") }
                            MetricCard("Unassigned", analytics.attention.unassigned, Color(0xFFE58B2A), Modifier.weight(1f)) { onOpenQueue("Unassigned") }
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            MetricCard("Waiting > 2 days", analytics.attention.waitingOverTwoDays, Color(0xFFB16A2D), Modifier.weight(1f)) { onOpenQueue("Waiting > 2 days") }
                            MetricCard("New today", analytics.attention.newToday, Color(0xFF3D71C9), Modifier.weight(1f)) { onOpenQueue("New today") }
                        }
                    }
                }
                if (analytics.byType.isNotEmpty()) {
                    item {
                        SurfaceCard(Modifier.fillMaxWidth()) {
                            SectionTitle("Tickets by category", "Created this month")
                            Spacer(Modifier.height(12.dp))
                            analytics.byType.forEach { category ->
                                AnalyticsRow(category.type.replace('_', ' ').lowercase().replaceFirstChar { it.uppercase() },
                                    category.count.toString())
                            }
                        }
                    }
                }
                if (analytics.staffWorkload.isNotEmpty()) {
                    item {
                        SurfaceCard(Modifier.fillMaxWidth()) {
                            SectionTitle("Staff workload", "Active assigned tickets")
                            Spacer(Modifier.height(12.dp))
                            analytics.staffWorkload.forEach { person ->
                                AnalyticsRow(person.name, person.active.toString() + " active")
                            }
                        }
                    }
                }
            }
        }

        if (selectedTab == "Tickets") {
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
            SurfaceCard(Modifier.fillMaxWidth()) {
                Text("Search tickets", style = MaterialTheme.typography.labelLarge,
                    color = Ink, fontWeight = FontWeight.SemiBold)
                Spacer(Modifier.height(8.dp))
                Row(verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = query,
                        onValueChange = onQueryChange,
                        modifier = Modifier.weight(1f),
                        singleLine = true,
                        placeholder = { Text("Ticket no, subject, student...") },
                        shape = RoundedCornerShape(13.dp),
                    )
                    IconButton(onClick = onSearch, enabled = !busy) {
                        Icon(Icons.Outlined.Search, contentDescription = "Search", tint = Indigo)
                    }
                }
                Text("$total tickets", style = MaterialTheme.typography.bodySmall, color = Muted)
            }
        }
        item {
            Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("All", "Open", "Active", "Waiting", "Urgent", "Resolved").forEach { value ->
                    FilterChip(selected = filter == value, onClick = { onOpenQueue(value) }, label = { Text(value) },
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
        item {
            SurfaceCard(Modifier.fillMaxWidth()) {
                Text(
                    "Showing ${visible.size} of $total tickets · Page $page of ${totalPages.coerceAtLeast(1)}",
                    style = MaterialTheme.typography.bodySmall,
                    color = Muted,
                )
                if (totalPages > 1) {
                    Spacer(Modifier.height(10.dp))
                    Row(Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically) {
                        OutlinedButton(onClick = { onPage(page - 1) },
                            enabled = !busy && page > 1) { Text("Previous") }
                        Text("$page / $totalPages", style = MaterialTheme.typography.bodyMedium,
                            color = Ink, fontWeight = FontWeight.SemiBold)
                        OutlinedButton(onClick = { onPage(page + 1) },
                            enabled = !busy && page < totalPages) { Text("Next") }
                    }
                }
            }
        }
        }
    }
    }
}

@Composable
private fun MetricCard(label: String, value: Int, tint: Color, modifier: Modifier = Modifier, onClick: (() -> Unit)? = null) {
    val cardModifier = if (onClick != null) modifier.clickable(onClick = onClick) else modifier
    SurfaceCard(cardModifier) {
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
private fun AnalyticsValue(label: String, value: String, modifier: Modifier = Modifier) {
    Column(modifier) {
        Text(value, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = Ink)
        Text(label, style = MaterialTheme.typography.bodySmall, color = Muted)
    }
}

@Composable
private fun AnalyticsRow(label: String, value: String) {
    Row(Modifier.fillMaxWidth().padding(vertical = 7.dp),
        horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
        Text(label, style = MaterialTheme.typography.bodyMedium, color = Ink)
        Text(value, style = MaterialTheme.typography.bodyMedium, color = Indigo, fontWeight = FontWeight.Bold)
    }
}

private fun formatPercent(value: Double): String =
    if (value % 1.0 == 0.0) value.toInt().toString() + "%" else String.format("%.1f%%", value)

private fun formatResolutionTime(hours: Double?): String {
    if (hours == null) return "—"
    return if (hours >= 24) {
        val days = hours / 24.0
        if (days % 1.0 == 0.0) days.toInt().toString() + " days" else String.format("%.1f days", days)
    } else {
        if (hours % 1.0 == 0.0) hours.toInt().toString() + " hrs" else String.format("%.1f hrs", hours)
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
            if (ticket.source == "PARENT_QR") Pill("PARENT QUERY", Indigo)
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
            OptionMenu(type.name.replace('_', ' '), TicketType.entries.map { it.name }) {
                type = TicketType.valueOf(it)
                if (type != TicketType.STUDENT) {
                    selected = null
                    options = emptyList()
                    searchError = ""
                }
            }
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
                            Text(
                                buildList {
                                    add(option.admissionNo)
                                    option.academicYearName?.let(::add)
                                    option.className?.let { className ->
                                        add(className + (option.sectionName?.let { " · " + it } ?: ""))
                                    }
                                }.joinToString(" · "),
                                style = MaterialTheme.typography.bodySmall,
                                color = Muted
                            )
                        }
                        Icon(Icons.Outlined.ChevronRight, contentDescription = null, tint = Muted)
                    }
                }
                selected?.let {
                    Spacer(Modifier.height(8.dp))
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Pill(it.fullName + " · " + it.admissionNo, Indigo)
                        Text(
                            listOfNotNull(
                                it.academicYearName,
                                it.className?.let { className ->
                                    className + (it.sectionName?.let { section -> " · " + section } ?: "")
                                }
                            ).joinToString(" · "),
                            style = MaterialTheme.typography.bodySmall,
                            color = Muted
                        )
                    }
                }
            }
        }
        val missingField = when {
            subject.trim().length < 3 -> "Enter a subject with at least 3 characters."
            description.trim().length < 10 -> "Describe the issue in at least 10 characters."
            type == TicketType.STUDENT && selected == null -> "Find and select a student to continue."
            else -> null
        }
        if (missingField != null) Text(missingField, color = Muted,
            style = MaterialTheme.typography.bodySmall)
        PrimaryAction("Create ticket", !busy && missingField == null,
            onClick = { submit(subject.trim(), description.trim(), type, priority,
                selected?.id?.takeIf { type == TicketType.STUDENT }) })
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
                if (ticket.source == "PARENT_QR") Pill("PARENT QUERY", Indigo)
            }
        }
        if (ticket.source == "PARENT_QR") SurfaceCard(Modifier.fillMaxWidth()) {
            SectionTitle("Submitted by parent", "Received from the school's QR form")
            ticket.parentName?.let { Text(it, color = Ink) }
            ticket.parentPhone?.let { Text("Follow-up phone: $it", color = Ink) }
            if (ticket.parentPhone == null) Text("No follow-up number was provided.", color = Muted)
        }
        ticket.studentName?.let { student -> SurfaceCard(Modifier.fillMaxWidth()) {
            Text("LINKED STUDENT", style = MaterialTheme.typography.labelSmall, color = Muted,
                fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(6.dp))
            Text(
                student + listOfNotNull(ticket.studentClassName, ticket.studentSectionName)
                    .takeIf { it.isNotEmpty() }
                    ?.joinToString(" - ", prefix = " (", postfix = ")").orEmpty(),
                style = MaterialTheme.typography.titleMedium,
                color = Ink,
                fontWeight = FontWeight.SemiBold
            )
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
        if (ticket.activities.isNotEmpty()) {
            SurfaceCard(Modifier.fillMaxWidth()) {
                SectionTitle("Activity", ticket.activities.size.toString() + " updates")
                Spacer(Modifier.height(14.dp))
                ticket.activities.asReversed().forEach { activity ->
                    Row(Modifier.fillMaxWidth().padding(bottom = 14.dp),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Box(Modifier.size(10.dp).padding(top = 5.dp).background(Indigo, CircleShape))
                        Column(Modifier.weight(1f)) {
                            Text(activity.detail, style = MaterialTheme.typography.bodyMedium,
                                color = Ink, fontWeight = FontWeight.Medium)
                            Text(activity.actor, style = MaterialTheme.typography.bodySmall, color = Muted)
                        }
                    }
                }
            }
        }
        SurfaceCard(Modifier.fillMaxWidth()) {
            SectionTitle(
                if (ticket.source == "PARENT_QR") "Internal notes" else "Conversation",
                ticket.messages.size.toString() + " replies"
            )
            Spacer(Modifier.height(14.dp))
            if (ticket.messages.isEmpty()) Text(if (ticket.source == "PARENT_QR")
                "No notes yet. Use the follow-up number above to contact the parent."
                else "No replies yet. Start the conversation below.",
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
                SupportField(reply, { reply = it }, if (ticket.source == "PARENT_QR") "Write an internal note" else "Write a reply", minLines = 3)
                Spacer(Modifier.height(10.dp))
                PrimaryAction(if (ticket.source == "PARENT_QR") "Add internal note" else "Send reply",
                    !busy && reply.isNotBlank(), onClick = { onReply(reply.trim()); reply = "" })
            }
        }
        Spacer(Modifier.height(20.dp))
    }
}

@Composable
private fun AdminAccountsScreen(result: AdminAccounts, busy: Boolean,
    onCreate: () -> Unit, onEdit: (AdminAccount) -> Unit, onRefresh: () -> Unit) {
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Spacer(Modifier.height(2.dp))
        SectionTitle("School administrators", "Manage who can lead and respond to school issues.")
        PrimaryAction("Add administrator", !busy, onCreate)
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically) {
            Text("${result.accounts.size} accounts", style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold, color = Ink)
            TextButton(onClick = onRefresh, enabled = !busy) { Text("Refresh") }
        }
        result.accounts.forEach { account ->
            val ownAccount = account.userId == result.actorUserId
            SurfaceCard(Modifier.fillMaxWidth().then(if (ownAccount) Modifier else Modifier.clickable { onEdit(account) })) {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text(account.fullName, style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold, color = Ink)
                        Spacer(Modifier.height(4.dp))
                        Text(account.phone, style = MaterialTheme.typography.bodySmall, color = Muted)
                    }
                    if (!ownAccount) Icon(Icons.Outlined.ChevronRight, contentDescription = "Edit administrator", tint = Indigo)
                }
                Spacer(Modifier.height(12.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Pill(if (account.role == "SUPER_ADMIN") "Super Admin" else "School Admin", Indigo)
                    Pill(if (account.isActive) "Active" else "Disabled",
                        if (account.isActive) Color(0xFF15976C) else Muted)
                }
                if (ownAccount) {
                    Spacer(Modifier.height(8.dp))
                    Text("Your account", style = MaterialTheme.typography.bodySmall, color = Muted)
                }
            }
        }
        Spacer(Modifier.height(20.dp))
    }
}

@Composable
private fun AdminAccountForm(account: AdminAccount?, busy: Boolean,
    onSave: (String, String, String, Boolean) -> Unit) {
    var fullName by remember(account?.id) { mutableStateOf(account?.fullName.orEmpty()) }
    var phone by remember(account?.id) { mutableStateOf(account?.phone?.filter(Char::isDigit)?.takeLast(10).orEmpty()) }
    var role by remember(account?.id) { mutableStateOf(account?.role ?: "SCHOOL_ADMIN") }
    var active by remember(account?.id) { mutableStateOf(account?.isActive ?: true) }
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Spacer(Modifier.height(2.dp))
        SectionTitle(if (account == null) "Create administrator" else "Update administrator",
            "This account signs in with a WhatsApp code sent to its mobile number.")
        SurfaceCard(Modifier.fillMaxWidth()) {
            Text("ACCOUNT DETAILS", style = MaterialTheme.typography.labelSmall,
                color = Indigo, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(14.dp))
            SupportField(fullName, { fullName = it }, "Full name")
            Spacer(Modifier.height(12.dp))
            SupportField(phone, { phone = it.filter(Char::isDigit).take(10) }, "10-digit mobile number")
            Spacer(Modifier.height(16.dp))
            Text("Access role", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(7.dp))
            OptionMenu(if (role == "SUPER_ADMIN") "Super Admin" else "School Admin",
                listOf("SUPER_ADMIN", "SCHOOL_ADMIN")) { role = it }
            Spacer(Modifier.height(8.dp))
            Text(if (role == "SUPER_ADMIN") "Full school access, including administrator management."
                else "School administration and support ticket access.",
                style = MaterialTheme.typography.bodySmall, color = Muted)
            if (account != null) {
                Spacer(Modifier.height(18.dp))
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween) {
                    Column {
                        Text("Account active", style = MaterialTheme.typography.labelLarge,
                            fontWeight = FontWeight.SemiBold, color = Ink)
                        Text("Disabled accounts cannot sign in", style = MaterialTheme.typography.bodySmall, color = Muted)
                    }
                    Switch(checked = active, onCheckedChange = { active = it })
                }
            }
        }
        val validPhone = phone.length == 10 && phone.firstOrNull() in '6'..'9'
        if (fullName.trim().length < 2 || !validPhone) {
            Text("Enter a name and valid 10-digit mobile number to continue.",
                style = MaterialTheme.typography.bodySmall, color = Muted)
        }
        PrimaryAction(if (account == null) "Create administrator" else "Save changes",
            !busy && fullName.trim().length >= 2 && validPhone) {
            onSave(fullName.trim(), phone, role, active)
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
