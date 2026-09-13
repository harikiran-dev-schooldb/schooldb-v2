package com.schooldb.mobile.teacher

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
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
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.outlined.Badge
import androidx.compose.material.icons.outlined.Bloodtype
import androidx.compose.material.icons.outlined.BusinessCenter
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Email
import androidx.compose.material.icons.outlined.Groups
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Phone
import androidx.compose.material.icons.outlined.School
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel

private val ProfileIndigo = Color(0xFF4F46E5)
private val ProfileIndigoSoft = Color(0xFFEEF2FF)
private val ProfileBackground = Color(0xFFF8FAFC)
private val ProfileSlate900 = Color(0xFF0F172A)
private val ProfileSlate600 = Color(0xFF475569)
private val ProfileSlate500 = Color(0xFF64748B)
private val ProfileSlate300 = Color(0xFFCBD5E1)
private val ProfileSlate200 = Color(0xFFE2E8F0)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    onBack: () -> Unit,
    viewModel: ProfileViewModel = viewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()

    Scaffold(
        containerColor = ProfileBackground,
        topBar = {
            TopAppBar(
                title = { Text("My Profile", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = viewModel::refresh, enabled = !state.loading) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = ProfileBackground),
            )
        },
    ) { padding ->
        when {
            state.loading && state.profile == null -> Box(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentAlignment = Alignment.Center,
            ) { CircularProgressIndicator() }

            state.error != null && state.profile == null -> ProfileError(
                message = state.error.orEmpty(),
                modifier = Modifier.fillMaxSize().padding(padding),
                onRetry = viewModel::refresh,
            )

            else -> state.profile?.let { profile ->
                ProfileContent(profile = profile, modifier = Modifier.fillMaxSize().padding(padding))
            }
        }
    }
}

@Composable
private fun ProfileContent(profile: TeacherProfile, modifier: Modifier) {
    LazyColumn(
        modifier = modifier,
        contentPadding = PaddingValues(start = 18.dp, end = 18.dp, top = 10.dp, bottom = 28.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item { ProfileHero(profile) }

        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                ProfileStat(
                    value = profile.classCount.toString(),
                    label = "Classes",
                    icon = Icons.Outlined.Groups,
                    modifier = Modifier.weight(1f),
                )
                ProfileStat(
                    value = profile.subjectCount.toString(),
                    label = "Subjects",
                    icon = Icons.Outlined.School,
                    modifier = Modifier.weight(1f),
                )
            }
        }

        item { ProfileSectionTitle("EMPLOYMENT") }
        item {
            ProfileDetailsCard(
                listOf(
                    ProfileDetail(Icons.Outlined.Badge, "Employee ID", profile.employeeId),
                    ProfileDetail(Icons.Outlined.BusinessCenter, "Designation", profile.designation),
                    ProfileDetail(Icons.Outlined.School, "Qualification", profile.qualification),
                    ProfileDetail(Icons.Outlined.CalendarMonth, "Joining date", profile.joiningDate),
                    ProfileDetail(
                        Icons.Outlined.BusinessCenter,
                        "Experience",
                        profile.experience?.let { "$it year${if (it == 1) "" else "s"}" },
                    ),
                ),
            )
        }

        item { ProfileSectionTitle("PERSONAL & CONTACT") }
        item {
            val address = listOfNotNull(
                profile.address,
                profile.city,
                profile.district,
                profile.state,
                profile.pincode,
            ).filter(String::isNotBlank).joinToString(", ").ifBlank { null }
            ProfileDetailsCard(
                listOf(
                    ProfileDetail(Icons.Outlined.Person, "Gender", profile.gender.readable()),
                    ProfileDetail(Icons.Outlined.CalendarMonth, "Date of birth", profile.dob),
                    ProfileDetail(Icons.Outlined.Bloodtype, "Blood group", profile.bloodGroup),
                    ProfileDetail(Icons.Outlined.Phone, "Phone", profile.phone),
                    ProfileDetail(Icons.Outlined.Phone, "Alternate phone", profile.alternatePhone),
                    ProfileDetail(Icons.Outlined.Email, "Email", profile.email),
                    ProfileDetail(Icons.Outlined.Home, "Address", address),
                ),
            )
        }

        item { ProfileSectionTitle("CURRENT TEACHING") }
        if (profile.allocations.isEmpty()) {
            item { ProfileEmptyCard("No active teaching allocations are linked to this profile.") }
        } else {
            items(
                items = profile.allocations,
                key = { "${it.className}:${it.sectionName}:${it.subjectName}" },
            ) { allocation ->
                AllocationCard(allocation)
            }
        }
    }
}

