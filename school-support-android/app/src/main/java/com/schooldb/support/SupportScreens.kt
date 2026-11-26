package com.schooldb.support

import android.content.Intent
import android.content.Context
import android.content.ClipData
import android.content.ClipboardManager
import android.net.Uri
import android.provider.OpenableColumns
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.net.toUri
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.ConfirmationNumber
import androidx.compose.material.icons.outlined.AccessTime
import androidx.compose.material.icons.outlined.AssignmentInd
import androidx.compose.material.icons.outlined.ErrorOutline
import androidx.compose.material.icons.outlined.Person
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.material.icons.automirrored.outlined.Send
import androidx.compose.material.icons.outlined.AttachFile
import androidx.compose.material.icons.outlined.BarChart
import androidx.compose.material.icons.outlined.ChevronRight
import androidx.compose.material.icons.outlined.KeyboardArrowDown
import androidx.compose.material.icons.outlined.ContentCopy
import androidx.compose.material.icons.outlined.Phone
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material.icons.outlined.QrCode2
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material.icons.outlined.VerifiedUser
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.schooldb.support.tickets.*
import kotlinx.coroutines.launch
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.Locale

private val attachmentMimeTypes = setOf("application/pdf", "image/jpeg", "image/png", "image/webp")

private suspend fun readAttachment(context: Context, uri: Uri): PendingAttachment =
    withContext(Dispatchers.IO) {
        val resolver = context.contentResolver
        val mimeType = resolver.getType(uri).orEmpty()
        if (mimeType !in attachmentMimeTypes) {
            error("Choose a PDF, JPG, PNG, or WebP file.")
        }
        val metadata = resolver.query(
            uri,
            arrayOf(OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE),
            null,
            null,
            null,
        )?.use { cursor ->
            if (!cursor.moveToFirst()) null else {
                val name = cursor.getString(0)?.takeIf(String::isNotBlank) ?: "Attachment"
                val size = if (cursor.isNull(1)) null else cursor.getLong(1)
                name to size
            }
        }
        val name = metadata?.first ?: "Attachment"
        if (metadata?.second?.let { it > MAX_SUPPORT_ATTACHMENT_BYTES } == true) {
            throw AttachmentTooLargeException()
        }
        val bytes = resolver.openInputStream(uri)?.use { it.readBytesWithLimit() }
            ?: error("Could not read the selected file.")
        if (bytes.isEmpty()) error("Attachment cannot be empty.")
        PendingAttachment(name, mimeType, bytes)
    }

@Composable
private fun AttachmentPicker(
    enabled: Boolean,
    label: String = "Choose attachment",
    onAttachment: (PendingAttachment) -> Unit,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf("") }
    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if (uri == null) return@rememberLauncherForActivityResult
        scope.launch {
            loading = true
            error = ""
            try {
                onAttachment(readAttachment(context, uri))
            } catch (exception: Exception) {
                error = exception.message ?: "Could not read the selected file."
            } finally {
                loading = false
            }
        }
    }
    OutlinedButton(
        onClick = { launcher.launch("*/*") },
        enabled = enabled && !loading,
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(13.dp),
    ) {
        Icon(Icons.Outlined.AttachFile, contentDescription = null, modifier = Modifier.size(18.dp))
        Spacer(Modifier.width(8.dp))
        Text(if (loading) "Reading file..." else label)
    }
    if (error.isNotBlank()) {
        Text(error, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
    }
}

private fun attachmentSize(sizeBytes: Int): String =
    if (sizeBytes >= 1024 * 1024) "%.1f MB".format(sizeBytes / (1024.0 * 1024.0))
    else "%.0f KB".format(sizeBytes / 1024.0)

private data class SupportTimelineEntry(
    val createdAt: String,
    val author: String,
    val body: String,
    val isInternal: Boolean,
    val isActivity: Boolean,
)

