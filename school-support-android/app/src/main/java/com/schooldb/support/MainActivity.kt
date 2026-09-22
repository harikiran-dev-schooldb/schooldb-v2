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
import kotlinx.coroutines.delay
import kotlinx.coroutines.CancellationException
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
    var ticketsLoading by remember { mutableStateOf(false) }
    var ticketsLoaded by remember { mutableStateOf(false) }
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
    LaunchedEffect(page, school, ticketsLoaded) {
        if (page == "list" && ticketsLoaded && school.isNotBlank() && BuildConfig.FIREBASE_CONFIGURED) {
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

    fun handleSessionExpired() {
        preferences.edit().remove("school").apply()
        tickets = emptyList()
        ticketsLoaded = false
        ticketsLoading = false
        analytics = null
        staff = emptyList()
        adminAccounts = null
        canManageAdmins = false
        admin = false
        detail = null
        summary = listOf(0, 0, 0, 0)
        page = "login"
        error = "Your session has expired. Please sign in again."
    }

    fun run(action: suspend () -> Unit) {
        if (busy) return
        busy = true
        error = ""
        notice = ""
        scope.launch {
            try {
                action()
            } catch (e: SupportSessionExpiredException) {
                handleSessionExpired()
            } catch (e: Exception) {
                error = e.message ?: "Request failed."
            } finally {
                busy = false
            }
        }
    }
    suspend fun loadTickets(filter: String = serverTicketFilter, query: String = ticketQuery, targetPage: Int = ticketPage) {
        ticketsLoading = true
        try {
            val result = api.tickets(school, filter, query, targetPage)
            tickets = result.tickets
            ticketPage = result.page
            ticketTotal = result.total
            ticketTotalPages = result.totalPages
            admin = result.isAdmin
            canManageAdmins = result.canManageAdmins
            summary = listOf(result.open, result.inProgress, result.urgent, result.resolved)
            ticketsLoaded = true
        } finally {
            ticketsLoading = false
        }
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
        ticketsLoaded = false
        page = "list"
    }
    LaunchedEffect(Unit) {
        if (BuildConfig.CLERK_PUBLISHABLE_KEY.isBlank()) {
            error = "Configure CLERK_PUBLISHABLE_KEY before signing in."
            page = "login"
        } else {
            Clerk.isInitialized.first { it }
            if (Clerk.activeSession != null && school.isNotBlank()) {
                page = "list"
            } else page = "login"
        }
    }
    LaunchedEffect(page, school, ticketsLoaded) {
        if (page == "list" && school.isNotBlank() && !ticketsLoaded && Clerk.activeSession != null) {
            // Draw the dashboard before starting its first network request.
            withFrameNanos { }
            delay(50)
            try {
                loadTickets()
            } catch (e: CancellationException) {
                throw e
            } catch (e: SupportSessionExpiredException) {
                handleSessionExpired()
            } catch (e: Exception) {
                error = e.message ?: "Could not load tickets. Pull down to retry."
            }
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
                                try {
                                    api.unregisterPushDevice(school, installationId)
                                    pushPreferences.edit()
                                        .remove("pending_unregister_school")
                                        .remove("pending_unregister_installation_id")
                                        .apply()
                                } catch (_: Exception) {
                                    pushPreferences.edit()
                                        .putString("pending_unregister_school", school)
                                        .putString("pending_unregister_installation_id", installationId)
                                        .apply()
                                }
                            }
                            FirebaseMessaging.getInstance().deleteToken()
                                .addOnFailureListener { exception ->
                                    Log.w("SupportPush", "Could not delete Firebase token during sign out", exception)
                                }
                            pushPreferences.edit().remove("pending_fcm_token").apply()
                            api.signOut()
                            preferences.edit().remove("school").apply()
                            tickets = emptyList()
                            ticketsLoaded = false
                            ticketsLoading = false
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
                    analyticsLoading, analyticsError, busy, ticketsLoading, ticketsLoaded,
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
                        if (!ticketsLoading) run { loadTickets() }
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
