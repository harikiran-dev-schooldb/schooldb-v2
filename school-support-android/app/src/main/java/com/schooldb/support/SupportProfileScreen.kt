package com.schooldb.support

import android.os.Build
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Logout
import androidx.compose.material.icons.outlined.Android
import androidx.compose.material.icons.outlined.Badge
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.ChevronRight
import androidx.compose.material.icons.outlined.Email
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.Phone
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material.icons.outlined.School
import androidx.compose.material.icons.outlined.Security
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.schooldb.support.tickets.SupportAccountProfile
import com.schooldb.support.tickets.AccountSwitchChoice

@Composable
internal fun SupportProfileScreen(
    profile: SupportAccountProfile?,
    schoolIdentity: SchoolIdentity?,
    loading: Boolean,
    error: String?,
    alertsEnabled: Boolean,
    accounts: List<AccountSwitchChoice>,
    accountsLoading: Boolean,
    accountsError: String?,
    switchingAccountId: String?,
    onRetry: () -> Unit,
    onRefreshAccounts: () -> Unit,
    onSwitchAccount: (AccountSwitchChoice) -> Unit,
    onNotificationSettings: () -> Unit,
    onSignOut: () -> Unit,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 12.dp, bottom = 28.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item {
            SupportPageHeading(
                title = "Your support profile",
                subtitle = "Account, school, alerts and device information.",
                eyebrow = "PROFILE",
            )
        }

        if (loading && profile == null) {
            item {
                SurfaceCard(Modifier.fillMaxWidth()) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        CircularProgressIndicator(Modifier.size(24.dp), strokeWidth = 3.dp)
                        Spacer(Modifier.width(12.dp))
                        Text("Loading your profile…", color = Muted)
                    }
                }
            }
        } else if (profile == null) {
            item {
                SurfaceCard(Modifier.fillMaxWidth()) {
                    Text("Couldn’t load profile", fontWeight = FontWeight.Bold, color = Ink)
                    Spacer(Modifier.height(5.dp))
                    Text(error ?: "Check your connection and try again.", color = Muted)
                    Spacer(Modifier.height(12.dp))
                    OutlinedButton(onClick = onRetry) {
                        Icon(Icons.Outlined.Refresh, null, Modifier.size(18.dp))
                        Spacer(Modifier.width(7.dp))
                        Text("Try again")
                    }
                }
            }
        } else {
            item { ProfileHero(profile, schoolIdentity) }

            item { ProfileSectionLabel("ACCOUNT") }
            item {
                ProfileDetailsCard(
                    listOf(
                        ProfileRow(Icons.Outlined.Badge, "Role", displayAccountRole(profile.role, profile.designation)),
                        ProfileRow(Icons.Outlined.Phone, "Verified mobile", profile.phone ?: "Not available"),
                        ProfileRow(Icons.Outlined.Email, "Email", profile.email ?: "Not added"),
                    ),
                )
            }

            if (accountsLoading || accounts.size > 1 || accountsError != null) {
                item { ProfileSectionLabel("SWITCH ACCOUNT") }
                item {
                    SurfaceCard(Modifier.fillMaxWidth()) {
                        when {
                            accountsLoading -> Row(verticalAlignment = Alignment.CenterVertically) {
                                CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp)
                                Spacer(Modifier.width(10.dp))
                                Text("Loading linked accounts…", color = Muted)
                            }
                            accountsError != null -> {
                                Text(accountsError, color = MaterialTheme.colorScheme.error)
                                TextButton(onClick = onRefreshAccounts) { Text("Try again") }
                            }
                            else -> accounts.forEachIndexed { index, account ->
                                Row(
                                    Modifier.fillMaxWidth()
                                        .clickable(
                                            enabled = !account.current && switchingAccountId == null,
                                            onClick = { onSwitchAccount(account) },
                                        )
                                        .padding(vertical = 10.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Column(Modifier.weight(1f)) {
                                        Text(account.name, color = Ink, fontWeight = FontWeight.SemiBold)
                                        Text(
                                            listOf(account.role.readableRole(), account.detail)
                                                .filter(String::isNotBlank).joinToString(" · "),
                                            color = Muted,
                                            style = MaterialTheme.typography.bodySmall,
                                        )
                                    }
                                    when {
                                        switchingAccountId == account.id -> CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp)
                                        account.current -> Icon(Icons.Outlined.CheckCircle, "Current account", tint = Color(0xFF15976C))
                                        else -> Icon(Icons.Outlined.ChevronRight, "Switch account", tint = Muted)
                                    }
                                }
                                if (index < accounts.lastIndex) HorizontalDivider(color = Line)
                            }
                        }
                    }
                }
            }

            item { ProfileSectionLabel("SCHOOL") }
            item {
                ProfileDetailsCard(
                    listOf(
                        ProfileRow(Icons.Outlined.School, "School", profile.schoolName),
                        ProfileRow(Icons.Outlined.Badge, "School code", profile.schoolSlug),
                    ),
                )
            }

            item { ProfileSectionLabel("NOTIFICATIONS") }
            item {
                SurfaceCard(Modifier.fillMaxWidth()) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        ProfileIcon(Icons.Outlined.Notifications, if (alertsEnabled) Color(0xFF15976C) else SchoolRed)
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) {
                            Text("Ticket alerts", fontWeight = FontWeight.SemiBold, color = Ink)
                            Text(
                                if (alertsEnabled) "Enabled on this device" else "Disabled — you may miss support updates",
                                style = MaterialTheme.typography.bodySmall,
                                color = Muted,
                            )
                        }
                        TextButton(onClick = onNotificationSettings) { Text("Settings") }
                    }
                }
            }

            item { ProfileSectionLabel("APP & DEVICE") }
            item {
                ProfileDetailsCard(
                    listOf(
                        ProfileRow(Icons.Outlined.Android, "App version", "${BuildConfig.VERSION_NAME} (${BuildConfig.VERSION_CODE})"),
                        ProfileRow(Icons.Outlined.Android, "Device", "${Build.MANUFACTURER.readableName()} ${Build.MODEL}"),
                        ProfileRow(Icons.Outlined.Security, "Android", Build.VERSION.RELEASE),
                    ),
                )
            }

            item {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp),
                    color = Indigo.copy(alpha = .06f),
                    border = BorderStroke(1.dp, Indigo.copy(alpha = .13f)),
                ) {
                    Row(Modifier.padding(16.dp), verticalAlignment = Alignment.Top) {
                        Icon(Icons.Outlined.Security, null, tint = Indigo, modifier = Modifier.size(20.dp))
                        Spacer(Modifier.width(11.dp))
                        Text(
                            "Your session is protected by WhatsApp verification. Contact a SchoolDB administrator to change account details or permissions.",
                            style = MaterialTheme.typography.bodySmall,
                            color = Muted,
                        )
                    }
                }
            }

            item {
                OutlinedButton(
                    onClick = onSignOut,
                    modifier = Modifier.fillMaxWidth().height(52.dp),
                    shape = RoundedCornerShape(15.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = SchoolRed),
                    border = BorderStroke(1.dp, SchoolRed.copy(alpha = .35f)),
                ) {
                    Icon(Icons.AutoMirrored.Outlined.Logout, null)
                    Spacer(Modifier.width(9.dp))
                    Text("Sign out", fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }
}

@Composable
private fun ProfileHero(profile: SupportAccountProfile, schoolIdentity: SchoolIdentity?) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(28.dp),
        color = Indigo,
        shadowElevation = 6.dp,
    ) {
        Row(Modifier.padding(20.dp), verticalAlignment = Alignment.CenterVertically) {
            Surface(shape = CircleShape, color = Color.White.copy(alpha = .16f)) {
                Box(Modifier.size(62.dp), contentAlignment = Alignment.Center) {
                    Text(profile.userName.initials(), color = Color.White, style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.ExtraBold)
                }
            }
            Spacer(Modifier.width(15.dp))
            Column(Modifier.weight(1f)) {
                Text(profile.userName, color = Color.White, style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Spacer(Modifier.height(3.dp))
                Text(displayAccountRole(profile.role, profile.designation), color = Color.White.copy(alpha = .78f),
                    style = MaterialTheme.typography.bodyMedium)
                Text(schoolIdentity?.name ?: profile.schoolName, color = Color.White.copy(alpha = .72f),
                    style = MaterialTheme.typography.bodySmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
        }
    }
}

private data class ProfileRow(val icon: ImageVector, val label: String, val value: String)

@Composable
private fun ProfileDetailsCard(rows: List<ProfileRow>) {
    SurfaceCard(Modifier.fillMaxWidth()) {
        rows.forEachIndexed { index, row ->
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                ProfileIcon(row.icon, Indigo)
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text(row.label, style = MaterialTheme.typography.bodySmall, color = Muted)
                    Text(row.value, style = MaterialTheme.typography.bodyMedium, color = Ink,
                        fontWeight = FontWeight.SemiBold, maxLines = 2, overflow = TextOverflow.Ellipsis)
                }
            }
            if (index < rows.lastIndex) {
                HorizontalDivider(Modifier.padding(start = 48.dp, top = 13.dp, bottom = 13.dp), color = Line)
            }
        }
    }
}

@Composable
private fun ProfileIcon(icon: ImageVector, tint: Color) {
    Box(
        Modifier.size(38.dp).background(tint.copy(alpha = .10f), RoundedCornerShape(12.dp)),
        contentAlignment = Alignment.Center,
    ) {
        Icon(icon, null, tint = tint, modifier = Modifier.size(20.dp))
    }
}

@Composable
private fun ProfileSectionLabel(text: String) {
    Text(text, style = MaterialTheme.typography.labelSmall, color = Indigo, fontWeight = FontWeight.Bold)
}

private fun String.readableRole(): String = replace('_', ' ').lowercase().replaceFirstChar { it.uppercase() }

private fun String.readableName(): String = lowercase().replaceFirstChar { it.uppercase() }

private fun String.initials(): String = trim().split(Regex("\\s+")).filter(String::isNotBlank)
    .take(2).joinToString("") { it.first().uppercase() }.ifBlank { "U" }
