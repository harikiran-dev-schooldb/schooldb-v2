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
import androidx.core.content.FileProvider
import com.google.firebase.messaging.FirebaseMessaging
import java.util.UUID
import java.io.File
import java.net.HttpURLConnection
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
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.ChevronRight
import androidx.compose.material.icons.outlined.Dashboard
import androidx.compose.material.icons.outlined.ConfirmationNumber
import androidx.compose.material.icons.outlined.BarChart
import androidx.compose.material.icons.outlined.Person
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
import androidx.compose.ui.text.input.KeyboardType
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
    private val notificationSchool = mutableStateOf<String?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        notificationTicketId.value = intent.getStringExtra("ticketId")
        notificationSchool.value = intent.getStringExtra("schoolSlug")
        setContent { SupportTheme { SupportApp(notificationTicketId.value, notificationSchool.value) { notificationTicketId.value = null } } }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        notificationTicketId.value = intent.getStringExtra("ticketId")
        notificationSchool.value = intent.getStringExtra("schoolSlug")
    }
}

@Composable
private fun SupportApp(notificationTicketId: String?, notificationSchool: String?, onNotificationConsumed: () -> Unit) {
    val context = LocalContext.current
    val preferences = context.getSharedPreferences("support_session", 0)
    val api = remember { SupportRepository() }
    val ticketCache = remember { SupportTicketCache(context) }
    val ticketViewModel: SupportTicketViewModel = viewModel()
    val ticketState by ticketViewModel.state.collectAsStateWithLifecycle()
    val authViewModel: SupportAuthViewModel = viewModel()
    val authState by authViewModel.state.collectAsStateWithLifecycle()
    val adminViewModel: SupportAdminViewModel = viewModel()
    val adminState by adminViewModel.state.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope()
    val savedSchool = remember {
        preferences.getString("school", "").orEmpty()
    }
    LaunchedEffect(savedSchool) {
        authViewModel.initializeSchool(savedSchool)
    }
    val clerkInitialized by Clerk.isInitialized.collectAsStateWithLifecycle()
    val clerkUser by Clerk.userFlow.collectAsStateWithLifecycle()
    val clerkSession by Clerk.sessionFlow.collectAsStateWithLifecycle()
    val sessionReady = clerkInitialized && clerkSession?.status == com.clerk.api.session.Session.SessionStatus.ACTIVE
    var startupLoadFinished by remember(authState.school, clerkSession?.id) { mutableStateOf(false) }
    val school = authState.school
    val phone = authState.phone
    val code = authState.code
    var page by remember { mutableStateOf(SupportPage.LOADING) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf("") }
    var notice by remember { mutableStateOf("") }
    var dashboardTab by remember { mutableStateOf(DashboardTab.OVERVIEW) }
    var requestedTicketFilter by remember { mutableStateOf<String?>(null) }
    var signingOut by remember { mutableStateOf(false) }
    var showSignOutConfirmation by remember { mutableStateOf(false) }
    var accountProfile by remember(school) { mutableStateOf<SupportAccountProfile?>(null) }
    var profileLoading by remember(school) { mutableStateOf(false) }
    var profileError by remember(school) { mutableStateOf<String?>(null) }
    var switchAccounts by remember(school) { mutableStateOf<List<AccountSwitchChoice>>(emptyList()) }
    var switchAccountsLoading by remember(school) { mutableStateOf(false) }
    var switchAccountsError by remember(school) { mutableStateOf<String?>(null) }
    var switchingAccountId by remember(school) { mutableStateOf<String?>(null) }
    var ticketDraft by remember(school) { mutableStateOf(TicketDraft()) }
    val replyDrafts = remember(school) { mutableStateMapOf<String, String>() }
    var resendSeconds by remember { mutableIntStateOf(0) }
    var resumeVersion by remember { mutableIntStateOf(0) }
    val identitySchool = school.ifBlank { savedSchool }
    val identityCache = remember { SchoolIdentityCache(context) }
    var identity by remember(identitySchool) { mutableStateOf<SchoolIdentity?>(null) }
    var identityCacheLoaded by remember(identitySchool) { mutableStateOf(false) }
    var manualRefreshing by remember(school) { mutableStateOf(false) }
    LaunchedEffect(identitySchool) {
        identity = if (identitySchool.isNotBlank()) identityCache.read(identitySchool) else null
        identityCacheLoaded = true
    }
    var alertsEnabled by remember { mutableStateOf(true) }
    val lifecycleOwner = androidx.lifecycle.compose.LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner) {
        val observer = androidx.lifecycle.LifecycleEventObserver { _, event ->
            if (event == androidx.lifecycle.Lifecycle.Event.ON_RESUME) resumeVersion++
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }
    LaunchedEffect(school, clerkUser, resumeVersion, identityCacheLoaded) {
        alertsEnabled = androidx.core.app.NotificationManagerCompat.from(context).areNotificationsEnabled() &&
            (context.getSystemService(android.app.NotificationManager::class.java)
                .getNotificationChannel("support_tickets")?.importance != android.app.NotificationManager.IMPORTANCE_NONE)
        if (school.isNotBlank() && clerkUser != null && identityCacheLoaded) {
            try {
                val fresh = loadSchoolIdentity(school)
                identity = fresh
                identityCache.write(school, fresh)
            }
            catch (cancelled: CancellationException) { throw cancelled }
            catch (_: Exception) { /* Keep the last successfully loaded school identity. */ }
        }
    }

    LaunchedEffect(resendSeconds) {
        if (resendSeconds > 0) {
            delay(1_000)
            resendSeconds -= 1
        }
    }

    val notificationPermission = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted -> alertsEnabled = granted }
    LaunchedEffect(page, school, sessionReady, resumeVersion) {
        if (page == SupportPage.DASHBOARD && school.isNotBlank() && sessionReady &&
            BuildConfig.FIREBASE_CONFIGURED) {
            val pushPreferences = context.getSharedPreferences("support_push", 0)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
                !pushPreferences.getBoolean("permission_requested", false) &&
                ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
            ) {
                pushPreferences.edit().putBoolean("permission_requested", true).apply()
                notificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
            // A startup worker may have completed before login or may still be backing off
            // while Clerk restores its session. Replace it once the authenticated school is
            // known so this account is registered immediately, independent of ticket loading.
            com.schooldb.support.notifications.SupportPushSync.enqueue(context, replace = true)
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
        ticketCache.clear(school)
        preferences.edit().remove("school").apply()
        ticketViewModel.reset()
        adminViewModel.reset()
        authViewModel.clearCredentials()
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
            } catch (e: CancellationException) {
                throw e
            } catch (e: SupportSessionExpiredException) {
                handleSessionExpired()
            } catch (e: Exception) {
                error = e.message ?: "Request failed."
            } finally {
                busy = false
            }
        }
    }

    fun loadProfile() {
        if (profileLoading || school.isBlank()) return
        profileLoading = true
        profileError = null
        scope.launch {
            try {
                accountProfile = api.profile(school)
            } catch (e: SupportSessionExpiredException) {
                handleSessionExpired()
            } catch (e: Exception) {
                profileError = e.message ?: "Could not load your profile."
            } finally {
                profileLoading = false
            }
        }
    }

    fun loadSwitchAccounts() {
        if (switchAccountsLoading || school.isBlank()) return
        switchAccountsLoading = true
        switchAccountsError = null
        scope.launch {
            try {
                switchAccounts = api.switchAccounts(school)
            } catch (e: SupportSessionExpiredException) {
                handleSessionExpired()
            } catch (e: Exception) {
                switchAccountsError = e.message ?: "Could not load linked accounts."
            } finally {
                switchAccountsLoading = false
            }
        }
    }

    fun signOutNow() {
        if (signingOut) return
        signingOut = true
        page = SupportPage.LOGIN
        preferences.edit().remove("school").apply()
        context.getSystemService(android.app.NotificationManager::class.java).cancelAll()
        context.getSharedPreferences("support_push", 0).edit().putBoolean("delete_token", true).apply()
        scope.launch {
            val pushPreferences = context.getSharedPreferences("support_push", 0)
            try {
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
                api.signOut()
            } catch (exception: Exception) {
                Log.w("SupportAuth", "Remote sign out cleanup failed", exception)
            } finally {
                preferences.edit().remove("school").apply()
                ticketCache.clear(school)
                ticketViewModel.reset()
                adminViewModel.reset()
                authViewModel.clearAll()
                accountProfile = null
                switchAccounts = emptyList()
                ticketDraft = TicketDraft()
                replyDrafts.clear()
                dashboardTab = DashboardTab.OVERVIEW
                requestedTicketFilter = null
                com.schooldb.support.notifications.SupportPushSync.enqueue(context, replace = true)
                signingOut = false
                page = SupportPage.LOGIN
            }
        }
    }
    suspend fun loadTickets(
        filter: String = ticketState.filter,
        query: String = ticketState.query,
        targetPage: Int = ticketState.page,
    ) {
        ticketViewModel.loadTickets(school, filter, query, targetPage, ticketCache)
    }

    suspend fun loadDetail(id: String) {
        ticketViewModel.loadDetail(school, id)
        page = SupportPage.TICKET_DETAIL
    }

    suspend fun refreshTicketAfterMutation(id: String) {
        ticketViewModel.loadDetail(school, id)
        ticketViewModel.loadTickets(school, cache = ticketCache)
        ticketViewModel.invalidateAnalytics()
    }

    LaunchedEffect(page, dashboardTab, school, sessionReady) {
        if (page == SupportPage.DASHBOARD && dashboardTab == DashboardTab.PROFILE &&
            sessionReady
        ) {
            if (accountProfile == null && !profileLoading) loadProfile()
            if (switchAccounts.isEmpty() && !switchAccountsLoading) loadSwitchAccounts()
        }
    }

    val pushUpdate by com.schooldb.support.notifications.SupportMessagingService.updates.collectAsStateWithLifecycle()
    var refreshedEvent by remember(school) { mutableStateOf(resumeVersion to pushUpdate.second) }
    LaunchedEffect(resumeVersion, pushUpdate, page, busy, ticketState.ticketsLoading) {
        val event = resumeVersion to pushUpdate.second
        if (event == refreshedEvent || busy || signingOut || ticketState.ticketsLoading ||
            !ticketState.ticketsLoaded || Clerk.activeSession == null ||
            page !in listOf(SupportPage.DASHBOARD, SupportPage.TICKET_DETAIL)) return@LaunchedEffect
        refreshedEvent = event
        // Launch outside this effect so loading-state updates do not cancel the request.
        run {
            loadTickets()
            if (page == SupportPage.TICKET_DETAIL) ticketState.detail?.id?.let { ticketViewModel.loadDetail(school, it) }
            ticketViewModel.invalidateAnalytics()
            if (ticketState.isAdmin) ticketViewModel.loadAnalytics(school)
        }
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
        val ticketId = notificationTicketId ?: return@LaunchedEffect
        if (school.isBlank() || Clerk.activeSession == null ||
            page in listOf(SupportPage.LOADING, SupportPage.LOGIN, SupportPage.OTP, SupportPage.ACCOUNTS)
        ) return@LaunchedEffect
        if (notificationSchool != school) {
            onNotificationConsumed()
            return@LaunchedEffect
        }

        try {
            loadDetail(ticketId)
            onNotificationConsumed()
        } catch (e: SupportSessionExpiredException) {
            // Keep the ticket id pending so it can open after the user signs in again.
            handleSessionExpired()
        } catch (e: SupportApiException) {
            error = when (e.statusCode) {
                HttpURLConnection.HTTP_FORBIDDEN ->
                    "You do not have permission to open this support ticket."
                HttpURLConnection.HTTP_NOT_FOUND ->
                    "This support ticket is no longer available."
                else -> e.message
            }
            // Consume only terminal deep-link failures. Server errors can be retried.
            if (e.statusCode == HttpURLConnection.HTTP_FORBIDDEN ||
                e.statusCode == HttpURLConnection.HTTP_NOT_FOUND
            ) {
                onNotificationConsumed()
            }
        } catch (e: SupportNetworkException) {
            // Keep the ticket id pending. Retrying or reconnecting should still open it.
            error = e.message
        } catch (e: Exception) {
            error = e.message ?: "Could not open the ticket from the notification."
        }
    }

    suspend fun finishLogin(token: String) {
        api.activate(token)
        preferences.edit().putString("school", school).apply()
        ticketViewModel.reset()
        page = SupportPage.DASHBOARD
    }
    // Clerk initialization is asynchronous. Observe its restored user state instead of
    // reading activeSession once during process startup; this keeps the user signed in
    // after swiping the app away or rebooting the device.
    LaunchedEffect(clerkInitialized, clerkUser, school, signingOut) {
        if (signingOut) return@LaunchedEffect
        if (BuildConfig.CLERK_PUBLISHABLE_KEY.isBlank()) {
            error = "Configure CLERK_PUBLISHABLE_KEY before signing in."
            page = SupportPage.LOGIN
            return@LaunchedEffect
        }
        if (!clerkInitialized) {
            page = SupportPage.LOADING
            return@LaunchedEffect
        }
        page = if (school.isNotBlank() && clerkUser != null) SupportPage.DASHBOARD else SupportPage.LOGIN
    }
    LaunchedEffect(page, school, sessionReady) {
        if (page == SupportPage.DASHBOARD && school.isNotBlank() && !startupLoadFinished && sessionReady) {
            ticketViewModel.restoreCachedTickets(ticketCache, school)
            // Draw the dashboard before starting its first network request.
            withFrameNanos { }
            try {
                // Session restoration and token availability can finish separately.
                // Retry transient startup failures without requiring a pull gesture.
                for (attempt in 0..2) {
                    try {
                        loadTickets()
                        startupLoadFinished = true
                        break
                    } catch (network: SupportNetworkException) {
                        if (attempt == 2) throw network
                        delay(1_000L * (attempt + 1))
                    }
                }
            } catch (e: CancellationException) {
                throw e
            } catch (e: SupportSessionExpiredException) {
                handleSessionExpired()
            } catch (e: Exception) {
                startupLoadFinished = true
                if (!ticketViewModel.state.value.ticketsLoaded) {
                    error = e.message ?: "Could not load tickets. Pull down to retry."
                }
            }
        }
    }

    Scaffold(
        modifier = Modifier.fillMaxSize().background(Canvas).safeDrawingPadding(),
        containerColor = Canvas,
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
        bottomBar = {
            if (page == SupportPage.DASHBOARD) {
                SupportNavigationDock(dashboardTab.label) { label ->
                    dashboardTab = DashboardTab.entries.first { it.label == label }
                }
            }
        },
        topBar = {
        if (page in listOf(SupportPage.DASHBOARD, SupportPage.CREATE_TICKET, SupportPage.TICKET_DETAIL, SupportPage.ADMINS, SupportPage.ADMIN_FORM)) {
            SupportHeaderSurface {
                Row(Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Row(Modifier.weight(1f), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        if (page == SupportPage.DASHBOARD) SchoolIdentityMark(identity, Modifier.size(42.dp), loading = !identityCacheLoaded)
                        else Surface(shape = CircleShape, color = Canvas, border = BorderStroke(1.dp, Line)) {
                            IconButton(onClick = { page = if (page == SupportPage.ADMIN_FORM) SupportPage.ADMINS else SupportPage.DASHBOARD }, modifier = Modifier.size(42.dp)) {
                            Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back", tint = Ink)
                            }
                        }
                        Column {
                            Text((identity?.name ?: school).uppercase(), maxLines = 1, overflow = TextOverflow.Ellipsis,
                                style = MaterialTheme.typography.labelSmall, color = Muted, fontWeight = FontWeight.Bold)
                            Text(when (page) {
                                SupportPage.DASHBOARD -> if (dashboardTab == DashboardTab.PROFILE) "My Profile" else "Support Desk"
                                SupportPage.CREATE_TICKET -> "New ticket"
                                SupportPage.TICKET_DETAIL -> "Ticket details"
                                SupportPage.ADMINS -> "Administrators"
                                else -> if (adminState.selected == null) "Add administrator" else "Edit administrator"
                            },
                                style = MaterialTheme.typography.titleMedium, color = Ink, fontWeight = FontWeight.Bold)
                        }
                    }
                    if (page == SupportPage.DASHBOARD) IconButton(
                        onClick = { dashboardTab = DashboardTab.PROFILE },
                        modifier = Modifier.size(42.dp),
                    ) { Icon(Icons.Outlined.Person, contentDescription = "Open profile", tint = Muted) }
                }
            }
        }
    }) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            if (page == SupportPage.DASHBOARD && !alertsEnabled) {
                TextButton(onClick = {
                    context.startActivity(Intent(android.provider.Settings.ACTION_APP_NOTIFICATION_SETTINGS)
                        .putExtra(android.provider.Settings.EXTRA_APP_PACKAGE, context.packageName))
                }, modifier = Modifier.fillMaxWidth()) {
                    Text("Ticket alerts are off · Enable notifications")
                }
            }
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
            if (busy) LinearProgressIndicator(
                Modifier.fillMaxWidth().height(2.dp),
                color = Indigo,
                trackColor = Indigo.copy(alpha = 0.08f),
            )
            when (page) {
                SupportPage.LOADING -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        SchoolIdentityMark(identity, Modifier.size(68.dp), loading = !identityCacheLoaded)
                        Spacer(Modifier.height(18.dp))
                        CircularProgressIndicator(Modifier.size(28.dp), strokeWidth = 3.dp)
                        Spacer(Modifier.height(12.dp))
                        Text("Preparing your support desk", color = Muted, style = MaterialTheme.typography.bodyMedium)
                    }
                }
                SupportPage.LOGIN -> AuthShell("School Support", "Enter your school code and registered mobile number.") {
                    Text("YOUR SCHOOL", style = MaterialTheme.typography.labelSmall, color = Indigo, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(12.dp))
                    SupportField(school, authViewModel::setSchool, "School code", enabled = !busy && !signingOut)
                    Spacer(Modifier.height(16.dp))
                    SupportField(phone, authViewModel::setPhone, "Mobile number", keyboardType = KeyboardType.Phone,
                        enabled = !busy && !signingOut)
                    Spacer(Modifier.height(20.dp))
                    PrimaryAction("Send WhatsApp code", !busy && !signingOut && school.isNotBlank() && phone.length == 10,
                        onClick = { run { api.sendCode(school, phone); resendSeconds = 60; page = SupportPage.OTP } })
                }
                SupportPage.OTP -> AuthShell("Check WhatsApp", "Enter the six-digit code sent to +91 ••••••" + phone.takeLast(4) + ".") {
                    Text("VERIFY MOBILE", style = MaterialTheme.typography.labelSmall, color = Indigo, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(12.dp))
                    SupportField(code, authViewModel::setCode, "Six-digit code", keyboardType = KeyboardType.NumberPassword,
                        enabled = !busy)
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
                    Spacer(Modifier.height(8.dp))
                    TextButton(
                        onClick = { run { api.sendCode(school, phone); resendSeconds = 60 } },
                        enabled = !busy && resendSeconds == 0,
                        modifier = Modifier.align(Alignment.CenterHorizontally),
                    ) { Text(if (resendSeconds > 0) "Resend code in ${resendSeconds}s" else "Resend WhatsApp code") }
                    TextButton(onClick = { resendSeconds = 0; page = SupportPage.LOGIN }, modifier = Modifier.align(Alignment.CenterHorizontally)) { Text("Change number") }
                }
                SupportPage.ACCOUNTS -> AuthShell("Choose an account", "Select the account you want to use for this school.") {
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
                SupportPage.DASHBOARD -> if (dashboardTab == DashboardTab.PROFILE) {
                    SupportProfileScreen(
                        profile = accountProfile,
                        schoolIdentity = identity,
                        loading = profileLoading,
                        error = profileError,
                        alertsEnabled = alertsEnabled,
                        accounts = switchAccounts,
                        accountsLoading = switchAccountsLoading,
                        accountsError = switchAccountsError,
                        switchingAccountId = switchingAccountId,
                        onRetry = ::loadProfile,
                        onRefreshAccounts = ::loadSwitchAccounts,
                        onSwitchAccount = { account ->
                            if (!account.current && switchingAccountId == null) {
                                switchingAccountId = account.id
                                switchAccountsError = null
                                scope.launch {
                                    try {
                                        val token = api.switchAccount(school, account.id)
                                            ?: error("The server did not return an account session.")
                                        api.activate(token)
                                        accountProfile = null
                                        switchAccounts = emptyList()
                                        ticketViewModel.reset()
                                        adminViewModel.reset()
                                        ticketDraft = TicketDraft()
                                        replyDrafts.clear()
                                        dashboardTab = DashboardTab.OVERVIEW
                                        notice = "Account switched successfully."
                                    } catch (e: Exception) {
                                        switchAccountsError = e.message ?: "Account switch failed."
                                    } finally {
                                        switchingAccountId = null
                                    }
                                }
                            }
                        },
                        onNotificationSettings = {
                            context.startActivity(Intent(android.provider.Settings.ACTION_APP_NOTIFICATION_SETTINGS)
                                .putExtra(android.provider.Settings.EXTRA_APP_PACKAGE, context.packageName))
                        },
                        onSignOut = { showSignOutConfirmation = true },
                    )
                } else TicketDashboard(school, ticketState.tickets, ticketState.summary, ticketState.isAdmin, ticketState.canManageAdmins, ticketState.analytics,
                    ticketState.analyticsLoading, ticketState.analyticsError, busy, ticketState.ticketsLoading, ticketState.ticketsLoaded,
                    showingCachedData = ticketState.showingCachedData,
                    manualRefreshing = manualRefreshing,
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
                        if (!ticketState.ticketsLoading && !busy) run {
                            manualRefreshing = true
                            try {
                                ticketViewModel.invalidateAnalytics()
                                loadTickets()
                                if (ticketState.isAdmin) ticketViewModel.loadAnalytics(school, force = true)
                            } finally {
                                manualRefreshing = false
                            }
                        }
                    },
                    onTicket = { id -> run { loadDetail(id) } })
                SupportPage.CREATE_TICKET -> CreateTicket(
                    api,
                    school,
                    busy,
                    ticketDraft,
                    { ticketDraft = it },
                ) { subject, description, type, priority, studentId, attachment -> run {
                    val createdId = api.create(school, subject, description, type, priority, studentId)
                    notice = if (attachment == null) {
                        "Ticket created successfully."
                    } else {
                        try {
                            api.uploadAttachment(school, createdId, attachment)
                            "Ticket and attachment uploaded successfully."
                        } catch (exception: Exception) {
                            "Ticket created, but the attachment could not be uploaded: ${exception.message ?: "please try again"}"
                        }
                    }
                    ticketDraft = TicketDraft()
                    try {
                        loadDetail(createdId)
                        ticketViewModel.loadTickets(school, cache = ticketCache)
                        ticketViewModel.invalidateAnalytics()
                    } catch (_: Exception) {
                        page = SupportPage.DASHBOARD
                        loadTickets()
                    }
                } }
                SupportPage.TICKET_DETAIL -> ticketState.detail?.let { ticket -> TicketDetails(ticket, ticketState.isAdmin, busy, ticketState.staff,
                    reply = replyDrafts[ticket.id].orEmpty(),
                    onReplyChange = { replyDrafts[ticket.id] = it },
                    onReply = { body, isInternal -> run {
                        api.reply(school, ticket.id, body, isInternal)
                        replyDrafts.remove(ticket.id)
                        refreshTicketAfterMutation(ticket.id)
                    } },
                    onStatus = { status -> run { api.updateStatus(school, ticket.id, status); refreshTicketAfterMutation(ticket.id) } },
                    onPriority = { priority -> run { api.updatePriority(school, ticket.id, priority); refreshTicketAfterMutation(ticket.id) } },
                    onAssign = { userId -> run { api.assign(school, ticket.id, userId); refreshTicketAfterMutation(ticket.id) } },
                    onOpenAttachment = { attachment -> run {
                        val contents = api.downloadAttachment(school, ticket.id, attachment)
                        val directory = File(context.cacheDir, "support-attachments").apply { mkdirs() }
                        val safeName = attachment.name.replace(Regex("[^A-Za-z0-9._-]"), "_")
                            .ifBlank { "attachment" }
                        val file = File(directory, "${attachment.id}-$safeName")
                        file.writeBytes(contents)
                        val uri = FileProvider.getUriForFile(context, "${BuildConfig.APPLICATION_ID}.files", file)
                        context.startActivity(Intent(Intent.ACTION_VIEW).apply {
                            setDataAndType(uri, attachment.mimeType)
                            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                        })
                    } },
                    onAddAttachment = { attachment -> run {
                        api.uploadAttachment(school, ticket.id, attachment)
                        notice = "Attachment uploaded successfully."
                        refreshTicketAfterMutation(ticket.id)
                    } }) }
                SupportPage.ADMINS -> adminState.accounts?.let { result -> AdminAccountsScreen(result, busy,
                    onCreate = { adminViewModel.select(null); page = SupportPage.ADMIN_FORM },
                    onEdit = { adminViewModel.select(it); page = SupportPage.ADMIN_FORM },
                    onRefresh = { run { adminViewModel.setAccounts(api.adminAccounts(school)) } }) }
                SupportPage.ADMIN_FORM -> AdminAccountForm(adminState.selected, busy) { fullName, mobile, role, designation, active -> run {
                    val creatingAdmin = adminState.selected == null
                    api.saveAdminAccount(school, adminState.selected?.id, fullName, mobile, role, designation, active)
                    adminViewModel.setAccounts(api.adminAccounts(school))
                    page = SupportPage.ADMINS
                    notice = if (creatingAdmin) "Administrator account created." else "Administrator account updated."
                } }
            }
        }
    }

    if (showSignOutConfirmation) {
        AlertDialog(
            onDismissRequest = { showSignOutConfirmation = false },
            title = { Text("Sign out of School Support?") },
            text = { Text("You’ll need a new WhatsApp verification code to sign in again.") },
            confirmButton = {
                Button(
                    onClick = {
                        showSignOutConfirmation = false
                        signOutNow()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = SchoolRed),
                ) { Text("Sign out") }
            },
            dismissButton = {
                TextButton(onClick = { showSignOutConfirmation = false }) { Text("Cancel") }
            },
        )
    }
}
