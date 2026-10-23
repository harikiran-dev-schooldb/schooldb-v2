package com.schooldb.mobile.ui

import android.Manifest
import android.app.Activity
import android.app.KeyguardManager
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.provider.Settings
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.School
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.viewmodel.compose.viewModel
import com.schooldb.mobile.R
import com.schooldb.mobile.auth.AuthStep
import com.schooldb.mobile.auth.AuthViewModel
import com.schooldb.mobile.auth.AccountSwitchScreen
import com.schooldb.mobile.auth.SchoolAccount
import com.schooldb.mobile.teacher.TeacherDashboardScreen
import com.schooldb.mobile.notifications.PushNotificationManager
import com.schooldb.mobile.preferences.AppPreferences
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import kotlinx.coroutines.delay

@Composable
fun SchoolDbApp(
    openNotificationId: String? = null,
    openNotificationDestination: String? = null,
    onNotificationOpened: () -> Unit = {},
    authViewModel: AuthViewModel = viewModel(),
) {
    val state by authViewModel.uiState.collectAsStateWithLifecycle()
    val snackbar = remember { SnackbarHostState() }
    var showAccountSwitcher by rememberSaveable { mutableStateOf(false) }
    var switchingAccount by remember { mutableStateOf(false) }
    var showNotificationSettings by rememberSaveable { mutableStateOf(false) }
    var portalRefreshKey by rememberSaveable { mutableIntStateOf(0) }
    var appLocked by rememberSaveable { mutableStateOf(false) }
    var unlockAttempt by rememberSaveable { mutableIntStateOf(0) }
    var hasBackgrounded by rememberSaveable { mutableStateOf(false) }
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val preferences by AppPreferences.state.collectAsStateWithLifecycle()
    val unlockLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.StartActivityForResult(),
    ) { result -> appLocked = result.resultCode != Activity.RESULT_OK }
    val notificationPermission = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { granted ->
        if (granted) {
            PushNotificationManager.registerCurrentDevice()
        } else {
            showNotificationSettings = true
        }
    }

    BackHandler(
        enabled = state.step != AuthStep.SignIn &&
            state.step != AuthStep.SignedIn &&
            !state.loading,
    ) {
        when (val step = state.step) {
            AuthStep.EmailSignIn -> authViewModel.backToSignIn()
            is AuthStep.Verify -> authViewModel.backToSignIn()
            is AuthStep.VerifyEmail -> authViewModel.backToEmailSignIn()
            is AuthStep.ChooseAccount -> {
                if (step.viaEmail) authViewModel.backToEmailSignIn()
                else authViewModel.backToSignIn()
            }
            else -> Unit
        }
    }

    LaunchedEffect(state.step, portalRefreshKey) {
        if (state.step == AuthStep.SignedIn && PushNotificationManager.isConfigured()) {
            withFrameNanos { }
            delay(500)
            if (PushNotificationManager.shouldRequestPermission(context)) {
                PushNotificationManager.markPermissionRequested(context)
                notificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
            } else if (
                Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
                androidx.core.content.ContextCompat.checkSelfPermission(
                    context,
                    Manifest.permission.POST_NOTIFICATIONS,
                ) == PackageManager.PERMISSION_GRANTED
            ) {
                PushNotificationManager.registerCurrentDevice()
            }
        }
    }

    LaunchedEffect(state.step) {
        if (state.step == AuthStep.SignedIn && Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            showNotificationSettings = PushNotificationManager.permissionWasRequested(context) &&
                !androidx.core.app.NotificationManagerCompat.from(context).areNotificationsEnabled()
        }
    }

    DisposableEffect(lifecycleOwner, state.step, preferences.secureReentry) {
        val observer = LifecycleEventObserver { _, event ->
            if (
                event == Lifecycle.Event.ON_RESUME &&
                state.step == AuthStep.SignedIn &&
                PushNotificationManager.isConfigured() &&
                androidx.core.app.NotificationManagerCompat.from(context).areNotificationsEnabled()
            ) {
                // Register again after returning from Android notification settings.
                PushNotificationManager.registerCurrentDevice()
                showNotificationSettings = false
            }
            if (event == Lifecycle.Event.ON_STOP &&
                state.step == AuthStep.SignedIn && preferences.secureReentry
            ) {
                hasBackgrounded = true
                appLocked = true
            }
            if (state.step != AuthStep.SignedIn) {
                appLocked = false
                hasBackgrounded = false
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    LaunchedEffect(appLocked, unlockAttempt, state.step, preferences.secureReentry) {
        if (!appLocked || !hasBackgrounded || state.step != AuthStep.SignedIn || !preferences.secureReentry) return@LaunchedEffect
        val intent = context.schoolDbUnlockIntent()
        if (intent == null) {
            AppPreferences.setSecureReentry(false)
            appLocked = false
        } else {
            unlockLauncher.launch(intent)
        }
    }

    LaunchedEffect(state.message) {
        state.message?.let {
            snackbar.showSnackbar(it)
            authViewModel.clearMessage()
        }
    }

    Scaffold(
        contentWindowInsets = WindowInsets(0),
        snackbarHost = { SnackbarHost(snackbar) },
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        listOf(MaterialTheme.colorScheme.primaryContainer, MaterialTheme.colorScheme.background),
                    ),
                )
                .padding(padding)
                .imePadding(),
        ) {
            when (val step = state.step) {
                AuthStep.SignIn -> SignInScreen(
                    loading = state.loading,
                    onSendOtp = authViewModel::sendOtp,
                    onUseEmail = authViewModel::showEmailSignIn,
                )
                AuthStep.EmailSignIn -> EmailSignInScreen(
                    loading = state.loading,
                    onSendOtp = authViewModel::sendEmailOtp,
                    onBack = authViewModel::backToSignIn,
                )
                is AuthStep.Verify -> VerifyScreen(
                    phone = step.phone,
                    loading = state.loading,
                    onVerify = authViewModel::verifyOtp,
                    onBack = authViewModel::backToSignIn,
                )
                is AuthStep.VerifyEmail -> VerifyEmailScreen(
                    email = step.email,
                    loading = state.loading,
                    onVerify = authViewModel::verifyEmailOtp,
                    onBack = authViewModel::backToEmailSignIn,
                )
                is AuthStep.ChooseAccount -> AccountScreen(
                    accounts = step.accounts,
                    loading = state.loading,
                    onSelect = authViewModel::selectAccount,
                    onBack = if (step.viaEmail) {
                        authViewModel::backToEmailSignIn
                    } else {
                        authViewModel::backToSignIn
                    },
                )
                AuthStep.SignedIn -> if (showAccountSwitcher) {
                    AccountSwitchScreen(
                        onBack = { showAccountSwitcher = false },
                        onSwitchStarted = { switchingAccount = true },
                        onSwitchFailed = { switchingAccount = false },
                        onComplete = {
                            portalRefreshKey += 1
                            showAccountSwitcher = false
                        },
                    )
                } else {
                    TeacherDashboardScreen(
                        refreshKey = portalRefreshKey,
                        onAccountChangeFinished = { switchingAccount = false },
                        onSwitchAccount = { showAccountSwitcher = true },
                        onSignOut = authViewModel::signOut,
                        openNotificationId = openNotificationId,
                        openNotificationDestination = openNotificationDestination,
                        onNotificationOpened = onNotificationOpened,
                    )
                }
            }
            if (switchingAccount) {
                AccountSwitchLoadingScreen()
            }
            if (appLocked && state.step == AuthStep.SignedIn) {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background,
                ) {
                    Column(
                        Modifier.fillMaxSize().padding(32.dp),
                        verticalArrangement = Arrangement.Center,
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Icon(Icons.Default.School, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(54.dp))
                        Text("SchoolDB is locked", Modifier.padding(top = 18.dp), fontWeight = FontWeight.Bold, fontSize = 24.sp)
                        Text("Confirm your device lock to continue.", Modifier.padding(top = 7.dp), color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center)
                        Button(onClick = { unlockAttempt += 1 }, modifier = Modifier.padding(top = 22.dp)) {
                            Text("Unlock SchoolDB")
                        }
                    }
                }
            }
        }
    }

    if (showNotificationSettings) {
        AlertDialog(
            onDismissRequest = { showNotificationSettings = false },
            title = { Text("Notifications are disabled") },
            text = { Text("Enable notifications in Android settings to receive attendance, homework, result and announcement alerts.") },
            confirmButton = {
                Button(onClick = {
                    showNotificationSettings = false
                    context.startActivity(Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
                        putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
                    })
                }) { Text("Open settings") }
            },
            dismissButton = {
                androidx.compose.material3.TextButton(onClick = { showNotificationSettings = false }) { Text("Not now") }
            },
        )
    }
}