@Composable
private fun ProfileHero(profile: TeacherProfile) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = ProfileIndigo),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(20.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier.size(72.dp).background(Color.White.copy(alpha = 0.18f), CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    profile.fullName.initials(),
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                )
            }
            Column(Modifier.weight(1f).padding(start = 16.dp)) {
                Text(
                    profile.fullName,
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                Spacer(Modifier.height(3.dp))
                Text(
                    profile.designation ?: "Teacher",
                    color = Color.White.copy(alpha = 0.85f),
                )
                Text(
                    profile.schoolName,
                    fontSize = 12.sp,
                    color = Color.White.copy(alpha = 0.72f),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
    }
}

@Composable
private fun ProfileStat(value: String, label: String, icon: ImageVector, modifier: Modifier) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(17.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        border = BorderStroke(1.dp, ProfileSlate200),
    ) {
        Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier.size(40.dp).background(ProfileIndigoSoft, CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Icon(icon, contentDescription = null, tint = ProfileIndigo, modifier = Modifier.size(21.dp))
            }
            Column(Modifier.padding(start = 11.dp)) {
                Text(value, fontSize = 20.sp, fontWeight = FontWeight.Bold, color = ProfileSlate900)
                Text(label, fontSize = 11.sp, color = ProfileSlate500)
            }
        }
    }
}

private data class ProfileDetail(val icon: ImageVector, val label: String, val value: String?)

@Composable
private fun ProfileDetailsCard(rows: List<ProfileDetail>) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        border = BorderStroke(1.dp, ProfileSlate200),
    ) {
        rows.forEachIndexed { index, row ->
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 13.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(row.icon, contentDescription = null, tint = ProfileIndigo, modifier = Modifier.size(20.dp))
                Column(Modifier.weight(1f).padding(start = 13.dp)) {
                    Text(row.label, fontSize = 11.sp, color = ProfileSlate500)
                    Text(
                        row.value?.takeIf(String::isNotBlank) ?: "Not provided",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium,
                        color = if (row.value.isNullOrBlank()) ProfileSlate300 else ProfileSlate900,
                    )
                }
            }
            if (index < rows.lastIndex) {
                HorizontalDivider(modifier = Modifier.padding(start = 49.dp), color = ProfileSlate200)
            }
        }
    }
}

@Composable
private fun AllocationCard(allocation: ProfileAllocation) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        border = BorderStroke(1.dp, ProfileSlate200),
    ) {
        Row(Modifier.fillMaxWidth().padding(15.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier.size(40.dp).background(ProfileIndigoSoft, CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Icon(Icons.Outlined.School, contentDescription = null, tint = ProfileIndigo)
            }
            Column(Modifier.weight(1f).padding(start = 12.dp)) {
                Text(
                    allocation.subjectName,
                    fontWeight = FontWeight.SemiBold,
                    color = ProfileSlate900,
                )
                Text(
                    "${allocation.className} · Section ${allocation.sectionName}",
                    fontSize = 12.sp,
                    color = ProfileSlate500,
                )
            }
        }
    }
}

@Composable
private fun ProfileSectionTitle(text: String) {
    Text(
        text,
        fontSize = 10.sp,
        fontWeight = FontWeight.Bold,
        letterSpacing = 1.2.sp,
        color = ProfileIndigo,
        modifier = Modifier.padding(top = 4.dp),
    )
}

@Composable
private fun ProfileEmptyCard(message: String) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        border = BorderStroke(1.dp, ProfileSlate200),
        shape = RoundedCornerShape(17.dp),
    ) {
        Text(message, modifier = Modifier.padding(22.dp), color = ProfileSlate600)
    }
}

@Composable
private fun ProfileError(message: String, modifier: Modifier, onRetry: () -> Unit) {
    Column(
        modifier = modifier.padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text("Couldn’t load profile", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(8.dp))
        Text(message, color = ProfileSlate500)
        Spacer(Modifier.height(16.dp))
        Button(onClick = onRetry) { Text("Try again") }
    }
}

private fun String.readable(): String = lowercase().replaceFirstChar { it.uppercase() }

private fun String.initials(): String = trim()
    .split(Regex("\\s+"))
    .filter(String::isNotBlank)
    .take(2)
    .mapNotNull { it.firstOrNull()?.uppercase() }
    .joinToString("")
    .ifBlank { "T" }