@Composable
internal fun TicketDashboard(school: String, tickets: List<TicketSummary>, summary: List<Int>,
    admin: Boolean, canManageAdmins: Boolean, staff: List<StaffOption>, analytics: SupportAnalytics?, analyticsLoading: Boolean,
    analyticsError: String?, busy: Boolean, ticketsLoading: Boolean, ticketsLoaded: Boolean,
    showingCachedData: Boolean, manualRefreshing: Boolean,
    personalWork: PersonalWorkspace?, workLoading: Boolean, workError: String?, onWorkRefresh: () -> Unit,
    selectedTab: String, query: String, queueFilter: String, priorityFilter: String,
    typeFilter: String, sourceFilter: String, page: Int, total: Int, totalPages: Int,
    onQueryChange: (String) -> Unit, onSearch: () -> Unit, onPage: (Int) -> Unit,
    onFiltersChange: (String, String, String, String) -> Unit,
    onBulkStatus: (List<String>, TicketStatus) -> Unit,
    onBulkPriority: (List<String>, TicketPriority) -> Unit,
    onBulkAssign: (List<String>, String?) -> Unit,
    requestedFilter: String?, onFilterConsumed: () -> Unit,
    onOpenQueue: (String) -> Unit,
    onCreate: () -> Unit, onManageAdmins: () -> Unit,
    onRefresh: () -> Unit, onTicket: (String) -> Unit) {
    val context = LocalContext.current
    val overviewScroll = rememberLazyListState()
    val ticketsScroll = rememberLazyListState()
    val analyticsScroll = rememberLazyListState()
    val keyboard = LocalSoftwareKeyboardController.current
    var selectionMode by remember { mutableStateOf(false) }
    var showAdvancedFilters by remember { mutableStateOf(false) }
    val hasAdvancedFilters = priorityFilter != "ALL" || typeFilter != "ALL" || sourceFilter != "ALL"
    val selectedTicketIds = remember { mutableStateListOf<String>() }
    LaunchedEffect(queueFilter, priorityFilter, typeFilter, sourceFilter, query, page, selectedTab) {
        selectedTicketIds.clear()
        selectionMode = false
    }
    LaunchedEffect(requestedFilter) {
        requestedFilter?.let {
            onFilterConsumed()
        }
    }
    // Queue filters are applied by the API. Do not re-filter the current page locally:
    // doing so made server-only filters such as WAITING_OVERDUE and NEW_TODAY inaccurate.
    PullToRefreshBox(
        isRefreshing = manualRefreshing,
        onRefresh = onRefresh,
        modifier = Modifier.fillMaxSize(),
    ) {
    LazyColumn(Modifier.fillMaxSize(),
        state = when (selectedTab) {
            "Tickets" -> ticketsScroll
            "Analytics" -> analyticsScroll
            else -> overviewScroll
        },
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 4.dp, bottom = 24.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)) {
        if (showingCachedData) item(contentType = "offline-banner") {
            Surface(
                modifier = Modifier.fillMaxWidth().clickable(enabled = !busy, onClick = onRefresh),
                color = SchoolGold.copy(alpha = 0.12f),
                shape = RoundedCornerShape(16.dp),
                border = BorderStroke(1.dp, SchoolGold.copy(alpha = 0.22f)),
            ) {
                Row(Modifier.padding(horizontal = 16.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(8.dp).background(SchoolGold, CircleShape))
                    Spacer(Modifier.width(10.dp))
                    Column(Modifier.weight(1f)) {
                        Text("Showing saved tickets", color = Ink, fontWeight = FontWeight.SemiBold)
                        Text(if (ticketsLoading) "Refreshing in the background…" else "Tap to refresh for the latest updates.", color = Muted,
                            style = MaterialTheme.typography.bodySmall)
                    }
                    Icon(Icons.Outlined.Refresh, contentDescription = "Retry", tint = Indigo)
                }
            }
        }
        if (selectedTab == "Overview") {
            item {
                Surface(modifier = Modifier.fillMaxWidth().padding(top = 8.dp), shape = RoundedCornerShape(24.dp), color = Navy) {
                    Box(Modifier.background(Brush.linearGradient(listOf(Navy, Color(0xFF263D83))))) {
                        Box(Modifier.matchParentSize()) {
                            Box(Modifier.size(150.dp).align(Alignment.TopEnd).background(Color.White.copy(alpha = .045f), CircleShape))
                        }
                        Column(Modifier.fillMaxWidth().padding(20.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            Text(if (admin) "SCHOOL WORKSPACE" else "PERSONAL WORKSPACE",
                                style = MaterialTheme.typography.labelSmall, color = Color(0xFFC7D2FE))
                            val unresolved = if (ticketsLoaded) summary[0] + summary[1] else null
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                    Text(if (unresolved == null) "Loading requests…" else if (unresolved == 0) "All clear" else "$unresolved unresolved",
                                        color = Color.White, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
                                    Text(if (unresolved == 0) "No unresolved tickets in your queue." else "Review your visible support requests.",
                                        color = Color(0xFFDCE5FF), style = MaterialTheme.typography.bodySmall)
                                }
                                Surface(color = Color.White.copy(alpha = .12f), shape = RoundedCornerShape(16.dp)) {
                                    Icon(if (unresolved == 0) Icons.Outlined.CheckCircle else Icons.Outlined.ConfirmationNumber,
                                        contentDescription = null, tint = Color.White, modifier = Modifier.padding(12.dp).size(26.dp))
                                }
                            }
                            Spacer(Modifier.height(2.dp))
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Button(onClick = onCreate, enabled = !busy, modifier = Modifier.weight(1f).heightIn(min = 48.dp),
                                    shape = RoundedCornerShape(12.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = Color.White, contentColor = Navy),
                                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 10.dp)) {
                                    Icon(Icons.Outlined.Add, contentDescription = null, modifier = Modifier.size(18.dp))
                                    Spacer(Modifier.width(4.dp))
                                    Text("New ticket")
                                }
                                OutlinedButton(onClick = { onOpenQueue("UNRESOLVED") }, enabled = !busy,
                                    modifier = Modifier.weight(1f).heightIn(min = 48.dp), shape = RoundedCornerShape(12.dp),
                                    border = BorderStroke(1.dp, Color.White.copy(alpha = .4f)),
                                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White),
                                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 10.dp)) {
                                    Text("Open inbox")
                                    Icon(Icons.Outlined.ChevronRight, contentDescription = null, modifier = Modifier.size(16.dp))
                                }
                            }
                        }
                    }
                }
            }
            if (admin) item {
                SurfaceCard(Modifier.fillMaxWidth()) {
                    SectionTitle("Needs attention", "School-wide queues")
                    Spacer(Modifier.height(8.dp))
                    val attention = analytics?.attention
                    if (analyticsLoading) LinearProgressIndicator(Modifier.fillMaxWidth())
                    if (attention != null && attention.urgent == 0 && attention.unassigned == 0 && attention.waitingOverTwoDays == 0) {
                        Row(Modifier.fillMaxWidth().background(Color(0xFFEAF7F0), RoundedCornerShape(12.dp)).padding(12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            Icon(Icons.Outlined.CheckCircle, null, tint = Color(0xFF157347), modifier = Modifier.size(22.dp))
                            Text("No urgent, unassigned or long-waiting tickets.", color = Color(0xFF157347), style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(1f))
                        }
                    } else {
                        HomeActionRow("Urgent tickets", attention?.urgent, SchoolRed, Icons.Outlined.ErrorOutline, !busy) { onOpenQueue("URGENT") }
                        HorizontalDivider(color = Line)
                        HomeActionRow("Unassigned tickets", attention?.unassigned, SchoolGold, Icons.Outlined.AssignmentInd, !busy) { onOpenQueue("UNASSIGNED") }
                        HorizontalDivider(color = Line)
                        HomeActionRow("Waiting over 2 days", attention?.waitingOverTwoDays, SchoolGold, Icons.Outlined.AccessTime, !busy) { onOpenQueue("WAITING_OVERDUE") }
                    }
                    if (attention == null && !analyticsLoading) {
                        Text(analyticsError ?: "School-wide counts are not available. Pull down to refresh.",
                            color = Muted, style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
            item {
                PersonalWorkPanel(personalWork, workLoading, workError, busy, onWorkRefresh, onOpenQueue, onTicket)
            }
            if (admin || canManageAdmins) item {
                SurfaceCard(Modifier.fillMaxWidth()) {
                    SectionTitle("Tools", null)
                    if (admin) {
                        TextButton(onClick = {
                            val url = BuildConfig.API_BASE_URL.trimEnd('/') + "/$school/parent-query/qr"
                            context.startActivity(Intent(Intent.ACTION_VIEW, url.toUri()))
                        }, enabled = !busy) {
                            Icon(Icons.Outlined.QrCode2, contentDescription = null, modifier = Modifier.size(20.dp))
                            Spacer(Modifier.width(8.dp))
                            Text("Parent query QR")
                        }
                    }
                    if (canManageAdmins) {
                        TextButton(onClick = onManageAdmins, enabled = !busy) { Text("Manage administrators") }
                    }
                }
            }
        }

        if (selectedTab == "Analytics") {
            item {
                SupportPageHeading("Support performance", "School-wide trends, workload and resolution performance.", "ANALYTICS")
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
                    SurfaceCard(Modifier.fillMaxWidth()) {
                        SectionTitle("All-time ticket summary", "Visible school tickets")
                        Spacer(Modifier.height(12.dp))
                        Row(Modifier.fillMaxWidth()) {
                            AnalyticsValue("Open", if (ticketsLoaded) summary[0].toString() else "—", Modifier.weight(1f))
                            AnalyticsValue("In progress", if (ticketsLoaded) summary[1].toString() else "—", Modifier.weight(1f))
                        }
                        Spacer(Modifier.height(12.dp))
                        Row(Modifier.fillMaxWidth()) {
                            AnalyticsValue("Urgent", if (ticketsLoaded) summary[2].toString() else "—", Modifier.weight(1f))
                            AnalyticsValue("Resolved", if (ticketsLoaded) summary[3].toString() else "—", Modifier.weight(1f))
                        }
                    }
                }
                item {
                    OutlinedButton(onClick = {
                        val report = buildString {
                            appendLine("SchoolDB monthly support summary")
                            appendLine("School: " + school)
                            appendLine("Month to date")
                            appendLine("Created: " + analytics.month.total)
                            appendLine("Resolved from this month's requests: " + analytics.month.resolved)
                            appendLine("Pending from this month's requests: " + analytics.month.pending)
                            appendLine("Resolution rate: " + formatPercent(analytics.month.resolutionRate))
                            appendLine("Average response: " + formatResolutionTime(analytics.month.averageResponseHours))
                            appendLine("Average resolution: " + formatResolutionTime(analytics.month.averageResolutionHours))
                            appendLine("Categories")
                            analytics.byType.forEach { category -> appendLine(category.type + ": " + category.count) }
                        }
                        val share = Intent(Intent.ACTION_SEND).apply {
                            type = "text/plain"
                            putExtra(Intent.EXTRA_TEXT, report)
                        }
                        context.startActivity(Intent.createChooser(share, "Share monthly summary"))
                    }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp)) { Text("Share monthly summary") }
                }
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
                        Row(Modifier.fillMaxWidth()) {
                            AnalyticsValue("Average response", formatResolutionTime(analytics.month.averageResponseHours), Modifier.weight(1f))
                            AnalyticsValue("Average resolution", formatResolutionTime(analytics.month.averageResolutionHours), Modifier.weight(1f))
                        }
                    }
                }
                item {
                    SectionTitle("Escalations", "Open a queue to assign or follow up")
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
                if (analytics.dailyTrend.isNotEmpty()) {
                    item {
                        SurfaceCard(Modifier.fillMaxWidth()) {
                            SectionTitle("7-day trend", "Created versus resolved tickets")
                            Spacer(Modifier.height(14.dp))
                            val trendMax = analytics.dailyTrend.maxOf { maxOf(it.created, it.resolved) }.coerceAtLeast(1)
                            analytics.dailyTrend.takeLast(7).forEach { day ->
                                Row(Modifier.fillMaxWidth().padding(vertical = 5.dp), verticalAlignment = Alignment.CenterVertically) {
                                    Text(day.date.takeLast(5), modifier = Modifier.width(48.dp), style = MaterialTheme.typography.labelSmall, color = Muted)
                                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                                        LinearProgressIndicator(
                                            progress = { day.created.toFloat() / trendMax },
                                            modifier = Modifier.fillMaxWidth().height(5.dp).clip(CircleShape),
                                            color = Indigo,
                                            trackColor = Indigo.copy(alpha = 0.10f),
                                        )
                                        LinearProgressIndicator(
                                            progress = { day.resolved.toFloat() / trendMax },
                                            modifier = Modifier.fillMaxWidth().height(5.dp).clip(CircleShape),
                                            color = SchoolGreen,
                                            trackColor = SchoolGreen.copy(alpha = 0.10f),
                                        )
                                    }
                                    Spacer(Modifier.width(8.dp))
                                    Text("${day.created}/${day.resolved}", style = MaterialTheme.typography.labelSmall, color = Ink)
                                }
                            }
                            Spacer(Modifier.height(6.dp))
                            Text("Created / resolved", style = MaterialTheme.typography.bodySmall, color = Muted)
                        }
                    }
                }
                if (analytics.staffWorkload.isNotEmpty()) {
                    item {
                        SurfaceCard(Modifier.fillMaxWidth()) {
                            SectionTitle("Staff workload", "Active assignments, highest first")
                            Spacer(Modifier.height(12.dp))
                            val maxActive = analytics.staffWorkload.maxOf { it.active }.coerceAtLeast(1)
                            analytics.staffWorkload.sortedByDescending { it.active }.forEach { person ->
                                AnalyticsRow(person.name, person.active.toString() + " active")
                                LinearProgressIndicator(progress = { person.active.toFloat() / maxActive }, modifier = Modifier.fillMaxWidth().height(5.dp).clip(CircleShape), color = Indigo, trackColor = Line)
                                Spacer(Modifier.height(8.dp))
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
                Box(Modifier.weight(1f)) {
                    Column(Modifier.padding(vertical = 8.dp)) {
                        Text("Ticket inbox", style = MaterialTheme.typography.headlineSmall, color = Ink, fontWeight = FontWeight.Bold)
                        Text("Search and follow up", style = MaterialTheme.typography.bodySmall, color = Muted)
                    }
                }
                FilledTonalIconButton(onClick = onCreate, enabled = !busy) {
                    Icon(Icons.Outlined.Add, contentDescription = "New ticket")
                }
                IconButton(onClick = onRefresh, enabled = !busy) {
                    Icon(Icons.Outlined.Refresh, contentDescription = "Refresh tickets", tint = Indigo)
                }
            }
        }
        item {
            Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = query,
                    onValueChange = onQueryChange,
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    placeholder = { Text("Search tickets or students") },
                    leadingIcon = { Icon(Icons.Outlined.Search, contentDescription = null, tint = Muted) },
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                    keyboardActions = KeyboardActions(onSearch = {
                        if (!busy && !ticketsLoading) {
                            keyboard?.hide()
                            onSearch()
                        }
                    }),
                    shape = RoundedCornerShape(13.dp),
                    trailingIcon = {
                        IconButton(onClick = onSearch, enabled = !busy && !ticketsLoading) {
                            Icon(Icons.Outlined.Search, contentDescription = "Search", tint = Indigo)
                        }
                    },
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Indigo,
                        unfocusedBorderColor = Line,
                        focusedContainerColor = Color.White,
                        unfocusedContainerColor = Color.White,
                    ),
                )
                Text(if (ticketsLoading) "Updating results…" else if (ticketsLoaded) "$total tickets" else "Tickets are loading…",
                    style = MaterialTheme.typography.bodySmall, color = Muted)
                Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("ALL" to "All", "MY_ACTIVE" to "Assigned to me", "MY_RAISED" to "My requests", "UNRESOLVED" to "Unresolved", "OPEN" to "Open", "ACTIVE" to "In progress", "WAITING" to "Waiting",
                        "URGENT" to "Urgent", "MY_OVERDUE" to "My overdue", "RESOLVED" to "Resolved").forEach { (value, label) ->
                        FilterChip(selected = queueFilter == value,
                            onClick = { onFiltersChange(value, priorityFilter, typeFilter, sourceFilter) },
                            label = { Text(label) }, enabled = !busy && !ticketsLoading)
                    }
                }
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween) {
                    TextButton(onClick = { showAdvancedFilters = !showAdvancedFilters }) {
                        Text(if (showAdvancedFilters) "Hide filters" else if (hasAdvancedFilters) "Filters applied · Edit" else "More filters")
                        Icon(Icons.Outlined.KeyboardArrowDown, contentDescription = null)
                    }
                    if (queueFilter != "ALL" || hasAdvancedFilters) {
                        TextButton(onClick = { onFiltersChange("ALL", "ALL", "ALL", "ALL") }, enabled = !busy && !ticketsLoading) { Text("Clear all") }
                    }
                }
            }
        }
        if (showAdvancedFilters) item {
            SurfaceCard(Modifier.fillMaxWidth()) {
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column {
                        Text("Filter queue", style = MaterialTheme.typography.titleMedium,
                            color = Ink, fontWeight = FontWeight.Bold)
                        Text("Queue, priority, category and source", style = MaterialTheme.typography.bodySmall, color = Muted)
                    }
                    if (listOf(queueFilter, priorityFilter, typeFilter, sourceFilter).any { it != "ALL" }) {
                        TextButton(onClick = { onFiltersChange("ALL", "ALL", "ALL", "ALL") }, enabled = !ticketsLoading) {
                            Text("Clear")
                        }
                    }
                }
                Spacer(Modifier.height(12.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    InboxFilterDropdown(
                        label = "Queue / saved view",
                        value = queueFilter,
                        options = listOf(
                            "ALL" to "All tickets", "UNRESOLVED" to "Unresolved", "OPEN" to "Open", "ACTIVE" to "In progress",
                            "MY_ACTIVE" to "Assigned to me (unresolved)", "MY_RAISED" to "My unresolved requests",
                            "WAITING" to "Waiting", "WAITING_OVERDUE" to "Waiting > 2 days",
                            "URGENT" to "Urgent", "UNASSIGNED" to "Unassigned",
                            "NEW_TODAY" to "New today", "MY" to "My tickets",
                            "MY_OVERDUE" to "My overdue", "URGENT_UNASSIGNED" to "Urgent unassigned",
                            "RESOLVED" to "Resolved",
                        ),
                        enabled = !busy && !ticketsLoading,
                        modifier = Modifier.weight(1f),
                    ) { onFiltersChange(it, priorityFilter, typeFilter, sourceFilter) }
                    InboxFilterDropdown(
                        label = "Priority",
                        value = priorityFilter,
                        options = listOf("ALL" to "All priorities") + TicketPriority.entries.map { it.name to it.name.lowercase().replaceFirstChar(Char::uppercase) },
                        enabled = !busy && !ticketsLoading,
                        modifier = Modifier.weight(1f),
                    ) { onFiltersChange(queueFilter, it, typeFilter, sourceFilter) }
                }
                Spacer(Modifier.height(10.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    InboxFilterDropdown(
                        label = "Category",
                        value = typeFilter,
                        options = listOf("ALL" to "All categories") + TicketType.entries.map {
                            it.name to it.name.lowercase().replace('_', ' ').replaceFirstChar(Char::uppercase)
                        },
                        enabled = !busy && !ticketsLoading,
                        modifier = Modifier.weight(1f),
                    ) { onFiltersChange(queueFilter, priorityFilter, it, sourceFilter) }
                    InboxFilterDropdown(
                        label = "Source",
                        value = sourceFilter,
                        options = listOf("ALL" to "All sources", "STAFF" to "Staff", "PARENT_QR" to "Parent QR"),
                        enabled = !busy && !ticketsLoading,
                        modifier = Modifier.weight(1f),
                    ) { onFiltersChange(queueFilter, priorityFilter, typeFilter, it) }
                }
            }
        }
        if (admin && tickets.isNotEmpty()) item {
            SurfaceCard(Modifier.fillMaxWidth()) {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween) {
                    Column {
                        Text(if (selectionMode) "${selectedTicketIds.size} selected" else "Bulk actions",
                            style = MaterialTheme.typography.titleMedium, color = Ink, fontWeight = FontWeight.Bold)
                        Text("Assign or update several tickets together", style = MaterialTheme.typography.bodySmall, color = Muted)
                    }
                    TextButton(onClick = {
                        selectionMode = !selectionMode
                        if (!selectionMode) selectedTicketIds.clear()
                    }) { Text(if (selectionMode) "Cancel" else "Select") }
                }
                if (selectionMode && selectedTicketIds.isNotEmpty()) {
                    Spacer(Modifier.height(10.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        InboxFilterDropdown("Status", "", TicketStatus.entries.map { it.name to it.name.replace('_', ' ') }, !busy,
                            Modifier.weight(1f)) { value -> onBulkStatus(selectedTicketIds.toList(), TicketStatus.valueOf(value)); selectedTicketIds.clear() }
                        InboxFilterDropdown("Priority", "", TicketPriority.entries.map { it.name to it.name }, !busy,
                            Modifier.weight(1f)) { value -> onBulkPriority(selectedTicketIds.toList(), TicketPriority.valueOf(value)); selectedTicketIds.clear() }
                    }
                    Spacer(Modifier.height(8.dp))
                    InboxFilterDropdown(
                        "Assignee", "", listOf("UNASSIGNED" to "Unassigned") + staff.map { it.id to it.name }, !busy,
                        Modifier.fillMaxWidth(),
                    ) { value -> onBulkAssign(selectedTicketIds.toList(), value.takeUnless { it == "UNASSIGNED" }); selectedTicketIds.clear() }
                }
            }
        }
        if (ticketsLoading && !ticketsLoaded) item(contentType = "ticket-loading") {
            LoadingTicketCard()
        }
        if (tickets.isEmpty() && ticketsLoaded) item(contentType = "ticket-empty") {
            val filtersActive = listOf(queueFilter, priorityFilter, typeFilter, sourceFilter).any { it != "ALL" }
            SupportEmptyState(if (query.isNotBlank() || filtersActive) "No matching tickets" else "No tickets yet",
                if (query.isNotBlank() || filtersActive) "Try another search or filter."
                else "Raise the first ticket to start tracking a concern.")
        }
        items(tickets, key = { it.id }, contentType = { "ticket" }) { ticket ->
            TicketCard(
                ticket = ticket,
                selectable = selectionMode,
                selected = ticket.id in selectedTicketIds,
                onSelect = {
                    if (ticket.id in selectedTicketIds) selectedTicketIds.remove(ticket.id) else selectedTicketIds.add(ticket.id)
                },
            ) { onTicket(ticket.id) }
        }
        if (ticketsLoaded) item {
            SurfaceCard(Modifier.fillMaxWidth()) {
                Text(
                    "Showing ${tickets.size} of $total tickets · Page $page of ${totalPages.coerceAtLeast(1)}",
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
private fun InboxFilterDropdown(
    label: String,
    value: String,
    options: List<Pair<String, String>>,
    enabled: Boolean,
    modifier: Modifier = Modifier,
    onSelect: (String) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }
    val selectedLabel = options.firstOrNull { it.first == value }?.second
        ?: value.replace('_', ' ').ifBlank { "Choose" }
    Column(modifier) {
        Text(label, style = MaterialTheme.typography.labelSmall, color = Muted, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(5.dp))
        Box {
            OutlinedButton(
                onClick = { expanded = true },
                enabled = enabled,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(13.dp),
                colors = ButtonDefaults.outlinedButtonColors(containerColor = Color.White, contentColor = Ink),
                border = BorderStroke(1.dp, Line),
                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 12.dp),
            ) {
                Text(selectedLabel, modifier = Modifier.weight(1f), maxLines = 1, overflow = TextOverflow.Ellipsis)
                Icon(Icons.Outlined.KeyboardArrowDown, contentDescription = null, tint = Muted)
            }
            DropdownMenu(
                expanded = expanded,
                onDismissRequest = { expanded = false },
                containerColor = Color.White,
            ) {
                options.forEach { (optionValue, optionLabel) ->
                    DropdownMenuItem(
                        text = { Text(optionLabel, color = Ink) },
                        onClick = {
                            expanded = false
                            onSelect(optionValue)
                        },
                        trailingIcon = {
                            if (optionValue == value) RadioButton(selected = true, onClick = null)
                        },
                    )
                }
            }
        }
    }
}

@Composable
private fun HomeActionRow(label: String, count: Int?, tint: Color, icon: ImageVector, enabled: Boolean, onClick: () -> Unit) {
    Surface(onClick = onClick, enabled = enabled, color = MaterialTheme.colorScheme.surface) {
        Row(Modifier.fillMaxWidth().heightIn(min = 48.dp).padding(vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(34.dp).background(tint.copy(alpha = .09f), RoundedCornerShape(10.dp)), contentAlignment = Alignment.Center) {
                Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.size(18.dp))
            }
            Spacer(Modifier.width(10.dp))
            Text(label, Modifier.weight(1f), color = Ink, style = MaterialTheme.typography.bodyMedium)
            Text(count?.toString() ?: "—", color = tint, fontWeight = FontWeight.Bold)
            Spacer(Modifier.width(8.dp))
            Icon(Icons.Outlined.ChevronRight, contentDescription = null, tint = Muted)
        }
    }
}

@Composable
private fun MetricCard(label: String, value: Int, tint: Color, modifier: Modifier = Modifier, onClick: (() -> Unit)? = null) {
    val cardModifier = if (onClick != null) modifier.clickable(onClick = onClick) else modifier
    SurfaceCard(cardModifier) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween) {
            Text(value.toString(), style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold, color = Ink)
            Box(Modifier.size(30.dp).background(tint.copy(alpha = 0.11f), CircleShape), contentAlignment = Alignment.Center) {
                if (onClick != null) Icon(Icons.Outlined.ChevronRight, contentDescription = null, modifier = Modifier.size(18.dp), tint = tint)
                else Box(Modifier.size(8.dp).background(tint, CircleShape))
            }
        }
        Spacer(Modifier.height(6.dp))
        Text(label, style = MaterialTheme.typography.labelMedium, color = Muted)
    }
}

