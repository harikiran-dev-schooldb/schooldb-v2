package com.schooldb.mobile.ui

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
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
import androidx.compose.material.icons.filled.School
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
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
import androidx.lifecycle.viewmodel.compose.viewModel
import com.schooldb.mobile.R
import com.schooldb.mobile.auth.AuthStep
import com.schooldb.mobile.auth.AuthViewModel
import com.schooldb.mobile.auth.AccountSwitchScreen
import com.schooldb.mobile.auth.SchoolAccount
import com.schooldb.mobile.teacher.TeacherDashboardScreen
import com.schooldb.mobile.notifications.PushNotificationManager
import kotlinx.coroutines.delay

@Composable
fun SchoolDbApp(
    openNotificationId: String? = null,
    onNotificationOpened: () -> Unit = {},
    authViewModel: AuthViewModel = viewModel(),
) {
    val state by authViewModel.uiState.collectAsStateWithLifecycle()
    val snackbar = remember { SnackbarHostState() }
    var showAccountSwitcher by rememberSaveable { mutableStateOf(false) }
    var portalRefreshKey by rememberSaveable { mutableStateOf(0) }
    val context = LocalContext.current
    val notificationPermission = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { granted ->
        if (granted) PushNotificationManager.registerCurrentDevice()
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
                AuthStep.SignIn -> SignInScreen(state.loading, authViewModel::sendOtp)
                is AuthStep.Verify -> VerifyScreen(
                    phone = step.phone,
                    loading = state.loading,
                    onVerify = authViewModel::verifyOtp,
                    onBack = authViewModel::backToSignIn,
                )
                is AuthStep.ChooseAccount -> AccountScreen(
                    accounts = step.accounts,
                    loading = state.loading,
                    onSelect = authViewModel::selectAccount,
                    onBack = authViewModel::backToSignIn,
                )
                AuthStep.SignedIn -> if (showAccountSwitcher) {
                    AccountSwitchScreen(
                        onBack = { showAccountSwitcher = false },
                        onComplete = {
                            portalRefreshKey += 1
                            showAccountSwitcher = false
                        },
                    )
                } else {
                    TeacherDashboardScreen(
                        refreshKey = portalRefreshKey,
                        onSwitchAccount = { showAccountSwitcher = true },
                        openNotificationId = openNotificationId,
                        onNotificationOpened = onNotificationOpened,
                    )
                }
            }
        }
    }
}

@Composable
private fun SignInScreen(loading: Boolean, onSendOtp: (String, String) -> Unit) {
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
private fun AccountScreen(
    accounts: List<SchoolAccount>,
    loading: Boolean,
    onSelect: (String) -> Unit,
    onBack: () -> Unit,
) {
    AuthPage(
        title = "Choose account or role",
        subtitle = "This mobile number has more than one SchoolDB profile. Choose who you want to continue as.",
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
    Box(Modifier.fillMaxSize().statusBarsPadding()) {
        Box(Modifier.size(260.dp).offset(x = 210.dp, y = (-105).dp).clip(CircleShape)
            .background(MaterialTheme.colorScheme.secondary.copy(alpha = 0.10f)))
        Box(Modifier.size(190.dp).offset(x = (-105).dp, y = 480.dp).clip(CircleShape)
            .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.08f)))

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
                Spacer(Modifier.height(54.dp))
            }
            Card(
                shape = RoundedCornerShape(25.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 10.dp),
                colors = CardDefaults.cardColors(containerColor = Color.Transparent),
            ) {
                Image(
                    painter = painterResource(R.drawable.schooldb_logo_auth),
                    contentDescription = "SchoolDB",
                    modifier = Modifier.size(82.dp),
                )
            }
            Spacer(Modifier.height(16.dp))
            Text(
                "SCHOOLDB  •  SECURE SCHOOL CLOUD",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.primary,
            )
            Spacer(Modifier.height(12.dp))
            Text(
                title,
                style = MaterialTheme.typography.headlineMedium,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(horizontal = 24.dp),
            )
            Spacer(Modifier.height(9.dp))
            Text(
                subtitle,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
                style = MaterialTheme.typography.bodyLarge,
                modifier = Modifier.padding(horizontal = 34.dp),
            )
            Spacer(Modifier.height(26.dp))
            Card(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp),
                shape = RoundedCornerShape(28.dp),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.8f)),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
            ) {
                Column(Modifier.padding(horizontal = 22.dp, vertical = 24.dp), content = content)
            }
            Spacer(Modifier.height(28.dp))
            Text(
                "Private • Secure • Built for your school",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(24.dp))
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
