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
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel

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
    val ticketViewModel: SupportTicketViewModel = viewModel()
    val ticketState by ticketViewModel.state.collectAsStateWithLifecycle()
    val authViewModel: SupportAuthViewModel = viewModel()
    val authState by authViewModel.state.collectAsStateWithLifecycle()
    val adminViewModel: SupportAdminViewModel = viewModel()
    val adminState by adminViewModel.state.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope()
    LaunchedEffect(Unit) {
        authViewModel.initializeSchool(preferences.getString("school", "").orEmpty())
    }
    val school = authState.school
    val phone = authState.phone
    val code = authState.code
    var page by remember { mutableStateOf(SupportPage.LOADING) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf("") }
    var notice by remember { mutableStateOf("") }
    var dashboardTab by remember { mutableStateOf(DashboardTab.OVERVIEW) }
    var requestedTicketFilter by remember { mutableStateOf<String?>(null) }

    val notificationPermission = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { }
    LaunchedEffect(page, school, ticketState.ticketsLoaded) {
        if (page == SupportPage.DASHBOARD && ticketState.ticketsLoaded && school.isNotBlank() && BuildConfig.FIREBASE_CONFIGURED) {
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

    BackHandler(enabled = page != SupportPage.LOGIN && (page != SupportPage.DASHBOARD || dashboardTab != DashboardTab.OVERVIEW)) {
    when {
        page == SupportPage.DASHBOARD && dashboardTab != DashboardTab.OVERVIEW -> dashboardTab = DashboardTab.OVERVIEW
        else -> when (page) {
        SupportPage.OTP -> page = SupportPage.LOGIN
        SupportPage.ACCOUNTS -> page = SupportPage.OTP
        SupportPage.CREATE_TICKET, SupportPage.TICKET_DETAIL, SupportPage.ADMINS -> page = SupportPage.DASHBOARD
        SupportPage.ADMIN_FORM -> page = SupportPage.ADMINS
        else -> page = SupportPage.DASHBOARD
    }
    }
}

    fun handleSessionExpired() {
        preferences.edit().remove("school").apply()
        ticketViewModel.reset()
        adminViewModel.reset()
        page = SupportPage.LOGIN
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
    suspend fun loadTickets(
        filter: String = ticketState.filter,
        query: String = ticketState.query,
        targetPage: Int = ticketState.page,
    ) {
        ticketViewModel.loadTickets(school, filter, query, targetPage)
    }

    suspend fun loadDetail(id: String) {
        ticketViewModel.loadDetail(school, id)
        page = SupportPage.TICKET_DETAIL
    }

    suspend fun refreshTicketAfterMutation(id: String) {
        ticketViewModel.loadDetail(school, id)
        ticketViewModel.loadTickets(school)
        ticketViewModel.invalidateAnalytics()
    }

    LaunchedEffect(page, school, ticketState.isAdmin) {
        if (page == SupportPage.DASHBOARD && ticketState.isAdmin && school.isNotBlank()) {
            try {
                ticketViewModel.loadAnalytics(school)
            } catch (e: SupportSessionExpiredException) {
                handleSessionExpired()
            }
        }
    }

    LaunchedEffect(page, school, ticketState.isAdmin) {
        if (page == SupportPage.TICKET_DETAIL && ticketState.isAdmin && school.isNotBlank()) {
            try {
                ticketViewModel.loadStaff(school)
            } catch (e: SupportSessionExpiredException) {
                handleSessionExpired()
            } catch (e: Exception) {
                error = e.message ?: "Could not load staff options."
            }
        }
    }

    LaunchedEffect(notificationTicketId, page, school) {
        val ticketId = notificationTicketId
        if (ticketId != null && school.isNotBlank() && Clerk.activeSession != null &&
            page !in listOf(SupportPage.LOADING, SupportPage.LOGIN, SupportPage.OTP, SupportPage.ACCOUNTS)) {
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
        ticketViewModel.reset()
        page = SupportPage.DASHBOARD
    }
    LaunchedEffect(Unit) {
        if (BuildConfig.CLERK_PUBLISHABLE_KEY.isBlank()) {
            error = "Configure CLERK_PUBLISHABLE_KEY before signing in."
            page = SupportPage.LOGIN
        } else {
            Clerk.isInitialized.first { it }
            if (Clerk.activeSession != null && school.isNotBlank()) {
                page = SupportPage.DASHBOARD
            } else page = SupportPage.LOGIN
        }
    }
    LaunchedEffect(page, school, ticketState.ticketsLoaded) {
        if (page == SupportPage.DASHBOARD && school.isNotBlank() && !ticketState.ticketsLoaded && Clerk.activeSession != null) {
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
                error = e.message ?: "Could not load ticketState.tickets. Pull down to retry."
            }
        }
    }

    Scaffold(
        modifier = Modifier.fillMaxSize().background(Canvas).safeDrawingPadding(),
        containerColor = Canvas,
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
        bottomBar = {
            if (page == SupportPage.DASHBOARD) {
                NavigationBar(containerColor = Color.White) {
                    listOf(
                        Triple("Overview", Icons.Outlined.Dashboard, "Overview"),
                        Triple("Tickets", Icons.Outlined.ConfirmationNumber, "Tickets"),
                        Triple("Analytics", Icons.Outlined.BarChart, "Analytics"),
                    ).forEach { (tab, icon, label) ->
                        NavigationBarItem(
                            selected = dashboardTab.label == tab,
                            onClick = { dashboardTab = DashboardTab.entries.first { it.label == tab } },
                            icon = { Icon(icon, contentDescription = label) },
                            label = { Text(label) },
                        )
                    }
                }
            }
        },
        topBar = {
        if (page in listOf(SupportPage.DASHBOARD, SupportPage.CREATE_TICKET, SupportPage.TICKET_DETAIL, SupportPage.ADMINS, SupportPage.ADMIN_FORM)) {
            Surface(color = Canvas) {
                Row(Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        if (page == SupportPage.DASHBOARD) BrandMark(Modifier.size(42.dp))
                        else IconButton(onClick = { page = if (page == SupportPage.ADMIN_FORM) SupportPage.ADMINS else SupportPage.DASHBOARD }, modifier = Modifier.size(42.dp)) {
                            Icon(Icons.Outlined.ArrowBack, contentDescription = "Back", tint = Ink)
                        }
                        Column {
                            Text(if (page == SupportPage.DASHBOARD) "SCHOOLDB" else "SCHOOL SUPPORT",
                                style = MaterialTheme.typography.labelSmall, color = Muted, fontWeight = FontWeight.Bold)
                            Text(when (page) {
                                SupportPage.DASHBOARD -> "Support desk"
                                SupportPage.CREATE_TICKET -> "New ticket"
                                SupportPage.TICKET_DETAIL -> "Ticket details"
                                SupportPage.ADMINS -> "Administrators"
                                else -> if (adminState.selected == null) "Add administrator" else "Edit administrator"
                            },
                                style = MaterialTheme.typography.titleMedium, color = Ink, fontWeight = FontWeight.Bold)
                        }
                    }
                    if (page == SupportPage.DASHBOARD) IconButton(onClick = {
                        if (page == SupportPage.DASHBOARD) run {
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
                            ticketViewModel.reset()
                            adminViewModel.reset()
                            page = SupportPage.LOGIN
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
                SupportPage.LOADING -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
                SupportPage.LOGIN -> AuthShell("Your school, supported.", "Sign in with the mobile number registered at your school.") {
                    Text("WELCOME BACK", style = MaterialTheme.typography.labelSmall, color = Indigo, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(12.dp))
                    SupportField(school, authViewModel::setSchool, "School code")
                    Spacer(Modifier.height(12.dp))
                    SupportField(phone, authViewModel::setPhone, "Mobile number")
                    Spacer(Modifier.height(20.dp))
                    PrimaryAction("Send WhatsApp code", !busy && school.isNotBlank() && phone.length == 10,
                        onClick = { run { api.sendCode(school, phone); page = SupportPage.OTP } })
                }
                SupportPage.OTP -> AuthShell("Check WhatsApp", "Enter the six-digit code sent to +91 ••••••" + phone.takeLast(4) + ".") {
                    Text("VERIFY MOBILE", style = MaterialTheme.typography.labelSmall, color = Indigo, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(12.dp))
                    SupportField(code, authViewModel::setCode, "Six-digit code")
                    Spacer(Modifier.height(20.dp))
                    PrimaryAction("Verify and continue", !busy && code.length == 6, onClick = { run {
                        val response = api.verifyCode(school, phone, code)
                        if (response.optBoolean("requiresAccountSelection")) {
                            val challenge = response.getString("challengeId")
                            val options = response.getJSONArray("accounts")
                            val accountOptions = (0 until options.length()).map { index ->
                                val item = options.getJSONObject(index)
                                item.getString("id") to (item.optString("name") + " · " + item.optString("role"))
                            }
                            authViewModel.setAccountSelection(challenge, accountOptions)
                            page = SupportPage.ACCOUNTS
                        } else finishLogin(response.getString("token"))
                    } })
                    TextButton(onClick = { page = SupportPage.LOGIN }, modifier = Modifier.align(Alignment.CenterHorizontally)) { Text("Change number") }
                }
                SupportPage.ACCOUNTS -> AuthShell("Choose an account", "Select how you want to work in " + school + ".") {
                    authState.accounts.forEach { (id, label) ->
                        SurfaceCard(Modifier.fillMaxWidth().padding(bottom = 10.dp).clickable { run {
                            finishLogin(api.selectAccount(school, authState.challenge, id).getString("token"))
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
                SupportPage.DASHBOARD -> TicketDashboard(school, ticketState.tickets, ticketState.summary, ticketState.isAdmin, ticketState.canManageAdmins, ticketState.analytics,
                    ticketState.analyticsLoading, ticketState.analyticsError, busy, ticketState.ticketsLoading, ticketState.ticketsLoaded,
                    selectedTab = dashboardTab.label,
                    query = ticketState.query,
                    page = ticketState.page,
                    total = ticketState.total,
                    totalPages = ticketState.totalPages,
                    onQueryChange = { ticketViewModel.setQuery(it) },
                    onSearch = {
                        ticketViewModel.setPage(1)
                        run { loadTickets(ticketState.filter, ticketState.query, 1) }
                    },
                    onPage = { nextPage ->
                        ticketViewModel.setPage(nextPage)
                        run { loadTickets(ticketState.filter, ticketState.query, nextPage) }
                    },
                    requestedFilter = requestedTicketFilter,
                    onFilterConsumed = { requestedTicketFilter = null },
                    onOpenQueue = { filter ->
                        requestedTicketFilter = filter
                        val apiFilter = when (filter) {
                            "Waiting > 2 days" -> "WAITING_OVERDUE"
                            "New today" -> "NEW_TODAY"
                            else -> filter.uppercase().replace(' ', '_')
                        }
                        ticketViewModel.setFilter(apiFilter)
                        dashboardTab = DashboardTab.TICKETS
                        run { loadTickets(apiFilter, ticketState.query, 1) }
                    },
                    onCreate = { page = SupportPage.CREATE_TICKET },
                    onManageAdmins = { run {
                        adminViewModel.setAccounts(api.adminAccounts(school))
                        page = SupportPage.ADMINS
                    } },
                    onRefresh = {
                        if (!ticketState.ticketsLoading) run {
                            ticketViewModel.invalidateAnalytics()
                            loadTickets()
                            if (ticketState.isAdmin) ticketViewModel.loadAnalytics(school, force = true)
                        }
                    },
                    onTicket = { id -> run { loadDetail(id) } })
                SupportPage.CREATE_TICKET -> CreateTicket(api, school, busy) { subject, description, type, priority, studentId -> run {
                    val createdId = api.create(school, subject, description, type, priority, studentId)
                    notice = "Ticket created successfully."
                    try {
                        loadDetail(createdId)
                        ticketViewModel.loadTickets(school)
                        ticketViewModel.invalidateAnalytics()
                    } catch (_: Exception) {
                        page = SupportPage.DASHBOARD
                        loadTickets()
                    }
                } }
                SupportPage.TICKET_DETAIL -> ticketState.detail?.let { ticket -> TicketDetails(ticket, ticketState.isAdmin, busy, ticketState.staff,
                    onReply = { body -> run { api.reply(school, ticket.id, body); refreshTicketAfterMutation(ticket.id) } },
                    onStatus = { status -> run { api.updateStatus(school, ticket.id, status); refreshTicketAfterMutation(ticket.id) } },
                    onPriority = { priority -> run { api.updatePriority(school, ticket.id, priority); refreshTicketAfterMutation(ticket.id) } },
                    onAssign = { userId -> run { api.assign(school, ticket.id, userId); refreshTicketAfterMutation(ticket.id) } }) }
                SupportPage.ADMINS -> adminState.accounts?.let { result -> AdminAccountsScreen(result, busy,
                    onCreate = { adminViewModel.select(null); page = SupportPage.ADMIN_FORM },
                    onEdit = { adminViewModel.select(it); page = SupportPage.ADMIN_FORM },
                    onRefresh = { run { adminViewModel.setAccounts(api.adminAccounts(school)) } }) }
                SupportPage.ADMIN_FORM -> AdminAccountForm(adminState.selected, busy) { fullName, mobile, role, active -> run {
                    api.saveAdminAccount(school, adminState.selected?.id, fullName, mobile, role, active)
                    adminViewModel.setAccounts(api.adminAccounts(school))
                        page = SupportPage.ADMINS
                    notice = if (adminState.selected == null) "Administrator account created." else "Administrator account updated."
                } }
            }
        }
    }
}