@Composable
private fun LoadingTicketCard() {
    SurfaceCard(Modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("Loading your support desk", color = Muted, style = MaterialTheme.typography.labelMedium)
            repeat(3) { index ->
                Box(Modifier.fillMaxWidth(if (index == 1) .85f else .55f).height(if (index == 0) 22.dp else 14.dp)
                    .background(Color(0xFFEEF2FF), RoundedCornerShape(8.dp)))
            }
        }
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
    if (value % 1.0 == 0.0) value.toInt().toString() + "%" else String.format(Locale.getDefault(), "%.1f%%", value)

private fun formatResolutionTime(hours: Double?): String {
    if (hours == null) return "—"
    return if (hours >= 24) {
        val days = hours / 24.0
        if (days % 1.0 == 0.0) days.toInt().toString() + " days" else String.format(Locale.getDefault(), "%.1f days", days)
    } else {
        if (hours % 1.0 == 0.0) hours.toInt().toString() + " hrs" else String.format(Locale.getDefault(), "%.1f hrs", hours)
    }
}

@Composable
private fun TicketCard(
    ticket: TicketSummary,
    selectable: Boolean = false,
    selected: Boolean = false,
    onSelect: () -> Unit = {},
    onClick: () -> Unit,
) {
    Surface(
        onClick = if (selectable) onSelect else onClick,
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        color = if (selected) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, if (selected) Indigo else MaterialTheme.colorScheme.outlineVariant),
    ) {
      Column(Modifier.padding(14.dp)) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Top) {
            if (selectable) {
                Checkbox(checked = selected, onCheckedChange = { onSelect() })
                Spacer(Modifier.width(6.dp))
            }
            Box(Modifier.size(38.dp).background(statusTint(ticket.status.name).copy(alpha = .10f), RoundedCornerShape(12.dp)), contentAlignment = Alignment.Center) {
                Icon(Icons.Outlined.ConfirmationNumber, contentDescription = null, tint = statusTint(ticket.status.name), modifier = Modifier.size(20.dp))
            }
            Spacer(Modifier.width(10.dp))
            Column(Modifier.weight(1f)) {
                Text(ticket.ticketNo + " · " + ticket.type.name.lowercase().replaceFirstChar { it.uppercase() }, style = MaterialTheme.typography.labelSmall,
                    color = Muted, fontWeight = FontWeight.Medium)
                Spacer(Modifier.height(3.dp))
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
        if (ticket.assignedToName != null || ticket.status !in listOf(TicketStatus.RESOLVED, TicketStatus.CLOSED)) {
            Spacer(Modifier.height(6.dp))
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(5.dp)) {
                Icon(Icons.Outlined.Person, contentDescription = null, modifier = Modifier.size(14.dp), tint = Muted)
                Text(ticket.assignedToName?.let { "Assigned to $it" } ?: "Unassigned", style = MaterialTheme.typography.bodySmall, color = Muted, modifier = Modifier.weight(1f), maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
        }
        Spacer(Modifier.height(10.dp))
        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Pill(ticket.status.name.replace('_', ' ').lowercase().replaceFirstChar { it.uppercase() }, statusTint(ticket.status.name))
            if (ticket.source == "PARENT_QR") Pill("PARENT QUERY", Indigo)
            if (ticket.priority == TicketPriority.URGENT || ticket.priority == TicketPriority.HIGH)
                Pill(ticket.priority.name, priorityTint(ticket.priority.name))
            if (ticket.responseSlaState == "OVERDUE" || ticket.resolutionSlaState == "OVERDUE")
                Pill("SLA OVERDUE", Color(0xFFD05F50))
            ticket.labels.take(2).forEach { Pill(it.uppercase(), Color(0xFF6B7280)) }
        }
      }
    }
}