@Composable
private fun AccountSwitchLoadingScreen() {
    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background,
    ) {
        Column(
            modifier = Modifier.fillMaxSize().padding(32.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Surface(
                modifier = Modifier.size(88.dp),
                shape = RoundedCornerShape(24.dp),
                color = Color.White,
                shadowElevation = 12.dp,
            ) {
                Image(
                    painter = painterResource(R.drawable.schooldb_logo_light),
                    contentDescription = null,
                    modifier = Modifier.padding(14.dp),
                )
            }
            CircularProgressIndicator(
                modifier = Modifier.padding(top = 28.dp).size(30.dp),
                strokeWidth = 3.dp,
            )
            Text(
                "Switching account or role",
                modifier = Modifier.padding(top = 18.dp),
                fontWeight = FontWeight.Bold,
                fontSize = 22.sp,
            )
            Text(
                "Preparing your workspace…",
                modifier = Modifier.padding(top = 7.dp),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
            )
        }
    }
}

@Suppress("DEPRECATION")
private fun android.content.Context.schoolDbUnlockIntent(): Intent? =
    getSystemService(KeyguardManager::class.java).createConfirmDeviceCredentialIntent(
        "Unlock SchoolDB",
        "Confirm your device lock to protect school information.",
    )

@Composable
private fun SignInScreen(
    loading: Boolean,
    onSendOtp: (String, String) -> Unit,
    onUseEmail: () -> Unit,
) {
    var school by rememberSaveable { mutableStateOf("") }
    var phone by rememberSaveable { mutableStateOf("") }
    AuthPage(
        title = "Welcome to SchoolDB",
        subtitle = "Sign in with the mobile number registered at your school.",
    ) {
        OutlinedTextField(
            value = school,
            onValueChange = { school = it.replace(" ", "-") },
            label = { Text("School code") },
            placeholder = { Text("e.g. kotak-vsp") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(14.dp))
        OutlinedTextField(
            value = phone,
            onValueChange = { phone = it.filter(Char::isDigit).take(10) },
            label = { Text("Mobile number") },
            leadingIcon = { Text("+91", fontWeight = FontWeight.SemiBold) },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(22.dp))
        PrimaryButton("Send WhatsApp code", loading, Icons.AutoMirrored.Filled.Send) {
            onSendOtp(school, phone)
        }
        Spacer(Modifier.height(16.dp))
        Text(
            "We’ll send a six-digit code through WhatsApp. Standard messaging rates may apply.",
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            fontSize = 13.sp,
            lineHeight = 18.sp,
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(16.dp))
        OutlinedButton(
            onClick = onUseEmail,
            enabled = !loading,
            modifier = Modifier.fillMaxWidth().height(52.dp),
            shape = RoundedCornerShape(18.dp),
        ) {
            Icon(Icons.Default.Email, contentDescription = null, modifier = Modifier.size(18.dp))
            Text("Use email OTP instead", Modifier.padding(start = 9.dp), fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
private fun EmailSignInScreen(
    loading: Boolean,
    onSendOtp: (String, String) -> Unit,
    onBack: () -> Unit,
) {
    var school by rememberSaveable { mutableStateOf("") }
    var email by rememberSaveable { mutableStateOf("") }
    AuthPage(
        title = "Sign in with email",
        subtitle = "Use the student, parent or staff email registered with your school.",
        onBack = onBack,
    ) {
        OutlinedTextField(
            value = school,
            onValueChange = { school = it.replace(" ", "-") },
            label = { Text("School code") },
            placeholder = { Text("e.g. kotak-vsp") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(14.dp))
        OutlinedTextField(
            value = email,
            onValueChange = { email = it.trim().take(160) },
            label = { Text("Registered email") },
            leadingIcon = { Icon(Icons.Default.Email, contentDescription = null) },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(22.dp))
        PrimaryButton("Send email code", loading, Icons.AutoMirrored.Filled.Send) {
            onSendOtp(school, email)
        }
        Spacer(Modifier.height(14.dp))
        Text(
            "If this email is linked to more than one child, you can choose the profile after verification.",
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            fontSize = 13.sp,
            lineHeight = 18.sp,
            textAlign = TextAlign.Center,
        )
    }
}

@Composable
private fun VerifyScreen(
    phone: String,
    loading: Boolean,
    onVerify: (String) -> Unit,
    onBack: () -> Unit,
) {
    var otp by rememberSaveable { mutableStateOf("") }
    AuthPage(
        title = "Check WhatsApp",
        subtitle = "Enter the code sent to +91 ••••••${phone.takeLast(4)}.",
        onBack = onBack,
    ) {
        OutlinedTextField(
            value = otp,
            onValueChange = { otp = it.filter(Char::isDigit).take(6) },
            label = { Text("Six-digit code") },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(22.dp))
        PrimaryButton("Verify and continue", loading, Icons.Default.CheckCircle) { onVerify(otp) }
    }
}

@Composable
private fun VerifyEmailScreen(
    email: String,
    loading: Boolean,
    onVerify: (String) -> Unit,
    onBack: () -> Unit,
) {
    var otp by rememberSaveable { mutableStateOf("") }
    val maskedEmail = email.substringBefore("@").let { local ->
        when {
            local.length <= 2 -> "${local.take(1)}•"
            else -> "${local.take(2)}${"•".repeat((local.length - 2).coerceAtMost(6))}"
        }
    } + "@" + email.substringAfter("@", "")
    AuthPage(
        title = "Check your email",
        subtitle = "Enter the six-digit code sent to $maskedEmail.",
        onBack = onBack,
    ) {
        OutlinedTextField(
            value = otp,
            onValueChange = { otp = it.filter(Char::isDigit).take(6) },
            label = { Text("Six-digit code") },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(22.dp))
        PrimaryButton("Verify and continue", loading, Icons.Default.CheckCircle) { onVerify(otp) }
    }
}

@Composable
private fun AccountScreen(
    accounts: List<SchoolAccount>,
    loading: Boolean,
    onSelect: (String) -> Unit,
    onBack: () -> Unit,
) {
    AuthPage(
        title = "Choose account or role",
        subtitle = "These sign-in details match more than one SchoolDB profile. Choose who you want to continue as.",
        onBack = onBack,
    ) {
        accounts.forEach { account ->
            Card(
                onClick = { if (!loading) onSelect(account.id) },
                modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
                shape = RoundedCornerShape(18.dp),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(Icons.Default.School, contentDescription = null)
                    Column(Modifier.padding(start = 14.dp)) {
                        Text(account.name, fontWeight = FontWeight.SemiBold)
                        Text(
                            account.role.replace('_', ' ').lowercase().replaceFirstChar(Char::uppercase),
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            fontSize = 13.sp,
                        )
                    }
                }
            }
        }
        if (loading) {
            CircularProgressIndicator(Modifier.align(Alignment.CenterHorizontally).padding(top = 16.dp))
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AuthPage(
    title: String,
    subtitle: String,
    onBack: (() -> Unit)? = null,
    content: @Composable ColumnScope.() -> Unit,
) {
    Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(
        Color(0xFFF8FAFF), Color(0xFFF3F5FF), Color(0xFFF8FAFC),
    ))).statusBarsPadding().imePadding()) {
        Box(Modifier.size(280.dp).offset(x = 205.dp, y = (-120).dp).clip(CircleShape)
            .background(MaterialTheme.colorScheme.secondary.copy(alpha = 0.12f)))
        Box(Modifier.size(210.dp).offset(x = (-120).dp, y = 520.dp).clip(CircleShape)
            .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.09f)))

        Column(
            modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            if (onBack != null) {
                TopAppBar(
                    title = {},
                    navigationIcon = {
                        IconButton(onClick = onBack) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.Transparent),
                )
            } else {
                Spacer(Modifier.height(24.dp))
            }
            Row(
                Modifier.fillMaxWidth().padding(horizontal = 24.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Card(shape = RoundedCornerShape(18.dp), elevation = CardDefaults.cardElevation(8.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White)) {
                    Image(painter = painterResource(R.drawable.schooldb_logo_light),
                        contentDescription = "SchoolDB", modifier = Modifier.size(54.dp))
                }
                Spacer(Modifier.size(12.dp))
                Column {
                    Text("SchoolDB", style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.ExtraBold)
                    Text("SMARTER SCHOOLS · BRIGHTER FUTURES",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            Spacer(Modifier.height(30.dp))
            Column(Modifier.fillMaxWidth().padding(horizontal = 24.dp)) {
                Surface(shape = CircleShape, color = Color(0xFFECFDF5),
                    border = BorderStroke(1.dp, Color(0xFFA7F3D0))) {
                    Row(Modifier.padding(horizontal = 12.dp, vertical = 7.dp),
                        verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.CheckCircle, contentDescription = null,
                            tint = Color(0xFF059669), modifier = Modifier.size(16.dp))
                        Spacer(Modifier.size(7.dp))
                        Text("VERIFIED ACCESS", color = Color(0xFF047857),
                            style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                    }
                }
                Spacer(Modifier.height(14.dp))
                Text(title, style = MaterialTheme.typography.headlineLarge,
                    fontWeight = FontWeight.ExtraBold, lineHeight = 38.sp)
                Spacer(Modifier.height(8.dp))
                Text(subtitle, color = MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.bodyLarge, lineHeight = 24.sp)
            }
            Spacer(Modifier.height(18.dp))
            Row(Modifier.fillMaxWidth().padding(horizontal = 20.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("Attendance", "Fees", "Academics").forEach { label ->
                    Surface(Modifier.weight(1f), shape = RoundedCornerShape(14.dp),
                        color = Color.White.copy(alpha = .78f),
                        border = BorderStroke(1.dp, Color(0xFFE0E7FF))) {
                        Text(label, Modifier.padding(vertical = 9.dp), textAlign = TextAlign.Center,
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
                    }
                }
            }
            Spacer(Modifier.height(16.dp))
            Card(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp),
                shape = RoundedCornerShape(30.dp),
                border = BorderStroke(1.dp, Color.White),
                colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = .94f)),
                elevation = CardDefaults.cardElevation(defaultElevation = 12.dp),
            ) {
                Column(Modifier.padding(horizontal = 22.dp, vertical = 24.dp)) {
                    Text("SECURE ACCESS", color = MaterialTheme.colorScheme.primary,
                        style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(16.dp))
                    content()
                }
            }
            Spacer(Modifier.height(22.dp))
            Text(
                "Encrypted access • Private school data • Secure sessions",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(horizontal = 24.dp),
            )
            Spacer(Modifier.height(28.dp))
        }
    }
}

@Composable
private fun PrimaryButton(
    label: String,
    loading: Boolean,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    onClick: () -> Unit,
) {
    Button(
        onClick = onClick,
        enabled = !loading,
        modifier = Modifier.fillMaxWidth().height(56.dp),
        shape = RoundedCornerShape(18.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = MaterialTheme.colorScheme.primary,
            contentColor = MaterialTheme.colorScheme.onPrimary,
        ),
        elevation = ButtonDefaults.buttonElevation(defaultElevation = 4.dp, pressedElevation = 1.dp),
    ) {
        if (loading) {
            CircularProgressIndicator(
                modifier = Modifier.size(20.dp),
                color = MaterialTheme.colorScheme.onPrimary,
                strokeWidth = 2.dp,
            )
        } else {
            Icon(icon, contentDescription = null, modifier = Modifier.size(19.dp))
            Text(label, modifier = Modifier.padding(start = 10.dp), fontWeight = FontWeight.SemiBold)
        }
    }
}
