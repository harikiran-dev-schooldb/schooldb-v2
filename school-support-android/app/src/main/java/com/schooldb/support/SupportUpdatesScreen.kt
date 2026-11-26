package com.schooldb.support

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.schooldb.support.tickets.SupportUpdates

@Composable
internal fun SupportUpdatesScreen(updates: SupportUpdates?, loading: Boolean, error: String?, onRefresh: () -> Unit, onOpen: (String) -> Unit) {
    var unreadOnly by remember { mutableStateOf(false) }
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.weight(1f)) {
                    SupportPageHeading("Ticket updates", "Unread changes and recent ticket activity.", "INBOX")
                }
                IconButton(onClick = onRefresh, enabled = !loading) {
                    Icon(Icons.Outlined.Refresh, contentDescription = "Refresh updates")
                }
            }
        }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterChip(selected = !unreadOnly, onClick = { unreadOnly = false }, label = { Text("Recent") })
                FilterChip(selected = unreadOnly, onClick = { unreadOnly = true }, label = { Text("Unread" + (updates?.let { " (" + it.unreadCount + ")" } ?: "")) })
            }
            if (loading) LinearProgressIndicator(Modifier.fillMaxWidth())
            if (error != null) {
                Text(error, color = MaterialTheme.colorScheme.error)
                TextButton(onClick = onRefresh, enabled = !loading) { Text("Retry") }
            }
        }
        val visible = updates?.items.orEmpty().filter { !unreadOnly || it.unread }
        if (visible.isEmpty() && !loading && error == null && updates != null) {
            item { SupportEmptyState(if (unreadOnly) "You're all caught up" else "No updates yet", "New and changed tickets appear here.", Icons.Outlined.Notifications) }
        }
        items(visible, key = { it.id }) { item ->
            Surface(onClick = { onOpen(item.id) }, shape = MaterialTheme.shapes.medium,
                color = if (item.unread) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surface) {
                Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                        Text(item.ticketNo, color = Indigo, style = MaterialTheme.typography.labelMedium, modifier = Modifier.weight(1f))
                        if (item.unread) Pill("Unread", Indigo)
                    }
                    Text(item.subject, color = Ink, fontWeight = FontWeight.Bold)
                    Text(item.status.replace('_', ' '), color = Muted, style = MaterialTheme.typography.bodySmall)
                    if (item.updatedAt.isNotBlank()) Text(formatSupportTimestamp(item.updatedAt), color = Muted, style = MaterialTheme.typography.bodySmall)
                }
            }
        }
        if (updates != null) item { Text("Showing up to 50 recent tickets, unread first. Open a ticket to mark its updates as read.", color = Muted, style = MaterialTheme.typography.bodySmall) }
    }
}