@Composable
internal fun CreateTicket(api: SupportRepository, school: String, busy: Boolean,
    draft: TicketDraft, onDraftChange: (TicketDraft) -> Unit,
    submit: (String, String, TicketType, TicketPriority, String?, PendingAttachment?) -> Unit) {
    val scope = rememberCoroutineScope()
    var search by remember { mutableStateOf("") }
    var options by remember { mutableStateOf<List<StudentOption>>(emptyList()) }
    var classes by remember { mutableStateOf<List<StudentClassOption>>(emptyList()) }
    var sections by remember { mutableStateOf<List<StudentSectionOption>>(emptyList()) }
    var selectedClassId by remember { mutableStateOf("") }
    var selectedSectionId by remember { mutableStateOf("") }
    var selectedGender by remember { mutableStateOf("") }
    var selectedRte by remember { mutableStateOf("") }
    var searchError by remember { mutableStateOf("") }
    fun findStudents(
        classFilter: String = selectedClassId,
        sectionFilter: String = selectedSectionId,
        genderFilter: String = selectedGender,
        rteFilter: String = selectedRte,
    ) {
        scope.launch {
            try {
                val result = api.searchStudents(
                    school, search, classFilter, sectionFilter, genderFilter, rteFilter,
                )
                options = result.students
                classes = result.classes
                sections = result.sections
                searchError = ""
            } catch (e: Exception) {
                searchError = e.message ?: "Search failed."
            }
        }
    }
    LaunchedEffect(draft.type) {
        if (draft.type == TicketType.STUDENT && classes.isEmpty()) {
            try {
                val result = api.searchStudents(school, "")
                classes = result.classes
                sections = result.sections
            } catch (_: Exception) {
                // The explicit search action will surface a connection error.
            }
        }
    }
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Spacer(Modifier.height(2.dp))
        SupportPageHeading("Tell us what happened", "Add the details your team needs to take action.", "NEW TICKET")
        SurfaceCard(Modifier.fillMaxWidth()) {
            Text("ISSUE DETAILS", style = MaterialTheme.typography.labelSmall, color = Indigo,
                fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(12.dp))
            SupportField(draft.subject, { onDraftChange(draft.copy(subject = it)) }, "Subject")
            Spacer(Modifier.height(12.dp))
            SupportField(draft.description, { onDraftChange(draft.copy(description = it)) }, "Describe the issue", minLines = 4)
            Spacer(Modifier.height(16.dp))
            Text("Category", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(7.dp))
            OptionMenu(draft.type.name.replace('_', ' '), TicketType.entries.map { it.name }, title = "Ticket category") {
                val nextType = TicketType.valueOf(it)
                onDraftChange(draft.copy(type = nextType, selectedStudent = if (nextType == TicketType.STUDENT) draft.selectedStudent else null))
                if (nextType != TicketType.STUDENT) {
                    options = emptyList()
                    searchError = ""
                }
            }
            Spacer(Modifier.height(14.dp))
            Text("Priority", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(7.dp))
            OptionMenu(draft.priority.name, TicketPriority.entries.map { it.name }, title = "Ticket priority") {
                onDraftChange(draft.copy(priority = TicketPriority.valueOf(it)))
            }
        }
        if (draft.type == TicketType.STUDENT) {
            SurfaceCard(Modifier.fillMaxWidth()) {
                SectionTitle("Link a student", "Search by name, admission number, or phone")
                Spacer(Modifier.height(12.dp))
                SupportField(search, { search = it; onDraftChange(draft.copy(selectedStudent = null)) }, "Name, admission number, or phone")
                val visibleSections = sections.filter {
                    selectedClassId.isBlank() || it.classId == selectedClassId
                }
                Spacer(Modifier.height(10.dp))
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    SupportStudentFilterDropdown(
                        label = "Class",
                        options = listOf("" to "All classes") + classes.map { it.id to it.name },
                        selected = selectedClassId,
                        modifier = Modifier.weight(1f),
                    ) { value ->
                        selectedClassId = value
                        selectedSectionId = ""
                        onDraftChange(draft.copy(selectedStudent = null))
                        findStudents(classFilter = value, sectionFilter = "")
                    }
                    SupportStudentFilterDropdown(
                        label = "Section",
                        options = listOf("" to "All sections") + visibleSections.map { it.id to it.name },
                        selected = selectedSectionId,
                        modifier = Modifier.weight(1f),
                    ) { value ->
                        selectedSectionId = value
                        onDraftChange(draft.copy(selectedStudent = null))
                        findStudents(sectionFilter = value)
                    }
                }
                Spacer(Modifier.height(10.dp))
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    SupportStudentFilterDropdown(
                        label = "Gender",
                        options = listOf("" to "All genders", "MALE" to "Male", "FEMALE" to "Female", "OTHER" to "Other"),
                        selected = selectedGender,
                        modifier = Modifier.weight(1f),
                    ) { value ->
                        selectedGender = value
                        onDraftChange(draft.copy(selectedStudent = null))
                        findStudents(genderFilter = value)
                    }
                    SupportStudentFilterDropdown(
                        label = "RTE status",
                        options = listOf("" to "All students", "true" to "RTE", "false" to "Non-RTE"),
                        selected = selectedRte,
                        modifier = Modifier.weight(1f),
                    ) { value ->
                        selectedRte = value
                        onDraftChange(draft.copy(selectedStudent = null))
                        findStudents(rteFilter = value)
                    }
                }
                Spacer(Modifier.height(8.dp))
                OutlinedButton(onClick = { findStudents() },
                    enabled = search.trim().length >= 2 || selectedClassId.isNotBlank() ||
                        selectedSectionId.isNotBlank() || selectedGender.isNotBlank() || selectedRte.isNotBlank(),
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(13.dp)) {
                    Icon(Icons.Outlined.Search, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("Find student")
                }
                if (searchError.isNotBlank()) Text(searchError, color = MaterialTheme.colorScheme.error)
                options.forEach { option ->
                    Row(Modifier.fillMaxWidth().clickable { onDraftChange(draft.copy(selectedStudent = option)); options = emptyList() }
                        .padding(vertical = 11.dp), verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(option.fullName, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
                            Text(
                                buildList {
                                    add(option.admissionNo)
                                    option.academicYearName?.let(::add)
                                    option.syllabusName?.let(::add)
                                    option.branchName?.let(::add)
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
                draft.selectedStudent?.let {
                    Spacer(Modifier.height(8.dp))
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Pill(it.fullName + " · " + it.admissionNo, Indigo)
                        Text(
                            listOfNotNull(
                                it.academicYearName,
                                it.syllabusName,
                                it.branchName,
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
        SurfaceCard(Modifier.fillMaxWidth()) {
            SectionTitle("Attachment", "Add one screenshot, image, or PDF up to 5 MB.")
            Spacer(Modifier.height(12.dp))
            draft.attachment?.let { selectedAttachment ->
                Text(selectedAttachment.name, color = Ink, fontWeight = FontWeight.SemiBold)
                Text(attachmentSize(selectedAttachment.bytes.size), color = Muted,
                    style = MaterialTheme.typography.bodySmall)
                TextButton(onClick = { onDraftChange(draft.copy(attachment = null)) }, enabled = !busy) { Text("Remove") }
            }
            if (draft.attachment == null) {
                AttachmentPicker(enabled = !busy) { onDraftChange(draft.copy(attachment = it)) }
            }
        }
        val missingField = when {
            draft.subject.trim().length < 3 -> "Enter a subject with at least 3 characters."
            draft.description.trim().length < 10 -> "Describe the issue in at least 10 characters."
            draft.type == TicketType.STUDENT && draft.selectedStudent == null -> "Find and select a student to continue."
            else -> null
        }
        if (missingField != null) Text(missingField, color = Muted,
            style = MaterialTheme.typography.bodySmall)
        PrimaryAction("Create ticket", !busy && missingField == null,
            onClick = { submit(draft.subject.trim(), draft.description.trim(), draft.type, draft.priority,
                draft.selectedStudent?.id?.takeIf { draft.type == TicketType.STUDENT }, draft.attachment) })
        Text("Your ticket will be visible to the support team at " + school + ".",
            style = MaterialTheme.typography.bodySmall, color = Muted)
        Spacer(Modifier.height(20.dp))
    }
}

@Composable
private fun SupportStudentFilterDropdown(
    label: String,
    options: List<Pair<String, String>>,
    selected: String,
    modifier: Modifier = Modifier,
    onSelect: (String) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }
    val selectedLabel = options.firstOrNull { it.first == selected }?.second ?: options.first().second
    Column(modifier) {
        Text(label, style = MaterialTheme.typography.labelSmall, color = Muted,
            fontWeight = FontWeight.SemiBold)
        Spacer(Modifier.height(5.dp))
        Box {
            OutlinedButton(
                onClick = { expanded = true },
                modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp),
                colors = ButtonDefaults.outlinedButtonColors(containerColor = Color.White),
                shape = RoundedCornerShape(14.dp),
                border = BorderStroke(1.dp, Line),
                contentPadding = PaddingValues(horizontal = 12.dp),
            ) {
                Text(selectedLabel, modifier = Modifier.weight(1f), color = Ink,
                    maxLines = 1, overflow = TextOverflow.Ellipsis, textAlign = TextAlign.Start)
                Icon(Icons.Outlined.KeyboardArrowDown, contentDescription = null,
                    tint = Muted, modifier = Modifier.size(18.dp))
            }
            DropdownMenu(
                expanded = expanded,
                onDismissRequest = { expanded = false },
                containerColor = Color.White,
            ) {
                options.forEach { (value, optionLabel) ->
                    DropdownMenuItem(
                        text = { Text(optionLabel) },
                        onClick = {
                            expanded = false
                            onSelect(value)
                        },
                        trailingIcon = {
                            if (selected == value) RadioButton(selected = true, onClick = null)
                        },
                    )
                }
            }
        }
    }
}

@Composable
internal fun TicketDetails(ticket: TicketDetail, admin: Boolean, busy: Boolean, staff: List<StaffOption>,
    duplicateCandidates: List<TicketSummary>,
    reply: String, onReplyChange: (String) -> Unit,
    onReply: (String, Boolean) -> Unit, onStatus: (TicketStatus) -> Unit,
    onPriority: (TicketPriority) -> Unit, onAssign: (String?) -> Unit,
    onLabels: (List<String>) -> Unit, onDuplicate: (String?) -> Unit,
    onRetryDelivery: () -> Unit,
    onOpenAttachment: (TicketAttachment) -> Unit,
    onAddAttachment: (PendingAttachment) -> Unit) {
    val context = LocalContext.current
    var replyVisibility by remember(ticket.id, admin) { mutableStateOf(if (admin) "INTERNAL_ONLY" else "SHOW_TO_PARENT") }
    var pendingStatus by remember(ticket.id) { mutableStateOf<TicketStatus?>(null) }
    var labelsText by remember(ticket.id, ticket.labels) { mutableStateOf(ticket.labels.joinToString(", ")) }
    var detailTab by remember(ticket.id) { mutableStateOf("Conversation") }
    var templatesOpen by remember(ticket.id) { mutableStateOf(false) }
    var assignmentOpen by remember(ticket.id) { mutableStateOf(false) }
    var followUpError by remember(ticket.id) { mutableStateOf(false) }
    var assignmentCandidate by remember(ticket.id) { mutableStateOf<StaffOption?>(null) }
    val rankedStaff = remember(ticket.type, staff) { rankStaff(ticket.type, staff) }
    val guided = guidedAction(ticketStatusOrDefault(ticket.status), ticket.assignedToName != null)
    val conversationScroll = rememberScrollState()
    val detailsScroll = rememberScrollState()
    val activityScroll = rememberScrollState()
    var lastSeenMessageCount by remember(ticket.id) { mutableStateOf(-1) }
    var lastConversationHeight by remember(ticket.id) { mutableStateOf(0) }
    LaunchedEffect(ticket.id, detailTab, ticket.messages.size, conversationScroll.maxValue) {
        if (detailTab == "Conversation" && conversationScroll.maxValue != Int.MAX_VALUE) {
            val newMessages = ticket.messages.size > lastSeenMessageCount
            val lastIsMine = ticket.messages.lastOrNull()?.let { it.authorId.isNotBlank() && it.authorId == ticket.currentUserId } == true
            val nearBottom = conversationScroll.value >= (lastConversationHeight - 120).coerceAtLeast(0)
            if (lastSeenMessageCount < 0 || (newMessages && (nearBottom || lastIsMine))) {
                conversationScroll.scrollTo(conversationScroll.maxValue)
            }
            lastSeenMessageCount = ticket.messages.size
            lastConversationHeight = conversationScroll.maxValue
        }
    }
    Column(Modifier.fillMaxSize().padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Spacer(Modifier.height(2.dp))
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(ticket.ticketNo, style = MaterialTheme.typography.labelSmall, color = Indigo)
            Text(ticket.subject, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = Ink, maxLines = 2, overflow = TextOverflow.Ellipsis)
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Pill(ticket.status.replace('_', ' '), statusTint(ticket.status))
                Pill(ticket.priority, priorityTint(ticket.priority))
                if (ticket.source == "PARENT_QR") Pill("PARENT QUERY", Indigo)
            }
        }
        Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("Conversation", "Activity", "Details").forEach { tab ->
                FilterChip(selected = detailTab == tab, onClick = { detailTab = tab }, label = { Text(tab) })
            }
        }
        if (admin) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Next: " + guided.description, style = MaterialTheme.typography.bodySmall, color = Muted, modifier = Modifier.weight(1f))
                FilledTonalButton(onClick = {
                    if (guided.assign) assignmentOpen = true else pendingStatus = guided.nextStatus
                }, enabled = !busy, shape = RoundedCornerShape(12.dp)) { Text(guided.title) }
            }
        }
        val contentScroll = when (detailTab) {
            "Conversation" -> conversationScroll
            "Activity" -> activityScroll
            else -> detailsScroll
        }
        Column(Modifier.weight(1f).fillMaxWidth().verticalScroll(contentScroll), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        if (detailTab == "Conversation") {
             SurfaceCard(Modifier.fillMaxWidth()) {
                SectionTitle("Original request", ticket.type.replace('_', ' ').lowercase().replaceFirstChar { it.uppercase() })
                Spacer(Modifier.height(8.dp))
                Text(ticket.description, color = Ink, style = MaterialTheme.typography.bodyMedium)
            }
            if (ticket.messages.isEmpty()) SupportEmptyState("No replies yet", "Use the reply box to start the conversation.")
            ticket.messages.sortedBy { it.createdAt }.forEach { message ->
                val mine = message.authorId.isNotBlank() && message.authorId == ticket.currentUserId
                Row(Modifier.fillMaxWidth(), horizontalArrangement = if (mine) Arrangement.End else Arrangement.Start) {
                    Surface(
                        modifier = Modifier.fillMaxWidth(.86f),
                        shape = RoundedCornerShape(16.dp),
                        color = if (message.isInternal) Color(0xFFFFF4DB) else if (mine) Color(0xFFDCFCE7) else Color.White,
                        border = BorderStroke(1.dp, Line),
                    ) {
                        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text(if (mine) "You" else message.author, color = Indigo, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.labelMedium)
                            if (message.isInternal) Text("Internal note · staff only", color = Color(0xFF92400E), style = MaterialTheme.typography.labelSmall)
                            else if (ticket.source == "PARENT_QR") Text("Parent-visible", color = SchoolGreen, style = MaterialTheme.typography.labelSmall)
                            Text(message.body, color = Ink, style = MaterialTheme.typography.bodyMedium)
                            if (message.createdAt.isNotBlank()) Text(formatSupportTimestamp(message.createdAt), color = Muted, style = MaterialTheme.typography.bodySmall, modifier = Modifier.align(Alignment.End))
                        }
                    }
                }
            }
        } else if (detailTab == "Activity") {
            SectionTitle("Activity history", "Status, assignment and other recorded changes · newest first")
            if (ticket.activities.isEmpty()) SupportEmptyState("No activity recorded", "Changes will appear here.")
            ticket.activities.sortedByDescending { it.createdAt }.forEach { activity ->
                SurfaceCard(Modifier.fillMaxWidth()) {
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.Top) {
                        Box(Modifier.size(12.dp).background(Indigo, CircleShape))
                        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text(activity.action.replace('_', ' ').lowercase().replaceFirstChar { it.uppercase() }, color = Ink, fontWeight = FontWeight.Bold)
                            Text(activity.detail, color = Ink, style = MaterialTheme.typography.bodyMedium)
                            Text(activity.actor + " · " + formatSupportTimestamp(activity.createdAt), color = Muted, style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
            }
        } else {
        if (ticket.source == "PARENT_QR") SurfaceCard(Modifier.fillMaxWidth()) {
            SectionTitle("Submitted by parent", "Received from the school's QR form")
            ticket.parentName?.let { Text(it, color = Ink) }
            ticket.parentPhone?.let { Text("Follow-up phone: $it", color = Ink) }
            if (ticket.parentPhone == null) Text("No follow-up number was provided.", color = Muted)
            ticket.parentPhone?.let { phone ->
                Spacer(Modifier.height(12.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Button(
                        onClick = { context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:$phone"))) },
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Indigo),
                    ) {
                        Icon(Icons.Outlined.Phone, contentDescription = null, modifier = Modifier.size(17.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Call parent")
                    }
                    OutlinedButton(
                        onClick = {
                            val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                            clipboard.setPrimaryClip(ClipData.newPlainText("Parent phone", phone))
                        },
                        shape = RoundedCornerShape(12.dp),
                    ) {
                        Icon(Icons.Outlined.ContentCopy, contentDescription = null, modifier = Modifier.size(17.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Copy")
                    }
                }
            }
        }
        ticket.studentName?.let { student -> SurfaceCard(Modifier.fillMaxWidth()) {
            Text("LINKED STUDENT", style = MaterialTheme.typography.labelSmall, color = Muted,
                fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(6.dp))
            Text(
                student + listOfNotNull(
                    ticket.studentSyllabusName,
                    ticket.studentBranchName,
                    ticket.studentClassName,
                    ticket.studentSectionName,
                )
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
        SurfaceCard(Modifier.fillMaxWidth()) {
            SectionTitle("Service level", "Response and resolution commitments")
            Spacer(Modifier.height(10.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Pill("RESPONSE ${ticket.responseSlaState}", if (ticket.responseSlaState in listOf("OVERDUE", "BREACHED")) Color(0xFFD05F50) else SchoolGreen)
                Pill("RESOLUTION ${ticket.resolutionSlaState}", if (ticket.resolutionSlaState in listOf("OVERDUE", "BREACHED")) Color(0xFFD05F50) else SchoolGreen)
            }
            if (ticket.resolutionDueAt.isNotBlank()) {
                Spacer(Modifier.height(8.dp))
                Text("Resolution target · ${formatSupportTimestamp(ticket.resolutionDueAt)}", style = MaterialTheme.typography.bodySmall, color = Muted)
            }
        }
        ticket.parentDelivery?.let { delivery ->
            SurfaceCard(Modifier.fillMaxWidth()) {
                SectionTitle("Parent delivery", "Latest WhatsApp communication")
                Spacer(Modifier.height(10.dp))
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Pill(delivery.status, if (delivery.status == "FAILED") Color(0xFFD05F50) else SchoolGreen)
                    Spacer(Modifier.weight(1f))
                    if (delivery.status == "FAILED" && admin) {
                        TextButton(onClick = onRetryDelivery, enabled = !busy) { Text("Retry") }
                    }
                }
                delivery.error?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = Muted) }
            }
        }
        if (ticket.diagnostics != null) SurfaceCard(Modifier.fillMaxWidth()) {
            SectionTitle("App diagnostics", "Captured automatically when this ticket was created")
            Spacer(Modifier.height(10.dp))
            val diagnostics = ticket.diagnostics
            listOfNotNull(
                diagnostics.appVersion?.let { "App version" to "$it (${diagnostics.appBuild ?: "—"})" },
                diagnostics.deviceModel?.let { "Device" to listOfNotNull(diagnostics.manufacturer, it).joinToString(" ") },
                diagnostics.androidVersion?.let { "Android" to it },
            ).forEach { (label, value) ->
                Row(Modifier.fillMaxWidth().padding(vertical = 3.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text(label, color = Muted, style = MaterialTheme.typography.bodySmall)
                    Text(value, color = Ink, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Medium)
                }
            }
        }
        SurfaceCard(Modifier.fillMaxWidth()) {
            SectionTitle("Attachments", "Screenshots, images, and supporting documents")
            Spacer(Modifier.height(10.dp))
            if (ticket.attachments.isEmpty()) {
                Text("No attachments yet.", color = Muted, style = MaterialTheme.typography.bodySmall)
            }
            ticket.attachments.forEach { attachment ->
                Row(
                    Modifier.fillMaxWidth().clickable(enabled = !busy) { onOpenAttachment(attachment) }
                        .padding(vertical = 9.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(Icons.Outlined.AttachFile, contentDescription = null, tint = Indigo)
                    Spacer(Modifier.width(10.dp))
                    Column(Modifier.weight(1f)) {
                        Text(attachment.name, color = Ink, fontWeight = FontWeight.SemiBold,
                            maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text(attachmentSize(attachment.sizeBytes), color = Muted,
                            style = MaterialTheme.typography.bodySmall)
                    }
                    Icon(Icons.Outlined.ChevronRight, contentDescription = "Open attachment", tint = Muted)
                }
            }
            if (ticket.status != "CLOSED") {
                Spacer(Modifier.height(8.dp))
                AttachmentPicker(enabled = !busy, label = "Add attachment", onAttachment = onAddAttachment)
            }
        }
        if (ticket.status !in listOf("RESOLVED", "CLOSED")) SurfaceCard(Modifier.fillMaxWidth()) {
            SectionTitle("Follow-up", "Add a private calendar reminder on this device.")
            TextButton(onClick = {
                val start = System.currentTimeMillis() + 24 * 60 * 60 * 1000L
                val intent = Intent(Intent.ACTION_INSERT, android.provider.CalendarContract.Events.CONTENT_URI).apply {
                    putExtra(android.provider.CalendarContract.Events.TITLE, "SchoolDB support follow-up")
                    putExtra(android.provider.CalendarContract.EXTRA_EVENT_BEGIN_TIME, start)
                    putExtra(android.provider.CalendarContract.EXTRA_EVENT_END_TIME, start + 15 * 60 * 1000L)
                }
                try { context.startActivity(intent); followUpError = false }
                catch (_: android.content.ActivityNotFoundException) { followUpError = true }
            }, enabled = !busy) { Text("Add to calendar") }
            if (followUpError) Text("No calendar app is available.", color = MaterialTheme.colorScheme.error)
        }
        if (admin) SurfaceCard(Modifier.fillMaxWidth()) {
            SectionTitle("Manage ticket", "Keep ownership and progress clear")
            Spacer(Modifier.height(16.dp))
            Text("STATUS", style = MaterialTheme.typography.labelSmall, color = Muted, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(6.dp))
            OptionMenu(
                ticket.status.replace('_', ' '),
                listOf(ticket.status) + validNextStatuses(ticketStatusOrDefault(ticket.status)).map { it.name },
            ) { selected ->
                val next = TicketStatus.valueOf(selected)
                if (next.name != ticket.status) pendingStatus = next
            }
            Spacer(Modifier.height(12.dp))
            Text("PRIORITY", style = MaterialTheme.typography.labelSmall, color = Muted, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(6.dp))
            OptionMenu(ticket.priority, TicketPriority.entries.map { it.name }) { onPriority(TicketPriority.valueOf(it)) }
            Spacer(Modifier.height(12.dp))
            Text("ASSIGNED TO", style = MaterialTheme.typography.labelSmall, color = Muted, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(6.dp))
            if (rankedStaff.isNotEmpty()) {
                val suggested = rankedStaff.first()
                Text("Suggested: " + suggested.name + (suggested.activeTickets?.let { " · $it active" } ?: ""), color = Indigo, style = MaterialTheme.typography.bodySmall)
                TextButton(onClick = { assignmentCandidate = suggested }, enabled = !busy) { Text("Review suggestion") }
            }
            var staffMenu by remember { mutableStateOf(false) }
            Box {
                OutlinedButton(onClick = { staffMenu = true }, enabled = !busy,
                    modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(13.dp)) {
                    Text(ticket.assignedToName ?: "Unassigned", modifier = Modifier.weight(1f), color = Ink)
                    Icon(Icons.Outlined.ChevronRight, contentDescription = null, tint = Muted)
                }
                DropdownMenu(expanded = staffMenu, onDismissRequest = { staffMenu = false }) {
                    DropdownMenuItem(text = { Text("Unassigned") }, onClick = { staffMenu = false; onAssign(null) })
                    rankedStaff.forEach { person ->
                        DropdownMenuItem(text = { Text(person.name + " · " + person.role + (person.activeTickets?.let { " · $it active" } ?: "")) },
                            onClick = { staffMenu = false; assignmentCandidate = person })
                    }
                }
            }
            Spacer(Modifier.height(14.dp))
            Text("LABELS", style = MaterialTheme.typography.labelSmall, color = Muted, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(6.dp))
            SupportField(labelsText, { labelsText = it }, "billing, app, follow-up")
            Spacer(Modifier.height(6.dp))
            OutlinedButton(
                onClick = {
                    onLabels(labelsText.split(',').map(String::trim).filter(String::isNotBlank).distinct().take(8))
                },
                enabled = !busy,
                modifier = Modifier.fillMaxWidth(),
            ) { Text("Save labels") }
            Spacer(Modifier.height(14.dp))
            Text("DUPLICATE OF", style = MaterialTheme.typography.labelSmall, color = Muted, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(6.dp))
            InboxFilterDropdown(
                label = "Original ticket",
                value = ticket.duplicateOfId ?: "NONE",
                options = listOf("NONE" to "Not a duplicate") + duplicateCandidates
                    .filter { it.id != ticket.id }
                    .map { it.id to "${it.ticketNo} · ${it.subject}" },
                enabled = !busy,
                modifier = Modifier.fillMaxWidth(),
            ) { onDuplicate(it.takeUnless { value -> value == "NONE" }) }
        }
        }
        Spacer(Modifier.height(10.dp))
        }
        if (detailTab == "Conversation" && ticket.status != "CLOSED") {
            Surface(color = MaterialTheme.colorScheme.surface, shape = RoundedCornerShape(16.dp),
                border = BorderStroke(1.dp, Line)) {
                Column(Modifier.fillMaxWidth().padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    if (ticket.source == "PARENT_QR" && admin) {
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            FilterChip(selected = replyVisibility == "INTERNAL_ONLY", onClick = { replyVisibility = "INTERNAL_ONLY" },
                                label = { Text("Staff only") }, enabled = !busy)
                            FilterChip(selected = replyVisibility == "SHOW_TO_PARENT", onClick = { replyVisibility = "SHOW_TO_PARENT" },
                                label = { Text("Send to parent") }, enabled = !busy)
                        }
                        Text(if (replyVisibility == "INTERNAL_ONLY") "Private note — not sent to parent." else "Parent will receive this reply.",
                            color = if (replyVisibility == "INTERNAL_ONLY") Color(0xFF92400E) else SchoolGreen,
                            style = MaterialTheme.typography.bodySmall)
                    }
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        OutlinedTextField(reply, onReplyChange, modifier = Modifier.weight(1f), enabled = !busy,
                            placeholder = { Text(if (replyVisibility == "INTERNAL_ONLY" && admin && ticket.source == "PARENT_QR") "Write a note" else "Write a reply") },
                            minLines = 1, maxLines = 3, shape = RoundedCornerShape(14.dp))
                        FilledIconButton(onClick = {
                            onReply(reply.trim(), ticket.source == "PARENT_QR" && admin && replyVisibility == "INTERNAL_ONLY")
                        }, enabled = !busy && reply.isNotBlank()) {
                            Icon(Icons.AutoMirrored.Outlined.Send, contentDescription = "Send message")
                        }
                    }
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        TextButton(onClick = { templatesOpen = true }, enabled = !busy) { Text("Quick replies") }
                        TextButton(onClick = { detailTab = "Details" }, enabled = !busy) { Text("Attachments & actions") }
                    }
                }
            }
        } else if (detailTab == "Conversation") {
            Text("This ticket is closed.", color = Muted, style = MaterialTheme.typography.bodySmall)
        }
        Spacer(Modifier.height(4.dp))
    }
    if (assignmentOpen) {
        AlertDialog(onDismissRequest = { assignmentOpen = false }, title = { Text("Choose ticket owner") }, text = {
            Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text("Suggestions use role and active ticket workload. Review before assigning.", color = Muted, style = MaterialTheme.typography.bodySmall)
                if (rankedStaff.isEmpty()) Text("Staff options are not available. Return to the inbox and refresh.")
                rankedStaff.forEach { person ->
                    OutlinedButton(onClick = { assignmentOpen = false; assignmentCandidate = person }, modifier = Modifier.fillMaxWidth()) {
                        Text(person.name + (person.activeTickets?.let { " · $it active" } ?: ""))
                    }
                }
            }
        }, confirmButton = { TextButton(onClick = { assignmentOpen = false }) { Text("Cancel") } })
    }
    assignmentCandidate?.let { person ->
        AlertDialog(onDismissRequest = { assignmentCandidate = null }, title = { Text("Assign ticket?") },
            text = { Text("Assign " + ticket.ticketNo + " to " + person.name + "?") },
            confirmButton = { Button(onClick = { assignmentCandidate = null; onAssign(person.id) }, enabled = !busy) { Text("Assign") } },
            dismissButton = { TextButton(onClick = { assignmentCandidate = null }) { Text("Cancel") } })
    }
    if (templatesOpen) {
        AlertDialog(
            onDismissRequest = { templatesOpen = false },
            title = { Text("Quick replies") },
            text = {
                Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf(
                        "Acknowledgement" to "Thank you for bringing this to our attention. We will review your request.",
                        "Investigating" to "We are looking into this issue and will share an update when available.",
                        "More information" to "Could you please share a few more details so we can look into this?",
                        "Follow-up" to "We are following up on your request and will keep you informed.",
                        "Resolution check" to "Please confirm whether the issue has been resolved.",
                    ).forEach { (label, message) ->
                        OutlinedButton(onClick = {
                            onReplyChange(if (reply.isBlank()) message else reply.trimEnd() + "\n\n" + message)
                            templatesOpen = false
                        }, modifier = Modifier.fillMaxWidth()) { Text(label) }
                    }
                }
            },
            confirmButton = { TextButton(onClick = { templatesOpen = false }) { Text("Cancel") } },
        )
    }
    pendingStatus?.let { nextStatus ->
        AlertDialog(
            onDismissRequest = { pendingStatus = null },
            title = { Text(if (nextStatus == TicketStatus.CLOSED) "Close this ticket?" else "Change ticket status?") },
            text = { Text("Change ${ticket.ticketNo} from ${ticket.status.replace('_', ' ')} to ${nextStatus.name.replace('_', ' ')}?") },
            confirmButton = {
                Button(onClick = { pendingStatus = null; onStatus(nextStatus) }) {
                    Text(if (nextStatus == TicketStatus.CLOSED) "Close ticket" else "Change status")
                }
            },
            dismissButton = { TextButton(onClick = { pendingStatus = null }) { Text("Cancel") } },
        )
    }
}

@Composable
internal fun AdminAccountsScreen(result: AdminAccounts, busy: Boolean,
    onCreate: () -> Unit, onEdit: (AdminAccount) -> Unit, onRefresh: () -> Unit) {
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Spacer(Modifier.height(2.dp))
        SupportPageHeading("School administrators", "Manage who can lead and respond to school issues.", "PEOPLE & ACCESS")
        PrimaryAction("Add administrator", !busy, onClick = onCreate)
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
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Pill(displayAccountRole(account.role, account.designation), Indigo)
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
internal fun AdminAccountForm(account: AdminAccount?, busy: Boolean,
    onSave: (String, String, String, String?, Boolean) -> Unit) {
    var fullName by remember(account?.id) { mutableStateOf(account?.fullName.orEmpty()) }
    var phone by remember(account?.id) { mutableStateOf(account?.phone?.filter(Char::isDigit)?.takeLast(10).orEmpty()) }
    var position by remember(account?.id) {
        mutableStateOf(
            when {
                account?.role == "SUPER_ADMIN" -> "SUPER_ADMIN"
                account?.designation == "Principal" -> "PRINCIPAL"
                account?.designation == "Vice Principal" -> "VICE_PRINCIPAL"
                else -> "SCHOOL_ADMIN"
            },
        )
    }
    var active by remember(account?.id) { mutableStateOf(account?.isActive ?: true) }
    var confirmDisable by remember(account?.id) { mutableStateOf(false) }
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Spacer(Modifier.height(2.dp))
        SupportPageHeading(if (account == null) "Create administrator" else "Update administrator",
            "This account signs in with a WhatsApp code sent to its mobile number.")
        SurfaceCard(Modifier.fillMaxWidth()) {
            Text("ACCOUNT DETAILS", style = MaterialTheme.typography.labelSmall,
                color = Indigo, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(14.dp))
            SupportField(fullName, { fullName = it }, "Full name")
            Spacer(Modifier.height(12.dp))
            SupportField(phone, { phone = it.filter(Char::isDigit).take(10) }, "10-digit mobile number", keyboardType = KeyboardType.Phone)
            Spacer(Modifier.height(16.dp))
            Text("Access role", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(7.dp))
            OptionMenu(position, listOf("SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL", "VICE_PRINCIPAL")) { position = it }
            Spacer(Modifier.height(8.dp))
            Text(if (position == "SUPER_ADMIN") "Full school access, including administrator management."
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
                    Switch(checked = active, onCheckedChange = { next ->
                        if (!next) confirmDisable = true else active = true
                    })
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
            val role = if (position == "SUPER_ADMIN") "SUPER_ADMIN" else "SCHOOL_ADMIN"
            val designation = when (position) {
                "PRINCIPAL" -> "Principal"
                "VICE_PRINCIPAL" -> "Vice Principal"
                "SCHOOL_ADMIN" -> "School Administrator"
                else -> null
            }
            onSave(fullName.trim(), phone, role, designation, active)
        }
        Spacer(Modifier.height(20.dp))
    }
    if (confirmDisable) {
        AlertDialog(
            onDismissRequest = { confirmDisable = false },
            title = { Text("Disable this administrator?") },
            text = { Text("They will no longer be able to sign in until a Super Admin restores access.") },
            confirmButton = {
                Button(
                    onClick = { active = false; confirmDisable = false },
                    colors = ButtonDefaults.buttonColors(containerColor = SchoolRed),
                ) { Text("Disable access") }
            },
            dismissButton = { TextButton(onClick = { confirmDisable = false }) { Text("Cancel") } },
        )
    }
}

@Composable
@OptIn(ExperimentalMaterial3Api::class)
private fun OptionMenu(selected: String, values: List<String>, title: String = "Choose an option", choose: (String) -> Unit) {
    var open by remember { mutableStateOf(false) }
    fun label(value: String) = value.replace('_', ' ').lowercase().split(' ').joinToString(" ") { it.replaceFirstChar(Char::titlecase) }
    Box(Modifier.fillMaxWidth()) {
        OutlinedButton(onClick = { open = true }, modifier = Modifier.fillMaxWidth().heightIn(min = 52.dp),
            colors = ButtonDefaults.outlinedButtonColors(containerColor = Color.White),
            shape = RoundedCornerShape(16.dp), border = BorderStroke(1.dp, Line)) {
            Text(label(selected), modifier = Modifier.weight(1f), color = Ink, fontWeight = FontWeight.SemiBold, textAlign = TextAlign.Start)
            Icon(Icons.Outlined.ChevronRight, contentDescription = null, tint = Muted)
        }
        if (open) ModalBottomSheet(onDismissRequest = { open = false }, containerColor = Color.White) {
            Text(title, Modifier.padding(horizontal = 24.dp, vertical = 8.dp),
                style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, color = Ink)
            LazyColumn(Modifier.fillMaxWidth().heightIn(max = 480.dp),
                contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(values, key = { it }) { value ->
                    val active = label(value) == label(selected)
                    Surface(onClick = { open = false; choose(value) }, shape = RoundedCornerShape(16.dp),
                        color = if (active) Indigo.copy(alpha = .08f) else Canvas,
                        border = BorderStroke(1.dp, if (active) Indigo.copy(alpha = .4f) else Line)) {
                        Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                            Text(label(value), Modifier.weight(1f), color = if (active) Indigo else Ink, fontWeight = FontWeight.SemiBold)
                            RadioButton(selected = active, onClick = null)
                        }
                    }
                }
            }
        }
    }
}

@Composable
internal fun AuthShell(title: String, subtitle: String, content: @Composable ColumnScope.() -> Unit) {
    Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(
        Color(0xFFF8FAFF), Color(0xFFF3F5FF), Color(0xFFF8FAFC),
    ))).imePadding()) {
        Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally) {
            Spacer(Modifier.height(24.dp))
            Row(Modifier.fillMaxWidth().padding(horizontal = 24.dp),
                verticalAlignment = Alignment.CenterVertically) {
                BrandMark(Modifier.size(54.dp))
                Spacer(Modifier.width(12.dp))
                Column {
                    Text("SchoolDB", style = MaterialTheme.typography.titleLarge,
                        color = Ink, fontWeight = FontWeight.ExtraBold)
                    Text("SMARTER SCHOOLS · BRIGHTER FUTURES",
                        style = MaterialTheme.typography.labelSmall, color = Muted)
                }
            }
            Spacer(Modifier.height(30.dp))
            Column(Modifier.fillMaxWidth().padding(horizontal = 24.dp)) {
                Surface(shape = CircleShape, color = Color(0xFFECFDF5),
                    border = BorderStroke(1.dp, Color(0xFFA7F3D0))) {
                    Row(Modifier.padding(horizontal = 12.dp, vertical = 7.dp),
                        verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Outlined.VerifiedUser, contentDescription = null,
                            tint = Color(0xFF059669), modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(7.dp))
                        Text("VERIFIED SUPPORT ACCESS", color = Color(0xFF047857),
                            style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                    }
                }
                Spacer(Modifier.height(14.dp))
                Text(title, style = MaterialTheme.typography.headlineLarge, color = Ink,
                    fontWeight = FontWeight.ExtraBold)
                Spacer(Modifier.height(8.dp))
                Text(subtitle, style = MaterialTheme.typography.bodyLarge, color = Muted)
            }
            Spacer(Modifier.height(18.dp))
            Card(Modifier.fillMaxWidth().padding(horizontal = 20.dp),
                shape = RoundedCornerShape(20.dp), border = BorderStroke(1.dp, Line),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)) {
                Column(Modifier.padding(horizontal = 22.dp, vertical = 24.dp)) {
                    Text("SECURE ACCESS", color = Indigo, style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(16.dp))
                    content()
                }
            }
            Spacer(Modifier.height(22.dp))
            Text("Encrypted access • Private school data • Secure sessions",
                style = MaterialTheme.typography.bodySmall, color = Muted, textAlign = TextAlign.Center,
                modifier = Modifier.padding(horizontal = 24.dp))
            Spacer(Modifier.height(28.dp))
        }
    }
}

@Composable
internal fun SupportField(value: String, onValueChange: (String) -> Unit, label: String, minLines: Int = 1,
    keyboardType: KeyboardType = KeyboardType.Text, enabled: Boolean = true) {
    OutlinedTextField(value = value, onValueChange = onValueChange, label = { Text(label) },
        enabled = enabled,
        keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
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
internal fun PrimaryAction(
    label: String,
    enabled: Boolean,
    loading: Boolean = false,
    onClick: () -> Unit,
) {
    Button(
        onClick = onClick,
        enabled = enabled && !loading,
        modifier = Modifier.fillMaxWidth().heightIn(min = 56.dp),
        shape = RoundedCornerShape(18.dp),
        colors = if (loading) {
            ButtonDefaults.buttonColors(
                containerColor = Indigo,
                disabledContainerColor = Indigo,
                disabledContentColor = Color.White,
            )
        } else {
            ButtonDefaults.buttonColors(containerColor = Indigo)
        },
        elevation = ButtonDefaults.buttonElevation(defaultElevation = 4.dp, pressedElevation = 1.dp),
    ) {
        if (loading) {
            CircularProgressIndicator(
                modifier = Modifier.size(20.dp),
                color = Color.White,
                strokeWidth = 2.dp,
            )
        } else {
            Text(label, fontWeight = FontWeight.SemiBold)
        }
    }
}
