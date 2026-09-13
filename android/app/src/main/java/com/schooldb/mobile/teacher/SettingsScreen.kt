package com.schooldb.mobile.teacher

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.outlined.DarkMode
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.RestartAlt
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.schooldb.mobile.BuildConfig
import com.schooldb.mobile.preferences.AppPreferences
import com.schooldb.mobile.preferences.StartTabPreference
import com.schooldb.mobile.preferences.ThemePreference

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    onBack: () -> Unit,
    onSignOut: () -> Unit,
) {
    val preferences by AppPreferences.state.collectAsStateWithLifecycle()
    var showSignOutConfirmation by remember { mutableStateOf(false) }
    var showResetConfirmation by remember { mutableStateOf(false) }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Settings", fontWeight = FontWeight.Bold)
                        Text(
                            "App preferences",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background,
                ),
            )
        },
    ) { padding ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(padding),
            contentPadding = PaddingValues(start = 18.dp, end = 18.dp, top = 10.dp, bottom = 28.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            item { SettingsSectionTitle("APPEARANCE") }
            item {
                SettingsCard {
                    SettingsHeader(
                        icon = Icons.Outlined.DarkMode,
                        title = "Theme",
                        subtitle = "Choose how SchoolDB looks on this device",
                    )
                    ThemePreference.entries.forEach { option ->
                        SettingsDivider()
                        ChoiceRow(
                            title = option.label,
                            selected = preferences.theme == option,
                            onClick = { AppPreferences.setTheme(option) },
                        )
                    }
                }
            }

            item { SettingsSectionTitle("START SCREEN") }
            item {
                SettingsCard {
                    SettingsHeader(
                        icon = Icons.Outlined.Home,
                        title = "Open SchoolDB on",
                        subtitle = "Used the next time the app starts",
                    )
                    StartTabPreference.entries.forEach { option ->
                        SettingsDivider()
                        ChoiceRow(
                            title = option.label,
                            selected = preferences.startTab == option,
                            onClick = { AppPreferences.setStartTab(option) },
                        )
                    }
                }
            }

            item { SettingsSectionTitle("NOTIFICATIONS") }
            item {
                SettingsCard {
                    ToggleRow(
                        icon = Icons.Outlined.Notifications,
                        title = "Unread notice badge",
                        subtitle = "Show the unread count on the Notices tab",
                        checked = preferences.showNoticeBadges,
                        onCheckedChange = AppPreferences::setNoticeBadges,
                    )
                }
            }

            item { SettingsSectionTitle("APP") }
            item {
                SettingsCard {
                    SettingsHeader(
                        icon = Icons.Outlined.Info,
                        title = "SchoolDB for Android",
                        subtitle = "Version ${BuildConfig.VERSION_NAME}",
                    )
                    SettingsDivider()
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(15.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(Icons.Outlined.RestartAlt, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                        Column(Modifier.weight(1f).padding(horizontal = 13.dp)) {
                            Text("Reset app preferences", fontWeight = FontWeight.Medium)
                            Text(
                                "Restore theme, badge and start-screen defaults",
                                fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        TextButton(onClick = { showResetConfirmation = true }) { Text("Reset") }
                    }
                }
            }

            item { SettingsSectionTitle("ACCOUNT") }
            item {
                OutlinedButton(
                    onClick = { showSignOutConfirmation = true },
                    modifier = Modifier.fillMaxWidth().height(52.dp),
                ) {
                    Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = null)
                    Spacer(Modifier.width(9.dp))
                    Text("Sign out", fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }

    if (showSignOutConfirmation) {
        AlertDialog(
            onDismissRequest = { showSignOutConfirmation = false },
            title = { Text("Sign out of SchoolDB?") },
            text = { Text("You’ll need a new WhatsApp verification code to sign in again.") },
            confirmButton = {
                Button(onClick = {
                    showSignOutConfirmation = false
                    onSignOut()
                }) { Text("Sign out") }
            },
            dismissButton = {
                TextButton(onClick = { showSignOutConfirmation = false }) { Text("Cancel") }
            },
        )
    }

    if (showResetConfirmation) {
        AlertDialog(
            onDismissRequest = { showResetConfirmation = false },
            title = { Text("Reset preferences?") },
            text = { Text("The theme, notice badge and start screen will return to their defaults.") },
            confirmButton = {
                Button(onClick = {
                    AppPreferences.reset()
                    showResetConfirmation = false
                }) { Text("Reset") }
            },
            dismissButton = {
                TextButton(onClick = { showResetConfirmation = false }) { Text("Cancel") }
            },
        )
    }
}

@Composable
private fun SettingsCard(content: @Composable () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
    ) {
        Column(Modifier.fillMaxWidth()) { content() }
    }
}

@Composable
private fun SettingsHeader(icon: ImageVector, title: String, subtitle: String) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(15.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(23.dp))
        Column(Modifier.padding(start = 13.dp)) {
            Text(title, fontWeight = FontWeight.SemiBold)
            Text(subtitle, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun ChoiceRow(title: String, selected: Boolean, onClick: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick).padding(horizontal = 15.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        RadioButton(selected = selected, onClick = onClick)
        Text(title, modifier = Modifier.padding(start = 8.dp), fontWeight = FontWeight.Medium)
    }
}

@Composable
private fun ToggleRow(
    icon: ImageVector,
    title: String,
    subtitle: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
) {
    Row(
        modifier = Modifier.fillMaxWidth().clickable { onCheckedChange(!checked) }.padding(15.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(23.dp))
        Column(Modifier.weight(1f).padding(horizontal = 13.dp)) {
            Text(title, fontWeight = FontWeight.SemiBold)
            Text(subtitle, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Switch(checked = checked, onCheckedChange = onCheckedChange)
    }
}

@Composable
private fun SettingsDivider() {
    HorizontalDivider(
        modifier = Modifier.padding(start = 51.dp),
        color = MaterialTheme.colorScheme.outlineVariant,
    )
}

@Composable
private fun SettingsSectionTitle(text: String) {
    Text(
        text,
        fontSize = 10.sp,
        fontWeight = FontWeight.Bold,
        letterSpacing = 1.2.sp,
        color = MaterialTheme.colorScheme.primary,
        modifier = Modifier.padding(top = 4.dp),
    )
}

private val ThemePreference.label: String
    get() = when (this) {
        ThemePreference.SYSTEM -> "Use device setting"
        ThemePreference.LIGHT -> "Light"
        ThemePreference.DARK -> "Dark"
    }

private val StartTabPreference.label: String
    get() = when (this) {
        StartTabPreference.HOME -> "Home"
        StartTabPreference.ATTENDANCE -> "Attendance"
    }
